import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertApplicationSchema, insertCaseSchema } from "@shared/schema";
import { analyzeCase, generateStrategyPack } from "./openai";
import { sendWelcomeEmail, sendApprovalEmail } from "./email";
import { generateStrategyPackPDF } from "./pdf";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

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

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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
  app.get("/api/cases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get("/api/contracts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contracts = await storage.getUserContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount = 29900 } = req.body; // Default $299 in cents
      const paymentIntent = await stripe.paymentIntents.create({
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
    try {
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        return res.json({
          subscriptionId: subscription.id,
          clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
        });
      }
      
      if (!user.email) {
        return res.status(400).json({ message: 'No user email on file' });
      }

      let customerId = user.stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`.trim(),
        });
        customerId = customer.id;
        user = await storage.updateUserStripeInfo(userId, customerId);
      }

      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'TradeGuard AI Monthly Support',
            },
            unit_amount: 4900, // $49 AUD
            recurring: {
              interval: 'month',
            },
          },
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(userId, customerId, subscription.id);

      res.json({
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      console.error("Subscription error:", error);
      res.status(400).json({ error: { message: error.message } });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
