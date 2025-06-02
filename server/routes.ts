import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertApplicationSchema, insertCaseSchema } from "@shared/schema";
import { analyzeCase, generateStrategyPack } from "./openai";
import { sendWelcomeEmail, sendApprovalEmail } from "./email";
import { generateStrategyPackPDF, generateAIStrategyPackPDF } from "./pdf";
import { checkSubscriptionStatus, consumeStrategyPack, grantStrategyPack } from "./subscription";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";

// Stripe is optional for development
const STRIPE_ENABLED = !!process.env.STRIPE_SECRET_KEY;

const stripe = STRIPE_ENABLED ? new Stripe(process.env.STRIPE_SECRET_KEY!) : null;

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Simple authentication routes for testing
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // For demo purposes, accept any email/password combination
      // In production, this would validate against a real user database
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      // Create or get user
      const userId = email; // Use email as user ID for demo
      let user = await storage.getUser(userId);
      
      if (!user) {
        user = await storage.upsertUser({
          id: userId,
          email: email,
          firstName: email.split('@')[0],
          lastName: 'User',
        });
      }

      // Set session
      (req as any).session.userId = userId;
      res.json({ user, message: "Login successful" });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      // Create new user
      const userId = email;
      const user = await storage.upsertUser({
        id: userId,
        email: email,
        firstName: email.split('@')[0],
        lastName: 'User',
      });

      // Set session
      (req as any).session.userId = userId;
      res.json({ user, message: "Account created successfully" });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  app.get('/api/auth/user', async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.put('/api/auth/profile', async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { firstName, lastName, email, phone } = req.body;
      const user = await storage.updateUserProfile(userId, {
        firstName,
        lastName,
        email,
        phone
      });
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    (req as any).session?.destroy();
    res.json({ message: "Logged out successfully" });
  });

  // Subscription status endpoint
  app.get('/api/subscription/status', async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const subscriptionStatus = await checkSubscriptionStatus(userId);
      res.json(subscriptionStatus);
    } catch (error) {
      console.error("Error checking subscription status:", error);
      res.status(500).json({ message: "Failed to check subscription status" });
    }
  });

  // Demo endpoint to grant strategy packs for testing
  app.post('/api/subscription/grant-demo-pack', async (req, res) => {
    try {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await grantStrategyPack(userId, 1);
      res.json({ message: "Demo strategy pack granted" });
    } catch (error) {
      console.error("Error granting demo pack:", error);
      res.status(500).json({ message: "Failed to grant demo pack" });
    }
  });

  // Application routes
  app.post("/api/applications", async (req, res) => {
    try {
      const applicationData = insertApplicationSchema.parse(req.body);
      const application = await storage.createApplication(applicationData);
      
      // Send welcome email
      await sendWelcomeEmail(application.email, application.fullName);
      
      // Auto-approve for demo (in production, this would be manual review)
      setTimeout(async () => {
        await storage.updateApplicationStatus(application.id, 'approved');
        await sendApprovalEmail(application.email, application.fullName, application.id);
      }, 1000);

      res.json(application);
    } catch (error: any) {
      console.error("Error creating application:", error);
      res.status(400).json({ message: "Failed to create application: " + error.message });
    }
  });

  app.get("/api/applications/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const application = await storage.getApplication(id);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      res.json(application);
    } catch (error) {
      console.error("Error fetching application:", error);
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  // Case routes
  app.get("/api/cases", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const cases = await storage.getUserCases(userId);
      res.json(cases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  app.get("/api/cases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const caseRecord = await storage.getCase(id);
      
      if (!caseRecord) {
        return res.status(404).json({ message: "Case not found" });
      }
      
      // Verify user owns this case
      const userId = req.user.claims.sub;
      if (caseRecord.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(caseRecord);
    } catch (error) {
      console.error("Error fetching case:", error);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  app.post("/api/cases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const caseData = insertCaseSchema.parse({
        ...req.body,
        userId,
        caseNumber: `TG-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      });
      
      const caseRecord = await storage.createCase(caseData);
      
      // Generate AI analysis and strategy pack
      const analysis = await analyzeCase(caseRecord);
      const strategyPack = await generateStrategyPack(caseRecord, analysis);
      
      // Update case with AI results
      const updatedCase = await storage.updateCase(caseRecord.id, {
        aiAnalysis: analysis,
        strategyPack: strategyPack,
      });
      
      // Generate PDF strategy pack
      await generateStrategyPackPDF(updatedCase);
      
      // Create initial timeline event
      await storage.createTimelineEvent({
        caseId: caseRecord.id,
        userId,
        eventType: 'case_created',
        title: 'Case Created',
        description: 'Case file opened and initial analysis completed',
        eventDate: new Date(),
        isCompleted: true,
      });
      
      res.json(updatedCase);
    } catch (error: any) {
      console.error("Error creating case:", error);
      res.status(400).json({ message: "Failed to create case: " + error.message });
    }
  });

  // Document routes
  app.post("/api/documents/upload", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const userId = req.user.claims.sub;
      const { caseId, contractId, category } = req.body;
      
      const document = await storage.createDocument({
        caseId: caseId ? parseInt(caseId) : null,
        contractId: contractId ? parseInt(contractId) : null,
        userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        uploadPath: req.file.path,
        category: category || 'evidence',
      });
      
      res.json(document);
    } catch (error: any) {
      console.error("Error uploading document:", error);
      res.status(400).json({ message: "Failed to upload document: " + error.message });
    }
  });

  app.get("/api/documents/case/:caseId", isAuthenticated, async (req: any, res) => {
    try {
      const caseId = parseInt(req.params.caseId);
      const documents = await storage.getCaseDocuments(caseId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching case documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id/download", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Verify user owns this document
      const userId = req.user.claims.sub;
      if (document.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const filePath = document.uploadPath;
      res.download(filePath, document.originalName);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // Timeline routes
  app.get("/api/timeline/case/:caseId", isAuthenticated, async (req: any, res) => {
    try {
      const caseId = parseInt(req.params.caseId);
      const timeline = await storage.getCaseTimeline(caseId);
      res.json(timeline);
    } catch (error) {
      console.error("Error fetching timeline:", error);
      res.status(500).json({ message: "Failed to fetch timeline" });
    }
  });

  // Contract routes
  app.get("/api/contracts", async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const contracts = await storage.getUserContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", async (req, res) => {
    if (!STRIPE_ENABLED) {
      return res.status(503).json({ message: "Payment processing not configured. Please contact support." });
    }
    try {
      const { amount = 29900 } = req.body; // Default $299 in cents
      const paymentIntent = await stripe!.paymentIntents.create({
        amount: Math.round(amount),
        currency: "aud",
        metadata: {
          type: 'strategy_pack'
        }
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    if (!STRIPE_ENABLED) {
      return res.status(503).json({ message: "Payment processing not configured. Please contact support." });
    }
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe!.subscriptions.retrieve(user.stripeSubscriptionId);
        return res.json({
          subscriptionId: subscription.id,
          clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
        });
      }
      
      if (!user.email) {
        return res.status(400).json({ message: 'No user email on file' });
      }

      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe!.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
        });
        customerId = customer.id;
        user = await storage.updateUserStripeInfo(userId, customerId);
      }

      const subscription = await stripe!.subscriptions.create({
        customer: customerId,
        items: [{
          price_data: {
            currency: 'aud',
            unit_amount: 4900, // $49 AUD
            recurring: {
              interval: 'month',
            },
          } as any,
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(userId, customerId, subscription.id);

      res.json({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      console.error("Subscription error:", error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  // AI Strategy Pack PDF Generation
  app.post("/api/generate-ai-strategy-pdf", isAuthenticated, async (req: any, res) => {
    try {
      const { caseData } = req.body;
      
      if (!caseData) {
        return res.status(400).json({ message: "Case data is required" });
      }

      // Generate AI-powered strategy pack PDF
      const pdfPath = await generateAIStrategyPackPDF(caseData);
      
      res.json({ 
        success: true, 
        pdfPath,
        downloadUrl: `/api/download-strategy-pdf/${encodeURIComponent(pdfPath.split('/').pop() || 'strategy-pack.pdf')}`,
        message: "AI Strategy Pack PDF generated successfully" 
      });
    } catch (error: any) {
      console.error("Error generating AI strategy PDF:", error);
      res.status(500).json({ message: "Failed to generate strategy pack PDF: " + error.message });
    }
  });

  // Download Strategy Pack PDF
  app.get("/api/download-strategy-pdf/:filename", async (req, res) => {
    try {
      const filename = decodeURIComponent(req.params.filename);
      const filePath = path.join('uploads', filename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error("Download error:", err);
          res.status(500).json({ message: "Download failed" });
        }
      });
    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      res.status(500).json({ message: "Download failed: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
