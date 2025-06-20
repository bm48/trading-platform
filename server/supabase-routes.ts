import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { supabaseAdmin, userManagement, database } from "./supabase";
import { authenticateUser, optionalAuth } from "./supabase-auth";
import { supabaseStorage } from "./supabase-storage";
import { analyzeCase, generateStrategyPack } from "./openai";
import { sendWelcomeEmail, sendApprovalEmail, sendRejectionEmail, sendStrategyPackEmail } from "./email";
import { generateStrategyPackPDF, generateAIStrategyPackPDF } from "./pdf";
import { calendarService } from "./calendar-service";
import { adminService } from "./admin-service";
import { adminAuthService, authenticateAdmin } from './admin-auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

export async function registerSupabaseRoutes(app: Express): Promise<Server> {
  // User profile routes
  app.get('/api/user/profile', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', req.user!.id)
        .single();

      if (error) throw error;
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put('/api/user/profile', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { first_name, last_name, full_name } = req.body;
      
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .update({
          first_name,
          last_name,
          full_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.user!.id)
        .select()
        .single();

      if (error) throw error;
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Admin user management routes
  app.get('/api/admin/users', authenticateUser, async (req: Request, res: Response) => {
    // Check admin role
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const { data: users, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:id/role', authenticateUser, async (req: Request, res: Response) => {
    // Check admin role
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['user', 'admin', 'moderator'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const { data, error } = await userManagement.setUserRole(id, role);
      if (error) throw error;

      res.json({ message: "Role updated successfully", user: data });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Application routes
  app.post('/api/applications', optionalAuth, async (req: Request, res: Response) => {
    try {
      console.log('Received application data:', req.body);
      
      // Validate required fields
      const requiredFields = ['fullName', 'phone', 'email', 'trade', 'state', 'issueType', 'description'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: `Missing required fields: ${missingFields.join(', ')}` 
        });
      }

      const applicationData = {
        ...req.body,
        user_id: req.user?.id || null,
        created_at: new Date().toISOString()
      };

      console.log('Creating application with supabaseStorage...');
      const application = await supabaseStorage.createApplication(applicationData);
      console.log('Application created successfully:', application);

      // Send welcome email (non-blocking)
      if (application.email && (application.fullName || application.full_name)) {
        try {
          const name = application.fullName || application.full_name;
          await sendWelcomeEmail(application.email, name);
          console.log('Welcome email sent successfully');
        } catch (emailError) {
          console.warn('Failed to send welcome email:', emailError);
          // Don't fail the entire request for email issues
        }
      }

      res.status(201).json(application);
    } catch (error) {
      console.error("Error creating application:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      res.status(500).json({ 
        message: "Failed to create application",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/applications', authenticateUser, async (req: Request, res: Response) => {
    try {
      const isAdmin = req.user!.role === 'admin';
      const userId = isAdmin ? undefined : req.user!.id;
      
      const { data: applications, error } = await database.getApplications(userId);
      if (error) throw error;

      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.put('/api/applications/:id/status', authenticateUser, async (req: Request, res: Response) => {
    // Check moderator or admin role
    if (!req.user?.role || !['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ message: "Moderator access required" });
    }
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const { data: application, error } = await database.updateApplication(
        parseInt(id),
        { status, updated_at: new Date().toISOString() }
      );

      if (error) throw error;

      // Send notification emails
      if (status === 'approved') {
        await sendApprovalEmail(application.email, application.full_name, application.id);
      } else if (status === 'rejected') {
        await sendRejectionEmail(application.email, application.full_name, reason || 'Application did not meet criteria');
      }

      res.json(application);
    } catch (error) {
      console.error("Error updating application status:", error);
      res.status(500).json({ message: "Failed to update application status" });
    }
  });

  // Case management routes
  app.post('/api/cases', authenticateUser, async (req: Request, res: Response) => {
    try {
      // Generate case number
      const caseNumber = `CASE-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      // Map frontend camelCase to database snake_case (matching exact schema)
      const caseData = {
        user_id: req.user!.id,
        title: req.body.title,
        case_number: caseNumber,
        issue_type: req.body.issueType,
        description: req.body.description,
        amount: req.body.amount,
        status: 'active',
        priority: 'medium',
        progress: 0,
        next_action: req.body.nextAction || null, // Database uses 'next_action' not 'next_action_due'
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newCase, error } = await database.createCase(caseData);
      if (error) throw error;

      // Generate AI analysis
      try {
        const analysis = await analyzeCase(newCase);
        await database.updateCase(newCase.id, { 
          ai_analysis: analysis,
          updated_at: new Date().toISOString()
        });
      } catch (aiError) {
        console.error("AI analysis failed:", aiError);
      }

      res.status(201).json(newCase);
    } catch (error) {
      console.error("Error creating case:", error);
      res.status(500).json({ message: "Failed to create case" });
    }
  });

  app.get('/api/cases', authenticateUser, async (req: Request, res: Response) => {
    try {
      const isAdmin = req.user!.role === 'admin';
      const userId = isAdmin ? undefined : req.user!.id;
      
      const { data: cases, error } = await database.getCases(userId);
      if (error) throw error;

      res.json(cases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  app.get('/api/cases/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const { data: caseData, error } = await supabaseAdmin
        .from('cases')
        .select('*')
        .eq('id', parseInt(id))
        .single();

      if (error) throw error;

      // Check if user owns the case or is admin
      if (caseData.user_id !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(caseData);
    } catch (error) {
      console.error("Error fetching case:", error);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  app.post('/api/cases/:id/generate-strategy', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const { data: caseData, error } = await supabaseAdmin
        .from('cases')
        .select('*')
        .eq('id', parseInt(id))
        .eq('user_id', req.user!.id)
        .single();

      if (error) throw error;

      // Generate strategy pack
      const strategyPack = await generateStrategyPack(caseData, caseData.ai_analysis);
      const pdfPath = await generateAIStrategyPackPDF(caseData);

      // Update case with strategy pack
      await database.updateCase(parseInt(id), {
        strategy_pack_generated: true,
        updated_at: new Date().toISOString()
      });

      res.json({
        message: "Strategy pack generated successfully",
        pdfPath,
        strategyPack
      });
    } catch (error) {
      console.error("Error generating strategy pack:", error);
      res.status(500).json({ message: "Failed to generate strategy pack" });
    }
  });

  // Contract management routes
  // Debug endpoint to check actual table schema
  app.get('/api/debug/contracts-schema', authenticateUser, async (req: Request, res: Response) => {
    try {
      // Try to get existing contracts to see actual column names
      const { data: existingContracts, error } = await supabaseAdmin
        .from('contracts')
        .select('*')
        .limit(1);
        
      console.log('Existing contracts data structure:', existingContracts);
      res.json({ contracts: existingContracts, error });
    } catch (error) {
      console.error("Error checking schema:", error);
      res.status(500).json({ message: "Failed to check schema" });
    }
  });

  app.post('/api/contracts', authenticateUser, async (req: Request, res: Response) => {
    try {
      console.log('Contract creation request body:', JSON.stringify(req.body, null, 2));
      
      // Generate contract number
      const contractNumber = `CONTRACT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      // Use EXACT column names from actual database structure
      const contractData = {
        user_id: req.user!.id,
        title: req.body.title,
        contract_number: contractNumber, // Database uses 'contract_number' not 'contract_num'
        client_name: req.body.clientName,
        project_description: req.body.projectDescription, // Database uses 'project_description' not 'project_descr'
        value: parseFloat(req.body.value) || 0,
        start_date: req.body.startDate ? new Date(req.body.startDate).toISOString() : null,
        end_date: req.body.endDate ? new Date(req.body.endDate).toISOString() : null,
        terms: {
          contractType: req.body.contractType,
          paymentTerms: req.body.paymentTerms,
          scope: req.body.scope,
          specialConditions: req.body.specialConditions
        },
        status: req.body.status || 'draft',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Contract data with correct column names:', JSON.stringify(contractData, null, 2));

      const { data: newContract, error } = await supabaseAdmin
        .from('contracts')
        .insert(contractData)
        .select()
        .single();
        
      if (error) {
        console.error('Database error creating contract:', error);
        throw error;
      }

      res.status(201).json(newContract);
    } catch (error) {
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  app.get('/api/contracts', authenticateUser, async (req: Request, res: Response) => {
    try {
      const isAdmin = req.user!.role === 'admin';
      const userId = isAdmin ? undefined : req.user!.id;
      
      const { data: contracts, error } = await database.getContracts(userId);
      if (error) throw error;

      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.get('/api/contracts/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { data: contract, error } = await database.getContract(parseInt(id));
      
      if (error) throw error;
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Check ownership
      if (contract.user_id !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  // File upload routes
  app.post('/api/upload', authenticateUser, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { case_id, document_type = 'upload' } = req.body;

      const documentData = {
        user_id: req.user!.id,
        case_id: case_id ? parseInt(case_id) : null,
        title: req.file.originalname,
        file_path: req.file.path,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        document_type,
        created_at: new Date().toISOString()
      };

      const { data: document, error } = await supabaseAdmin
        .from('documents')
        .insert(documentData)
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        message: "File uploaded successfully",
        document
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // File upload endpoints - authenticate BEFORE multer processes the request
  app.post('/api/documents/upload', (req, res, next) => {
    // Log all headers before any processing
    console.log('Raw request headers before auth:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      contentType: req.headers['content-type']
    });
    next();
  }, authenticateUser, upload.single('file'), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const file = req.file;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const category = req.body.category || 'general';
      const description = req.body.description || file.originalname;
      
      const document = await supabaseStorage.createDocument({
        userid: userId,
        filename: file.filename,
        originalName: file.originalname,
        uploadPath: file.path,
        fileType: 'document',
        fileSize: file.size,
        mimeType: file.mimetype,
        category: category,
        description: description
      });

      res.status(201).json({
        message: "File uploaded successfully", 
        document
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.post('/api/cases/:caseId/upload', (req, res, next) => {
    console.log('Case upload - Raw headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      contentType: req.headers['content-type']
    });
    next();
  }, authenticateUser, upload.single('file'), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const caseId = parseInt(req.params.caseId);
      const file = req.file;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const category = req.body.category || 'general';
      const description = req.body.description || file.originalname;
      
      const document = await supabaseStorage.createDocument({
        userid: userId,
        caseid: caseId,
        filename: file.filename,
        originalName: file.originalname,
        uploadPath: file.path,
        fileType: 'document',
        fileSize: file.size,
        mimeType: file.mimetype,
        category: category,
        description: description
      });

      res.status(201).json({
        message: "File uploaded successfully",
        document
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.post('/api/contracts/:contractId/upload', (req, res, next) => {
    console.log('Contract upload - Raw headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      contentType: req.headers['content-type']
    });
    next();
  }, authenticateUser, upload.single('file'), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const contractId = parseInt(req.params.contractId);
      const file = req.file;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const category = req.body.category || 'general';
      const description = req.body.description || file.originalname;
      
      const document = await supabaseStorage.createDocument({
        userid: userId,
        contractid: contractId,
        filename: file.filename,
        originalName: file.originalname,
        uploadPath: file.path,
        fileType: 'document',
        fileSize: file.size,
        mimeType: file.mimetype,
        category: category,
        description: description
      });

      res.status(201).json({
        message: "File uploaded successfully",
        document
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Get documents for a specific case
  app.get('/api/documents/case/:caseId', authenticateUser, async (req: Request, res: Response) => {
    try {
      const caseId = parseInt(req.params.caseId);
      const userId = req.user?.id;

      if (!caseId || isNaN(caseId)) {
        return res.status(400).json({ message: "Invalid case ID" });
      }

      // Get documents for this case
      const documents = await supabaseStorage.getCaseDocuments(caseId);
      
      // Filter to only documents the user has access to
      const userDocuments = documents.filter(doc => doc.user_id === userId || req.user?.role === 'admin');
      
      res.json(userDocuments);
    } catch (error) {
      console.error("Error fetching case documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Document download endpoint with token authentication support
  app.get('/api/documents/:id/download', async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      const token = req.query.token as string;
      let userId: string | undefined;

      if (!documentId || isNaN(documentId)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      // Authenticate user - try multiple methods
      if (token) {
        // Token-based auth (from URL parameter)
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) {
          return res.status(401).json({ message: "Invalid token" });
        }
        userId = user.id;
      } else {
        // Try Authorization header first (for API calls)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const accessToken = authHeader.substring(7);
          const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
          if (!error && user) {
            userId = user.id;
          } else {
            return res.status(401).json({ message: "Invalid access token" });
          }
        } else {
          // For direct browser access without auth header, require token parameter
          return res.status(401).json({ message: "Access token required. Please use preview mode or include token parameter." });
        }
      }

      // Get document from database
      const document = await supabaseStorage.getDocument(documentId);
      
      if (!document) {
        console.log(`Document ${documentId} not found in database`);
        return res.status(404).json({ message: "Document not found" });
      }
      
      console.log(`Document found: ${document.original_name}, user: ${document.user_id}, requesting user: ${userId}`);

      // Check if user has access to this document
      if (document.user_id !== userId) {
        console.log(`Access denied: document user ${document.user_id} !== requesting user ${userId}`);
        return res.status(403).json({ message: "Access denied" });
      }

      // Send file
      const filePath = document.upload_path;
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      const fileName = document.original_name || 'download';
      
      // Set appropriate headers for inline viewing (for preview) or download
      if (req.query.preview === 'true') {
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      } else {
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      }
      res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // AI Strategy Generation Routes
  app.post('/api/ai/generate-strategy', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const intakeData = req.body;

      console.log('Generating AI strategy for user:', userId);

      // Import AI service
      const { aiTemplateService } = await import('./ai-template-service');

      // Generate AI content
      const aiContent = await aiTemplateService.generateContentFromIntake(intakeData);

      // Create a case for this intake if needed
      const caseData = {
        user_id: userId,
        title: intakeData.caseTitle,
        case_number: `CASE-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        issue_type: intakeData.issueType,
        description: intakeData.description,
        amount: intakeData.amount || 0,
        urgency: intakeData.urgency,
        status: 'active',
        ai_analysis: aiContent,
        intake_data: intakeData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const newCase = await supabaseStorage.createCase(caseData);

      // Generate and save documents
      const { wordDocId, pdfDocId } = await aiTemplateService.saveGeneratedDocuments(
        newCase.id,
        userId,
        intakeData,
        aiContent
      );

      // Store generation record for admin review
      const { data: generationRecord } = await supabaseAdmin
        .from('ai_generations')
        .insert({
          case_id: newCase.id,
          user_id: userId,
          type: 'strategy',
          status: 'draft',
          word_doc_id: wordDocId,
          pdf_doc_id: pdfDocId,
          ai_content: aiContent,
          intake_data: intakeData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      res.json({
        success: true,
        caseId: newCase.id,
        aiContent,
        documents: {
          wordDocId,
          pdfDocId
        },
        generationId: generationRecord?.id
      });

    } catch (error) {
      console.error('Error generating AI strategy:', error);
      res.status(500).json({ 
        message: "Failed to generate AI strategy",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Admin login routes
  app.post('/api/admin/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
      }

      const sessionId = await adminAuthService.authenticateAdmin(email, password);
      
      if (!sessionId) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Set session cookie
      res.cookie('adminSession', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      // Get the admin session data
      const adminSession = adminAuthService.validateAdminSession(sessionId);

      res.json({ 
        success: true, 
        sessionId,
        admin: adminSession,
        message: 'Admin login successful' 
      });
    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.post('/api/admin/logout', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers['x-admin-session'] || req.cookies?.adminSession;
      
      if (sessionId) {
        adminAuthService.logoutAdmin(sessionId as string);
      }

      res.clearCookie('adminSession');
      res.json({ success: true, message: 'Admin logout successful' });
    } catch (error) {
      console.error('Admin logout error:', error);
      res.status(500).json({ message: 'Logout failed' });
    }
  });

  app.get('/api/admin/session', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      res.json({ 
        success: true, 
        admin: req.adminSession,
        message: 'Admin session valid' 
      });
    } catch (error) {
      console.error('Admin session check error:', error);
      res.status(500).json({ message: 'Session check failed' });
    }
  });

  // Admin dashboard and management routes
  app.get('/api/admin/stats', authenticateAdmin, async (req: Request, res: Response) => {
    try {

      const stats = await adminService.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch admin statistics' });
    }
  });

  app.get('/api/admin/notifications', authenticateAdmin, async (req: Request, res: Response) => {
    try {

      const notifications = await adminService.getAdminNotifications();
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.get('/api/admin/activity', authenticateAdmin, async (req: Request, res: Response) => {
    try {

      const limit = parseInt(req.query.limit as string) || 50;
      const activity = await adminService.getUserActivity(limit);
      res.json(activity);
    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({ message: 'Failed to fetch user activity' });
    }
  });

  app.get('/api/admin/applications', authenticateAdmin, async (req: Request, res: Response) => {
    try {

      const applications = await adminService.getAllApplications();
      res.json(applications);
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({ message: 'Failed to fetch applications' });
    }
  });

  app.get('/api/admin/pending-documents', authenticateAdmin, async (req: Request, res: Response) => {
    try {

      const pendingDocs = await adminService.getPendingDocuments();
      res.json(pendingDocs);
    } catch (error) {
      console.error('Error fetching pending documents:', error);
      res.status(500).json({ message: 'Failed to fetch pending documents' });
    }
  });

  app.get('/api/admin/documents/:id', authenticateAdmin, async (req: Request, res: Response) => {
    try {

      const documentId = parseInt(req.params.id);
      const { data: document, error } = await supabaseAdmin
        .from('ai_generations')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) throw error;

      res.json(document);
    } catch (error) {
      console.error('Error fetching document:', error);
      res.status(500).json({ message: 'Failed to fetch document' });
    }
  });

  app.put('/api/admin/documents/:id', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      const { content, status } = req.body;

      if (!req.adminSession) {
        return res.status(401).json({ message: 'Admin session required' });
      }

      const success = await adminService.updateDocument(documentId, {
        content,
        status,
        reviewedBy: req.adminSession.email
      });

      if (success) {
        res.json({ message: 'Document updated successfully' });
      } else {
        res.status(500).json({ message: 'Failed to update document' });
      }
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ message: 'Failed to update document' });
    }
  });

  app.post('/api/admin/documents/:id/send', authenticateUser, async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const documentId = parseInt(req.params.id);
      
      const success = await adminService.updateDocument(documentId, {
        status: 'sent',
        reviewedBy: req.user.id
      });

      if (success) {
        // TODO: Implement actual document sending via email
        res.json({ message: 'Document sent successfully' });
      } else {
        res.status(500).json({ message: 'Failed to send document' });
      }
    } catch (error) {
      console.error('Error sending document:', error);
      res.status(500).json({ message: 'Failed to send document' });
    }
  });

  app.post('/api/admin/users/:id/promote', authenticateUser, async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const userId = req.params.id;
      const success = await adminService.promoteUserToAdmin(userId);

      if (success) {
        res.json({ message: 'User promoted to admin successfully' });
      } else {
        res.status(500).json({ message: 'Failed to promote user' });
      }
    } catch (error) {
      console.error('Error promoting user:', error);
      res.status(500).json({ message: 'Failed to promote user' });
    }
  });

  app.post('/api/admin/documents/:id/send', authenticateUser, async (req: Request, res: Response) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const documentId = parseInt(req.params.id);
      const { to, subject, body, attachments } = req.body;

      // Get document details
      const { data: document, error: docError } = await supabaseAdmin
        .from('ai_generations')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;

      // Send email with attachments
      const emailResult = await sendStrategyPackEmail(to, subject, body, attachments);

      // Update document status
      const { data: updatedDoc, error: updateError } = await supabaseAdmin
        .from('ai_generations')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_by: req.user.id
        })
        .eq('id', documentId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Create timeline event
      await supabaseStorage.createTimelineEvent({
        case_id: document.case_id,
        title: 'Strategy Pack Sent',
        description: `AI-generated strategy pack sent to client via email`,
        event_date: new Date().toISOString(),
        event_type: 'communication',
        is_completed: true,
        created_by: req.user.id
      });

      res.json({ success: true, document: updatedDoc });
    } catch (error) {
      console.error('Error sending document:', error);
      res.status(500).json({ message: 'Failed to send document' });
    }
  });

  // Document download routes for generated files
  app.get('/api/documents/word/:filename', async (req: Request, res: Response) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'templates', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading Word document:', error);
      res.status(500).json({ message: 'Failed to download document' });
    }
  });

  app.get('/api/documents/checklist/:filename', async (req: Request, res: Response) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'templates', filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found' });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/pdf');
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Error downloading checklist:', error);
      res.status(500).json({ message: 'Failed to download document' });
    }
  });

  // Calendar Integration Routes
  app.get('/api/calendar/auth/google', authenticateUser, async (req: Request, res: Response) => {
    try {
      const authUrl = await calendarService.getGoogleAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
      res.status(500).json({ message: 'Failed to get Google auth URL' });
    }
  });

  app.get('/api/calendar/auth/google/callback', async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).send('<html><body><h1>Error: Authorization code missing</h1><script>window.close();</script></body></html>');
      }

      // Store the auth code temporarily and redirect to frontend
      // The frontend will then make an authenticated request to exchange the code
      const successPage = `
        <html>
          <body>
            <h1>Authorization Successful</h1>
            <p>Connecting your Google Calendar...</p>
            <script>
              // Pass the code to the parent window and close
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GOOGLE_AUTH_SUCCESS', 
                  code: '${code}' 
                }, '*');
                window.close();
              } else {
                // Fallback: redirect to the app with the code
                window.location.href = '/?google_auth_code=${code}';
              }
            </script>
          </body>
        </html>
      `;
      
      res.send(successPage);
    } catch (error) {
      console.error('Error handling Google callback:', error);
      const errorPage = `
        <html>
          <body>
            <h1>Error</h1>
            <p>Failed to connect Google Calendar</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GOOGLE_AUTH_ERROR', 
                  error: 'Connection failed' 
                }, '*');
                window.close();
              }
            </script>
          </body>
        </html>
      `;
      res.send(errorPage);
    }
  });

  // New endpoint to exchange Google OAuth code for tokens
  app.post('/api/calendar/auth/google/exchange', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      const userId = (req as any).user.id;
      
      if (!code) {
        return res.status(400).json({ message: 'Authorization code required' });
      }

      const integration = await calendarService.handleGoogleCallback(code, userId);
      res.json({ message: 'Google Calendar connected successfully', integration });
    } catch (error) {
      console.error('Error exchanging Google code:', error);
      res.status(500).json({ message: 'Failed to connect Google Calendar' });
    }
  });

  app.get('/api/calendar/auth/microsoft', authenticateUser, async (req: Request, res: Response) => {
    try {
      const authUrl = await calendarService.getMicrosoftAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error('Error getting Microsoft auth URL:', error);
      res.status(500).json({ message: 'Failed to get Microsoft auth URL' });
    }
  });

  app.get('/api/calendar/auth/microsoft/callback', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { code } = req.query;
      const userId = (req as any).user.id;
      
      if (!code) {
        return res.status(400).json({ message: 'Authorization code required' });
      }

      const integration = await calendarService.handleMicrosoftCallback(code as string, userId);
      res.json({ message: 'Outlook Calendar connected successfully', integration });
    } catch (error) {
      console.error('Error handling Microsoft callback:', error);
      res.status(500).json({ message: 'Failed to connect Outlook Calendar' });
    }
  });

  app.get('/api/calendar/integrations', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const integrations = await calendarService.getUserIntegrations(userId);
      res.json(integrations);
    } catch (error) {
      console.error('Error fetching calendar integrations:', error);
      res.status(500).json({ message: 'Failed to fetch calendar integrations' });
    }
  });

  app.post('/api/calendar/events', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { title, description, startTime, endTime, location, attendees, reminderMinutes, caseId } = req.body;

      const eventData = {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        attendees,
        reminderMinutes
      };

      let events;
      if (caseId) {
        events = await calendarService.createEventForCase(caseId, eventData);
      } else {
        const integrations = await calendarService.getUserIntegrations(userId);
        events = [];
        for (const integration of integrations.filter(i => i.is_active)) {
          try {
            let event;
            if (integration.provider === 'google') {
              event = await calendarService.createGoogleEvent(integration.id, eventData);
            } else if (integration.provider === 'outlook') {
              event = await calendarService.createOutlookEvent(integration.id, eventData);
            }
            if (event) events.push(event);
          } catch (error) {
            console.error(`Failed to create event for ${integration.provider}:`, error);
          }
        }
      }

      res.json({ message: 'Calendar events created successfully', events });
    } catch (error) {
      console.error('Error creating calendar events:', error);
      res.status(500).json({ message: 'Failed to create calendar events' });
    }
  });

  app.post('/api/calendar/sync/case/:caseId', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      await calendarService.syncCaseDeadlines(parseInt(caseId));
      res.json({ message: 'Case deadlines synced to calendar successfully' });
    } catch (error) {
      console.error('Error syncing case deadlines:', error);
      res.status(500).json({ message: 'Failed to sync case deadlines' });
    }
  });

  app.delete('/api/calendar/integrations/:integrationId', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { integrationId } = req.params;
      await calendarService.disconnectIntegration(parseInt(integrationId));
      res.json({ message: 'Calendar integration disconnected successfully' });
    } catch (error) {
      console.error('Error disconnecting calendar integration:', error);
      res.status(500).json({ message: 'Failed to disconnect calendar integration' });
    }
  });

  app.get('/api/calendar/events', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const events = await supabaseStorage.getUserCalendarEvents(userId);
      res.json(events);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      res.status(500).json({ message: 'Failed to fetch calendar events' });
    }
  });

  app.get('/api/calendar/events/case/:caseId', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const events = await supabaseStorage.getCaseCalendarEvents(parseInt(caseId));
      res.json(events);
    } catch (error) {
      console.error('Error fetching case calendar events:', error);
      res.status(500).json({ message: 'Failed to fetch case calendar events' });
    }
  });

  // Role management routes
  app.get('/api/admin/roles', authenticateUser, async (req: Request, res: Response) => {
    try {
      const roles = [
        { value: 'user', label: 'User', description: 'Standard user with basic access' },
        { value: 'moderator', label: 'Moderator', description: 'Can review and approve applications' },
        { value: 'admin', label: 'Administrator', description: 'Full system access and user management' }
      ];
      
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}