import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { supabase } from "./db";
import { supabaseAdmin, userManagement, database } from "./supabase";
import { authenticateUser, optionalAuth } from "./supabase-auth";
import { supabaseStorageService } from "./supabase-storage-service";
import { supabaseStorage } from "./supabase-storage";
import { analyzeCase, generateStrategyPack } from "./openai";
import { sendWelcomeEmail, sendApprovalEmail, sendRejectionEmail, sendStrategyPackEmail, sendApplicationConfirmationEmail } from "./email";
import { generateStrategyPackPDF, generateAIStrategyPackPDF } from "./pdf";
import { calendarService } from "./calendar-service";
import { adminService } from "./admin-service";
import { adminAuthService, authenticateAdmin } from './admin-auth';
import { legalInsightsService } from './legal-insights-service';
import { notificationService } from './notification-service';
import { aiPDFService } from './ai-pdf-service';
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

  // Get user notifications
  app.get('/api/user/notifications', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { data: notifications, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('user_id', req.user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      res.json(notifications || []);
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.put('/api/user/notifications/:id/read', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', req.user!.id);

      if (error) throw error;

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Get user documents that have been sent
  app.get('/api/user/documents', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { data: documents, error } = await supabaseAdmin
        .from('ai_generated_documents')
        .select(`
          *,
          cases!inner(*)
        `)
        .eq('user_id', req.user!.id)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      res.json(documents || []);
    } catch (error) {
      console.error("Error fetching user documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Admin user management routes will be defined later with subscription details

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
      
      // Validate required fields (using camelCase from frontend)
      const requiredFields = ['fullName', 'phone', 'email', 'trade', 'state', 'issueType', 'description'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          message: `Missing required fields: ${missingFields.join(', ')}` 
        });
      }

      // Map frontend camelCase to database snake_case
      const applicationData = {
        user_id: req.user?.id || null,
        full_name: req.body.fullName,
        phone: req.body.phone,
        email: req.body.email,
        trade: req.body.trade,
        state: req.body.state,
        issue_type: req.body.issueType,
        amount: req.body.amount ? parseFloat(req.body.amount) : null,
        start_date: req.body.startDate ? new Date(req.body.startDate).toISOString() : null,
        description: req.body.description,
        status: 'pending'
      };

      console.log('Creating application with Supabase...');
      
      // Direct Supabase insertion
      const { data: application, error } = await supabase
        .from('applications')
        .insert(applicationData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating application:', error);
        return res.status(500).json({ 
          message: 'Failed to create application',
          error: error.message 
        });
      }

      console.log('Application created successfully:', application);

      // Send welcome email (non-blocking)
      if (application.email && application.full_name) {
        try {
          await sendWelcomeEmail(application.email, application.full_name);
          console.log('Welcome email sent successfully');
        } catch (emailError) {
          console.warn('Failed to send welcome email:', emailError);
          // Don't fail the entire request for email issues
        }
      }

      // Send application notification email
      if (application.email && application.full_name) {
        try {
          await sendApplicationConfirmationEmail(application.email, application.full_name, application.id);
          console.log('Application confirmation email sent successfully');
        } catch (emailError) {
          console.warn('Failed to send application confirmation email:', emailError);
        }
      }

      res.status(201).json({ data: application, error: null });
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

  // Get application by ID for status tracking
  app.get('/api/applications/:id', optionalAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      const { data: application, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching application:', error);
        return res.status(404).json({ message: 'Application not found' });
      }

      res.json(application);
    } catch (error) {
      console.error('Error fetching application:', error);
      res.status(500).json({ message: 'Failed to fetch application' });
    }
  });

  // Submit intake form for application
  app.post('/api/applications/:id/intake', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const intakeData = req.body;

      // Update application with intake data
      const { data: application, error } = await supabase
        .from('applications')
        .update({
          workflow_stage: 'pdf_generation',
          intake_completed: true,
          ai_analysis: intakeData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', req.user?.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating application with intake:', error);
        return res.status(500).json({ message: 'Failed to submit intake form' });
      }

      // Trigger AI strategy generation (async)
      try {
        console.log(`Starting AI strategy generation for application ${id}`);
        
        // Simulate AI processing delay and then update to dashboard_access
        setTimeout(async () => {
          await supabase
            .from('applications')
            .update({
              workflow_stage: 'dashboard_access',
              pdf_generated: true,
              dashboard_access_granted: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);
        }, 5000);
      } catch (aiError) {
        console.warn('AI generation trigger failed:', aiError);
      }

      res.json({ data: application, message: 'Intake form submitted successfully' });
    } catch (error) {
      console.error('Error submitting intake form:', error);
      res.status(500).json({ message: 'Failed to submit intake form' });
    }
  });

  // Admin route to approve/reject applications
  app.post('/api/admin/applications/:id/review', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { decision, notes } = req.body;

      const updateData: any = {
        status: decision,
        updated_at: new Date().toISOString()
      };

      if (decision === 'approved') {
        updateData.workflow_stage = 'payment_pending';
      } else {
        updateData.workflow_stage = 'rejected';
      }

      const { data: application, error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating application status:', error);
        return res.status(500).json({ message: 'Failed to update application' });
      }

      // Send appropriate email
      try {
        if (decision === 'approved') {
          await sendApprovalEmail(application.email, application.full_name, application.id);
        } else {
          await sendRejectionEmail(application.email, application.full_name, notes || 'Application did not meet requirements');
        }
      } catch (emailError) {
        console.warn('Failed to send notification email:', emailError);
      }

      res.json({ data: application, message: `Application ${decision} successfully` });
    } catch (error) {
      console.error('Error reviewing application:', error);
      res.status(500).json({ message: 'Failed to review application' });
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

  // Update case mood
  app.put('/api/cases/:id/mood', authenticateUser, async (req: Request, res: Response) => {
    try {
      const caseId = parseInt(req.params.id);
      const userId = req.user?.id;
      const { 
        moodScore, 
        stressLevel, 
        urgencyFeeling, 
        confidenceLevel, 
        clientSatisfaction, 
        moodNotes 
      } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'User authentication required' });
      }

      // Update case mood data
      const { data: updatedCase, error } = await supabaseAdmin
        .from('cases')
        .update({
          mood_score: moodScore,
          stress_level: stressLevel,
          urgency_feeling: urgencyFeeling,
          confidence_level: confidenceLevel,
          client_satisfaction: clientSatisfaction,
          mood_notes: moodNotes,
          last_mood_update: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating case mood:', error);
        return res.status(500).json({ message: 'Failed to update case mood' });
      }

      if (!updatedCase) {
        return res.status(404).json({ message: 'Case not found or access denied' });
      }

      res.json({ 
        success: true, 
        message: 'Case mood updated successfully',
        case: updatedCase 
      });
    } catch (error) {
      console.error('Error updating case mood:', error);
      res.status(500).json({ message: 'Failed to update case mood' });
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
      
      // Upload to Supabase Storage
      const document = await supabaseStorageService.uploadFile(file, userId, {
        category,
        description
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
      
      console.log('Upload parameters:', { caseId, userId, category, description });
      
      // Upload to Supabase Storage
      const document = await supabaseStorageService.uploadFile(file, userId, {
        caseId,
        category,
        description
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
      
      // Upload to Supabase Storage
      const document = await supabaseStorageService.uploadFile(file, userId, {
        contractId,
        category,
        description
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

      // Get documents for this case using Supabase Storage
      const documents = await supabaseStorageService.listUserDocuments(userId!, { caseId });
      
      res.json(documents);
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

      // Download file from Supabase Storage
      const { buffer, metadata } = await supabaseStorageService.downloadFile(documentId, userId);
      
      console.log(`Document found: ${metadata.originalName}, user: ${metadata.userId}, requesting user: ${userId}`);

      const fileName = metadata.originalName || 'download';
      
      // Set appropriate headers for inline viewing (for preview) or download
      if (req.query.preview === 'true') {
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      } else {
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      }
      res.setHeader('Content-Type', metadata.mimeType || 'application/octet-stream');
      res.setHeader('Content-Length', buffer.length.toString());
      
      res.send(buffer);
      
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

      const newCase = await database.createCase(caseData);

      // Generate and save documents
      const { wordDocId, pdfDocId } = await aiTemplateService.saveGeneratedDocuments(
        newCase.data.id,
        userId,
        intakeData,
        aiContent
      );

      // Store generation record for admin review
      const { data: generationRecord } = await supabaseAdmin
        .from('ai_generations')
        .insert({
          case_id: newCase.data.id,
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
        caseId: newCase.data.id,
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
      const adminSession = await adminAuthService.validateAdminSession(sessionId);

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
        await adminAuthService.logoutAdmin(sessionId as string);
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

  // Get users with subscription details
  app.get('/api/admin/users', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      if (!req.adminSession) {
        return res.status(401).json({ message: 'Admin session required' });
      }

      // Get all users from Supabase Auth
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
        return res.status(500).json({ message: 'Failed to fetch users' });
      }

      // Get subscription details from profiles table
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, subscription_status, subscription_start_date, subscription_end_date, first_name, last_name')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Combine auth users with profile data
      const usersWithSubscriptions = authUsers.users.map(user => {
        const profile = profiles?.find(p => p.user_id === user.id);
        return {
          id: user.id,
          email: user.email,
          firstName: profile?.first_name || user.user_metadata?.first_name || 'Unknown',
          lastName: profile?.last_name || user.user_metadata?.last_name || '',
          subscriptionStatus: profile?.subscription_status || 'inactive',
          subscriptionStartDate: profile?.subscription_start_date,
          subscriptionEndDate: profile?.subscription_end_date,
          createdAt: user.created_at,
          lastSignInAt: user.last_sign_in_at
        };
      });

      res.json(usersWithSubscriptions);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
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
        .from('ai_generated_documents')
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

  // Update document content and regenerate PDF in Storage
  app.put('/api/admin/documents/:id', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      if (!req.adminSession) {
        return res.status(401).json({ message: 'Admin session required' });
      }

      const documentId = parseInt(req.params.id);
      const { content } = req.body;

      // First get the document details
      const { data: document, error: docError } = await supabaseAdmin
        .from('ai_generated_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Update document content in database
      const success = await adminService.updateDocument(documentId, {
        content: content,
        reviewedBy: req.adminSession.email
      });

      if (success) {
        // Regenerate PDF with updated content and save to Supabase Storage
        try {
          const aiPDFService = require('./ai-pdf-service').aiPDFService;
          const newPdfPath = await aiPDFService.generateResolvePDF({
            id: document.case_id,
            title: document.ai_content.caseTitle || 'Updated Case',
            user_id: document.user_id
          }, JSON.parse(content));

          // Update the PDF path in the document record
          const { error: updateError } = await supabaseAdmin
            .from('ai_generated_documents')
            .update({
              pdf_file_path: newPdfPath,
              updated_at: new Date().toISOString()
            })
            .eq('id', documentId);

          if (updateError) {
            console.error('Error updating PDF path:', updateError);
          }

          console.log('Document and PDF updated successfully');
        } catch (pdfError) {
          console.error('Error regenerating PDF:', pdfError);
          // Don't fail the request if PDF regeneration fails
        }

        res.json({ message: 'Document updated successfully' });
      } else {
        res.status(404).json({ message: 'Document not found or failed to update' });
      }
    } catch (error) {
      console.error('Error updating document:', error);
      res.status(500).json({ message: 'Failed to update document' });
    }
  });

  app.post('/api/admin/documents/:id/send', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      if (!req.adminSession) {
        return res.status(401).json({ message: 'Admin session required' });
      }

      const documentId = parseInt(req.params.id);
      
      // Get document details first
      const { data: document, error: docError } = await supabaseAdmin
        .from('ai_generated_documents')
        .select(`
          *,
          cases!inner (
            id,
            title
          )
        `)
        .eq('id', documentId)
        .single();

      if (docError || !document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Get user details from Supabase auth using user_id from ai_generated_documents table
      console.log('Looking up user with ID:', document.user_id);
      const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(document.user_id);

      if (userError || !authUser) {
        console.error('Error fetching auth user:', userError);
        console.error('Document user_id:', document.user_id);
        return res.status(404).json({ message: 'User not found', userId: document.user_id, error: userError?.message });
      }

      console.log('Auth user found:', authUser.user?.email);
      const user = authUser.user;

      // Update document status to sent
      console.log('Updating document status...');
      const success = await adminService.updateDocument(documentId, {
        status: 'sent',
        reviewedBy: req.adminSession.email
      });

      console.log('Document update success:', success);

      if (success) {
        // Create Supabase notification instead of email
        try {
          console.log('Creating notification for user:', document.user_id);
          const { error: notificationError } = await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: document.user_id,
              type: 'document_ready',
              title: 'Your Legal Document is Ready',
              message: `Your ${document.type.replace('_', ' ')} for "${document.cases.title}" has been reviewed and is now available for download.`,
              priority: 'high',
              category: 'documents',
              metadata: {
                document_id: documentId,
                case_id: document.case_id,
                document_type: document.type,
                case_title: document.cases.title
              }
            });

          if (notificationError) {
            console.error('Notification creation error:', notificationError);
            // Don't fail the request if notification fails, just log it
          } else {
            console.log('Notification created successfully');
          }
        } catch (notificationError) {
          console.error('Notification function error:', notificationError);
          // Don't fail the request for notification errors
        }

        res.json({ 
          message: 'Document sent successfully',
          recipient: user.email || 'unknown',
          documentType: document.type,
          caseTitle: document.cases.title
        });
      } else {
        res.status(500).json({ message: 'Failed to send document' });
      }
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

  // Calendar Integration Routes - Using Supabase Google OAuth
  app.get('/api/calendar/auth/google', authenticateUser, async (req: Request, res: Response) => {
    try {
      // Use Supabase's Google OAuth with calendar scopes
      const { data, error } = await supabaseAdmin.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
          redirectTo: process.env.NODE_ENV === 'production' 
            ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/dashboard`
            : `https://${process.env.REPL_ID}.replit.app/dashboard`
        }
      });

      if (error) {
        return res.status(400).json({ 
          message: 'Failed to initiate Google Calendar authorization',
          error: error.message
        });
      }
      
      res.json({ authUrl: data.url });
    } catch (error) {
      console.error('Error getting Google auth URL:', error);
      
      // Handle OAuth verification errors
      let errorMessage = 'Failed to get Google auth URL';
      
      if (error instanceof Error) {
        if (error.message.includes('verification process') || 
            error.message.includes('access_denied') ||
            error.message.includes('has not completed')) {
          errorMessage = 'Google Calendar integration requires domain verification. This feature is temporarily unavailable during development.';
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ message: errorMessage });
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

  // New endpoint to connect Google Calendar using Supabase session
  app.post('/api/calendar/connect/google', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      
      // Get the user's session from Supabase to access OAuth tokens
      const { data: { session }, error: sessionError } = await supabaseAdmin.auth.getSession();
      
      if (sessionError || !session) {
        return res.status(401).json({ message: 'User session not found' });
      }

      // Check if the user has Google OAuth provider data
      const { data: user, error: userError } = await supabaseAdmin.auth.getUser(session.access_token);
      
      if (userError || !user.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Look for Google provider in user identities
      const googleIdentity = user.user.identities?.find(identity => identity.provider === 'google');
      
      if (!googleIdentity) {
        return res.status(400).json({ 
          message: 'Google account not connected. Please sign in with Google first.' 
        });
      }

      // Create a simple calendar integration record
      const integration = await supabaseStorage.createCalendarIntegration({
        user_id: userId,
        provider: 'google',
        access_token: 'supabase_managed', // Placeholder since Supabase manages tokens
        refresh_token: null,
        token_expires_at: undefined,
        calendar_id: 'primary',
        is_active: true
      });

      res.json({ 
        message: 'Google Calendar connected successfully', 
        integration,
        note: 'Calendar integration is now enabled through your Google account.'
      });
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      
      // Handle specific OAuth verification errors
      let errorMessage = 'Failed to connect Google Calendar';
      
      if (error instanceof Error) {
        if (error.message.includes('verification process') || 
            error.message.includes('access_denied') ||
            error.message.includes('has not completed')) {
          errorMessage = 'Google Calendar integration requires domain verification. This feature is temporarily unavailable during development. Please contact support for assistance.';
        } else {
          errorMessage = error.message;
        }
      }
      
      res.status(500).json({ message: errorMessage });
    }
  });

  app.get('/api/calendar/auth/microsoft', authenticateUser, async (req: Request, res: Response) => {
    try {
      const authUrl = await calendarService.getMicrosoftAuthUrl();
      
      if (!authUrl) {
        return res.status(400).json({ 
          message: 'Microsoft Calendar integration is not configured. Please contact support.' 
        });
      }
      
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
      const events = await calendarService.getUserCalendarEvents(userId);
      res.json(events);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      res.status(500).json({ message: 'Failed to fetch calendar events' });
    }
  });

  app.get('/api/calendar/events/case/:caseId', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { caseId } = req.params;
      const events = await calendarService.getCaseCalendarEvents(parseInt(caseId));
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

  // Notification routes
  app.get('/api/notifications', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const { status, priority, type, limit, offset } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status as string;
      if (priority) filters.priority = priority as string;
      if (type) filters.type = type as string;
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);

      const notifications = await notificationService.getUserNotifications(userId, filters);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  app.get('/api/notifications/summary', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const summary = await notificationService.getNotificationSummary(userId);
      res.json(summary);
    } catch (error) {
      console.error('Error fetching notification summary:', error);
      res.status(500).json({ message: 'Failed to fetch notification summary' });
    }
  });

  app.put('/api/notifications/:id/read', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      await notificationService.markAsRead(parseInt(id), userId);
      res.json({ message: 'Notification marked as read' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to mark notification as read' });
    }
  });

  app.put('/api/notifications/mark-all-read', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      await notificationService.markAllAsRead(userId);
      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: 'Failed to mark all notifications as read' });
    }
  });

  app.put('/api/notifications/:id/archive', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      await notificationService.archiveNotification(parseInt(id), userId);
      res.json({ message: 'Notification archived' });
    } catch (error) {
      console.error('Error archiving notification:', error);
      res.status(500).json({ message: 'Failed to archive notification' });
    }
  });

  app.delete('/api/notifications/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      await notificationService.deleteNotification(parseInt(id), userId);
      res.json({ message: 'Notification deleted' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ message: 'Failed to delete notification' });
    }
  });

  app.post('/api/notifications/generate-smart', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      await notificationService.createDeadlineNotifications(userId);
      await notificationService.createSmartNotifications(userId);
      res.json({ message: 'Smart notifications generated' });
    } catch (error) {
      console.error('Error generating smart notifications:', error);
      res.status(500).json({ message: 'Failed to generate smart notifications' });
    }
  });

  // Legal Insights routes
  app.get('/api/legal-insights', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const insights = await legalInsightsService.generatePersonalizedInsights(userId);
      res.json(insights);
    } catch (error) {
      console.error('Error generating legal insights:', error);
      res.status(500).json({ message: 'Failed to generate legal insights' });
    }
  });

  app.get('/api/legal-insights/case/:caseId', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { caseId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const insights = await legalInsightsService.getCaseSpecificInsights(parseInt(caseId), userId);
      res.json(insights);
    } catch (error) {
      console.error('Error generating case-specific insights:', error);
      res.status(500).json({ message: 'Failed to generate case-specific insights' });
    }
  });

  // AI Document Generation Routes
  app.post('/api/cases/:caseId/generate-document', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { caseId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Get the case to verify ownership
      const caseData = await supabaseStorage.getCase(parseInt(caseId));
      if (!caseData) {
        return res.status(404).json({ message: 'Case not found' });
      }

      // Check case ownership - database returns user_id column, not userId
      const caseUserId = (caseData as any).user_id || caseData.userId;
      if (caseUserId !== userId) {
        console.log(`Access denied: Case belongs to ${caseUserId}, request from ${userId}`);
        return res.status(403).json({ message: 'Access denied' });
      }

      // Generate the AI document
      console.log(`Generating AI document for case ${caseId}`);
      const documentId = await aiPDFService.generateAndSaveResolveDocument(caseData);
      
      res.json({ 
        message: 'Document generated successfully', 
        documentId,
        status: 'pending_review'
      });
    } catch (error) {
      console.error('Error generating AI document:', error);
      res.status(500).json({ message: 'Failed to generate document' });
    }
  });

  app.get('/api/cases/:caseId/ai-documents', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { caseId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Get the case to verify ownership
      const caseData = await supabaseStorage.getCase(parseInt(caseId));
      if (!caseData) {
        return res.status(404).json({ message: 'Case not found' });
      }

      // Check case ownership - database returns user_id column, not userId
      const caseUserId = (caseData as any).user_id || caseData.userId;
      if (caseUserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      const documents = await supabaseStorage.getAiDocumentsByCase(parseInt(caseId));
      res.json(documents);
    } catch (error) {
      console.error('Error fetching AI documents:', error);
      res.status(500).json({ message: 'Failed to fetch AI documents' });
    }
  });

  app.get('/api/ai-documents/:documentId', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { documentId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const document = await supabaseStorage.getAiDocument(parseInt(documentId));
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      if (document.user_id !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(document);
    } catch (error) {
      console.error('Error fetching AI document:', error);
      res.status(500).json({ message: 'Failed to fetch document' });
    }
  });

  // Stripe Payment Routes
  app.post('/api/stripe/create-payment-intent', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { plan, amount } = req.body;

      // Check if we have Stripe secret key to create real payment intents
      if (process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production') {
        // Real Stripe integration would go here
        const { default: Stripe } = await import('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2025-05-28.basil',
        });
        
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount || 4900, // amount in cents
          currency: 'aud',
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            userId,
            plan: plan || 'monthly'
          }
        });

        res.json({
          client_secret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status
        });
      } else {
        // For development/demo - return success without actual payment
        console.log('Demo mode: Simulating successful payment for user:', userId);
        
        // In demo mode, we simulate a successful payment and update subscription
        await supabase
          .from('auth.users')
          .update({
            raw_user_meta_data: {
              planType: 'monthly_unlimited',
              status: 'active',
              stripeSubscriptionId: 'demo_sub_' + Date.now(),
              stripeCustomerId: 'demo_cus_' + Date.now(),
              currentPeriodStart: new Date().toISOString(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              strategyPacksRemaining: null,
              hasInitialStrategyPack: true
            }
          })
          .eq('id', userId);

        res.json({
          client_secret: null, // No client secret needed for demo
          amount: amount || 4900,
          currency: 'aud',
          status: 'succeeded', // Simulate immediate success
          demo_mode: true
        });
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ message: 'Failed to create payment intent' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}