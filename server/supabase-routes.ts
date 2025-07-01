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
import { aiTaggingService } from './ai-tagging-service';
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
        .from('users')
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
        .from('users')
        .update({
          firstName: first_name,
          lastName: last_name,
          updatedAt: new Date().toISOString()
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

  // Helper function to check usage limits for unsubscribed users
  const checkUsageLimits = async (userId: string, type: 'case' | 'contract') => {
    // First check if user has active subscription
    const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (error || !user) {
      return { canCreate: false, message: 'User authentication failed', remainingCreations: 0 };
    }

    const actualUser = (user as any).user || user;
    const metadata = actualUser.user_metadata || actualUser.raw_user_meta_data || {};
    const planType = metadata.planType || 'none';
    const status = metadata.status || 'inactive';
    const subscriptionExpiresAt = metadata.currentPeriodEnd;

    // Check if subscription is active and not expired
    const isActive = status === 'active' && 
      (!subscriptionExpiresAt || new Date(subscriptionExpiresAt) > new Date());

    // If subscribed, allow unlimited creation
    if (isActive) {
      return { canCreate: true, message: 'Unlimited with active subscription', remainingCreations: -1 };
    }

    // For unsubscribed users, check current usage count
    const tableName = type === 'case' ? 'cases' : 'contracts';
    const { data: existingItems, error: countError } = await supabaseAdmin
      .from(tableName)
      .select('id')
      .eq('user_id', userId);

    if (countError) {
      console.error(`Error counting user ${type}s:`, countError);
      return { canCreate: false, message: 'Unable to verify usage limits', remainingCreations: 0 };
    }

    const currentCount = existingItems?.length || 0;
    const limit = 2;
    const remaining = Math.max(0, limit - currentCount);

    if (currentCount >= limit) {
      return { 
        canCreate: false, 
        message: `Free trial limit reached (${limit} ${type}s). Subscribe for unlimited access.`,
        remainingCreations: 0
      };
    }

    return { 
      canCreate: true, 
      message: `Free trial: ${remaining} ${type}${remaining === 1 ? '' : 's'} remaining. Subscribe for unlimited access.`,
      remainingCreations: remaining
    };
  };

  // Case management routes
  app.post('/api/cases', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      
      // Check usage limits
      const usageCheck = await checkUsageLimits(userId, 'case');
      
      if (!usageCheck.canCreate) {
        return res.status(403).json({ 
          message: usageCheck.message,
          canCreate: false,
          remainingCreations: usageCheck.remainingCreations,
          type: 'usage_limit'
        });
      }

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
  // Get single contract by ID
  app.get('/api/contracts/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      const contractId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!contractId || isNaN(contractId)) {
        return res.status(400).json({ message: "Invalid contract ID" });
      }

      // Get contract from Supabase
      const { data: contract, error } = await supabaseAdmin
        .from('contracts')
        .select('*')
        .eq('id', contractId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching contract:', error);
        return res.status(500).json({ message: "Failed to fetch contract" });
      }

      if (!contract) {
        return res.status(404).json({ message: "Contract not found or access denied" });
      }

      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

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
      const userId = req.user!.id;
      console.log('Contract creation request body:', JSON.stringify(req.body, null, 2));
      
      // Check usage limits
      const usageCheck = await checkUsageLimits(userId, 'contract');
      
      if (!usageCheck.canCreate) {
        return res.status(403).json({ 
          message: usageCheck.message,
          canCreate: false,
          remainingCreations: usageCheck.remainingCreations,
          type: 'usage_limit'
        });
      }
      
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

      // Automatically trigger AI analysis for the uploaded document
      try {
        console.log(`Triggering AI analysis for document ${document.id}`);
        await aiTaggingService.analyzeDocument(document.id, document.fileName || document.originalName || 'uploaded-file');
        console.log(`AI analysis completed for document ${document.id}`);
      } catch (analysisError) {
        console.error('Error during automatic AI analysis:', analysisError);
        // Don't fail the upload if AI analysis fails
      }

      res.status(201).json({
        message: "File uploaded successfully", 
        document,
        aiAnalysisTriggered: true
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

      // Automatically trigger AI analysis for the uploaded document
      try {
        console.log(`Triggering AI analysis for case document ${document.id}`);
        await aiTaggingService.analyzeDocument(document.id, document.fileName || document.originalName || 'uploaded-file');
        console.log(`AI analysis completed for case document ${document.id}`);
      } catch (analysisError) {
        console.error('Error during automatic AI analysis:', analysisError);
        // Don't fail the upload if AI analysis fails
      }

      res.status(201).json({
        message: "File uploaded successfully",
        document,
        aiAnalysisTriggered: true
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

  // Contract document upload route
  app.post('/api/contracts/upload-document', (req, res, next) => {
    console.log('Contract upload - Raw headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      contentType: req.headers['content-type']
    });
    next();
  }, authenticateUser, upload.single('file'), async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const contractId = parseInt(req.body.contractId);
      const file = req.file;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      if (!file) {
        return res.status(400).json({ message: "No file provided" });
      }

      if (!contractId || isNaN(contractId)) {
        return res.status(400).json({ message: "Invalid contract ID" });
      }

      // Verify contract belongs to user
      const { data: contract, error: contractError } = await supabaseAdmin
        .from('contracts')
        .select('id, user_id')
        .eq('id', contractId)
        .eq('user_id', userId)
        .single();

      if (contractError || !contract) {
        return res.status(404).json({ message: "Contract not found or access denied" });
      }

      const category = 'contract';
      const description = req.body.description || `Contract document for Contract #${contractId}`;
      
      // Upload to Supabase Storage
      const document = await supabaseStorageService.uploadFile(file, userId, {
        category,
        description,
        contractId
      });

      // Update contract to mark it has documents
      await supabaseAdmin
        .from('contracts')
        .update({ 
          updated_at: new Date().toISOString(),
          has_documents: true
        })
        .eq('id', contractId);

      res.status(201).json({
        message: "Contract document uploaded successfully",
        document
      });
    } catch (error) {
      console.error("Error uploading contract document:", error);
      res.status(500).json({ message: "Failed to upload contract document" });
    }
  });

  // Get documents for a specific contract
  app.get('/api/contracts/:contractId/documents', authenticateUser, async (req: Request, res: Response) => {
    try {
      const contractId = parseInt(req.params.contractId);
      const userId = req.user?.id;

      if (!contractId || isNaN(contractId)) {
        return res.status(400).json({ message: "Invalid contract ID" });
      }

      // Verify contract belongs to user
      const { data: contract, error: contractError } = await supabaseAdmin
        .from('contracts')
        .select('id, user_id')
        .eq('id', contractId)
        .eq('user_id', userId)
        .single();

      if (contractError || !contract) {
        return res.status(404).json({ message: "Contract not found or access denied" });
      }

      // Get documents for this contract using Supabase Storage
      const documents = await supabaseStorageService.listUserDocuments(userId!, { contractId });
      
      res.json(documents);
    } catch (error) {
      console.error("Error fetching contract documents:", error);
      res.status(500).json({ message: "Failed to fetch contract documents" });
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
        // Check if the email exists but is not authorized
        if (email !== 'hello@projectresolveai.com') {
          return res.status(403).json({ 
            message: 'Access denied: Only authorized administrators can access this panel',
            isUnauthorizedEmail: true
          });
        }
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

      // Get subscription details from users table instead of profiles
      const { data: userProfiles, error: profilesError } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name, subscription_status, subscription_expires_at, created_at');

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
      }

      // Combine auth users with profile data and subscription metadata
      const usersWithSubscriptions = authUsers.users.map(user => {
        const profile = userProfiles?.find(p => p.id === user.id);
        const metadata = user.user_metadata || {};
        
        // Extract subscription data from auth metadata
        const subscriptionStatus = metadata.status || 'inactive';
        const planType = metadata.planType || 'none';
        const currentPeriodStart = metadata.currentPeriodStart;
        const currentPeriodEnd = metadata.currentPeriodEnd;
        
        return {
          id: user.id,
          email: user.email,
          firstName: profile?.first_name || metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || 'Unknown',
          lastName: profile?.last_name || metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
          subscriptionStatus: subscriptionStatus,
          planType: planType,
          subscriptionStartDate: currentPeriodStart || user.created_at,
          subscriptionEndDate: currentPeriodEnd,
          createdAt: user.created_at,
          lastSignInAt: user.last_sign_in_at,
          stripeCustomerId: metadata.stripeCustomerId,
          stripeSubscriptionId: metadata.stripeSubscriptionId
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

  // Consolidated document update route with PDF regeneration
  app.put('/api/admin/documents/:id', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      if (!req.adminSession) {
        return res.status(401).json({ message: 'Admin session required' });
      }

      const documentId = parseInt(req.params.id);
      const { content, status } = req.body;

      console.log('Document update request:', { documentId, hasContent: !!content, status });

      // First get the document details for PDF regeneration if content is being updated
      let document = null;
      if (content) {
        const { data: docData, error: docError } = await supabaseAdmin
          .from('ai_generated_documents')
          .select('*')
          .eq('id', documentId)
          .single();

        if (docError || !docData) {
          return res.status(404).json({ message: 'Document not found' });
        }
        document = docData;
      }

      // Update document content and status in database
      const success = await adminService.updateDocument(documentId, {
        content,
        status,
        reviewedBy: req.adminSession.email
      });

      if (!success) {
        return res.status(500).json({ message: 'Failed to update document' });
      }

      // If content was updated, regenerate PDF
      if (content && document) {
        try {
          const aiPDFService = require('./ai-pdf-service').aiPDFService;
          const newPdfPath = await aiPDFService.generateResolvePDF({
            id: document.case_id,
            title: document.ai_content?.caseTitle || 'Updated Case',
            user_id: document.user_id
          }, content);

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
          } else {
            console.log('Document and PDF updated successfully');
          }
        } catch (pdfError) {
          console.error('Error regenerating PDF:', pdfError);
          // Don't fail the request if PDF regeneration fails
        }
      }

      res.json({ message: 'Document updated successfully' });
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
        // 1. Send email notification via Supabase Auth
        try {
          console.log('Sending email notification via Supabase to:', user.email);
          
          const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || 'Customer';
          const dashboardUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/dashboard`;
          
          // Send email using Supabase Auth's built-in email system
          // Use invite user functionality to send notification email
          const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(user.email!, {
            redirectTo: dashboardUrl,
            data: {
              type: 'document_ready',
              documentId: documentId,
              caseTitle: document.cases.title,
              documentType: document.type || 'Strategy Pack',
              firstName: firstName,
              message: `Your legal document for case "${document.cases.title}" has been reviewed and approved by our team.`,
              loginUrl: dashboardUrl,
              isNotification: true
            }
          });

          if (emailError) {
            console.error('Supabase email error:', emailError);
            throw new Error(`Failed to send email: ${emailError.message}`);
          } else {
            console.log('Supabase email sent successfully to:', user.email);
          }
        } catch (emailError) {
          console.error('Email sending error:', emailError);
          // Continue with other notifications even if email fails
        }

        // 2. Create Supabase notification 
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
          } else {
            console.log('Notification created successfully');
          }
        } catch (notificationError) {
          console.error('Notification function error:', notificationError);
        }

        // 3. Update case progress to 70% when document is sent
        try {
          console.log(`Attempting to update case ${document.case_id} progress to 70%`);
          const { data: updateResult, error: progressError } = await supabaseAdmin
            .from('cases')
            .update({ 
              progress: 70,
              updated_at: new Date().toISOString()
            })
            .eq('id', document.case_id)
            .select();
            
          if (progressError) {
            console.error('Error updating case progress to 70%:', progressError);
          } else {
            console.log(`Case ${document.case_id} progress updated to 70% after document sent. Updated rows:`, updateResult);
          }
        } catch (error) {
          console.error('Failed to update case progress to 70%:', error);
        }

        // 4. Mark document as sent (no need to create separate storage entry)
        console.log('Document will be accessible in Strategy tab with status "sent"');

        res.json({ 
          message: 'Document sent successfully',
          recipient: user.email || 'unknown',
          documentType: document.type,
          caseTitle: document.cases.title,
          progress: 70
        });
      } else {
        res.status(500).json({ message: 'Failed to send document' });
      }
    } catch (error) {
      console.error('Error sending document:', error);
      res.status(500).json({ message: 'Failed to send document' });
    }
  });

  // Strategy documents routes
  app.get('/api/documents/strategy/:caseId', authenticateUser, async (req: Request, res: Response) => {
    try {
      const caseId = parseInt(req.params.caseId);
      
      console.log(`Fetching strategy documents for case ${caseId}, user ${req.user!.id}`);
      
      // Get AI-generated documents that have been sent to this user for this case
      const { data: documents, error } = await supabaseAdmin
        .from('ai_generated_documents')
        .select('*')
        .eq('case_id', caseId)
        .eq('user_id', req.user!.id)
        .eq('status', 'sent')
        .order('created_at', { ascending: false });

      console.log(`Strategy documents query result: documents=${documents?.length || 0}, error=`, error);

      if (error) {
        console.error('Error fetching strategy documents:', error);
        return res.status(500).json({ message: 'Failed to fetch strategy documents' });
      }

      // Transform the data to match the expected format
      const strategyDocuments = documents?.map(doc => ({
        id: doc.id,
        case_id: doc.case_id,
        user_id: doc.user_id,
        filename: `${doc.type}_${doc.case_id}.pdf`,
        original_name: `${doc.type.replace('_', ' ')} - Case ${doc.case_id}.pdf`,
        file_type: 'pdf',
        storage_path: doc.pdf_supabase_url,
        category: 'strategy_pack',
        description: `AI-generated ${doc.type.replace('_', ' ')}`,
        created_at: doc.created_at,
        supabase_url: doc.pdf_supabase_url
      })) || [];

      res.json(strategyDocuments);
    } catch (error) {
      console.error('Error in strategy documents route:', error);
      res.status(500).json({ message: 'Failed to fetch strategy documents' });
    }
  });

  // Download document route
  app.get('/api/documents/download/:id', authenticateUser, async (req: Request, res: Response) => {
    try {
      const documentId = parseInt(req.params.id);
      
      // Get document details and verify user access
      const { data: documents, error } = await supabaseAdmin
        .from('ai_generated_documents')
        .select('id, case_id, user_id, type, status, pdf_supabase_url')
        .eq('id', documentId)
        .eq('user_id', req.user!.id)
        .eq('status', 'sent');

      if (error || !documents || documents.length === 0) {
        console.log(`Document download failed: documentId=${documentId}, userId=${req.user!.id}, error:`, error);
        return res.status(404).json({ 
          message: 'Document file not yet uploaded to storage',
          details: 'The document may still be processing or may not exist'
        });
      }

      const document = documents[0];
      
      if (!document.pdf_supabase_url || document.pdf_supabase_url.trim() === '') {
        // Generate a simple PDF on-the-fly for documents without stored PDFs
        console.log(`Generating fallback PDF for document ${documentId}`);
        
        try {
          // Generate a comprehensive AI-powered PDF on-the-fly
          console.log(`Generating comprehensive AI PDF for document ${documentId}`);
          
          // Get case data for AI generation
          const { data: caseData, error: caseError } = await supabaseAdmin
            .from('cases')
            .select('*')
            .eq('id', document.case_id)
            .single();

          if (caseError || !caseData) {
            throw new Error('Case data not found for PDF generation');
          }

          // Import the comprehensive PDF generator
          const { comprehensivePDFGenerator } = await import('./comprehensive-pdf-generator');
          
          // Generate AI content and create professional PDF
          const documentData = await comprehensivePDFGenerator.generateComprehensiveDocument(caseData);
          const pdfFilename = await comprehensivePDFGenerator.generateProfessionalPDF(caseData, documentData);
          
          // Read the generated PDF file
          const path = await import('path');
          const fs = await import('fs');
          const pdfPath = path.join(process.cwd(), 'templates', pdfFilename);
          const pdfBuffer = fs.readFileSync(pdfPath);
          
          // Upload to Supabase Storage
          const uploadPath = `ai-documents/${document.user_id}/${pdfFilename}`;
          console.log(`Uploading PDF to Supabase Storage: ${uploadPath}`);
          
          const { data: uploadData, error: uploadError } = await supabaseAdmin
            .storage
            .from('documents')
            .upload(uploadPath, pdfBuffer, {
              contentType: 'application/pdf',
              upsert: true
            });

          if (uploadError) {
            console.error('Error uploading PDF to storage:', uploadError);
          } else {
            console.log('PDF uploaded successfully:', uploadData);
            
            // Get the public URL
            const { data: urlData } = supabaseAdmin
              .storage
              .from('documents')
              .getPublicUrl(uploadPath);
            
            const publicUrl = urlData.publicUrl;
            console.log('PDF public URL:', publicUrl);
            
            // Update the document record with the Supabase URL
            const { error: updateError } = await supabaseAdmin
              .from('ai_generated_documents')
              .update({ 
                pdf_supabase_url: publicUrl,
                updated_at: new Date().toISOString()
              })
              .eq('id', documentId);
              
            if (updateError) {
              console.error('Error updating document with PDF URL:', updateError);
            } else {
              console.log('Document updated with PDF URL successfully');
            }
          }
          
          const filename = `RESOLVE Strategy Pack - Case ${document.case_id}.pdf`;
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Content-Length', pdfBuffer.length.toString());
          res.send(pdfBuffer);
          
          // Clean up temporary file
          try {
            fs.unlinkSync(pdfPath);
          } catch (cleanupError) {
            console.warn('Could not clean up temporary PDF file:', cleanupError);
          }
          
          return; // Exit early since we're handling the response
        } catch (pdfError) {
          console.error('Error generating fallback PDF:', pdfError);
          return res.status(404).json({ 
            message: 'Document file not yet uploaded to storage',
            details: 'The document is being processed and will be available soon'
          });
        }
      }

      // Check if we should proxy the download or return the URL
      const shouldProxy = req.query.proxy === 'true';
      
      if (shouldProxy) {
        // Proxy the file download through our server using Supabase storage
        try {
          console.log('Proxying download for document:', document.id);
          
          // Extract the path from the URL for direct storage access
          const urlParts = document.pdf_supabase_url.split('/storage/v1/object/public/documents/');
          if (urlParts.length < 2) {
            throw new Error('Invalid storage URL format');
          }
          
          const storagePath = urlParts[1];
          console.log('Storage path:', storagePath);
          
          // Download directly from Supabase storage
          const { data: fileData, error: downloadError } = await supabaseAdmin.storage
            .from('documents')
            .download(storagePath);

          if (downloadError) {
            console.error('Storage download error:', downloadError);
            throw new Error(`Storage download failed: ${downloadError.message}`);
          }

          const buffer = await fileData.arrayBuffer();
          const filename = `${document.type.replace('_', ' ')} - Case ${document.case_id}.pdf`;
          
          console.log('File downloaded successfully, size:', buffer.byteLength);
          
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Content-Length', buffer.byteLength.toString());
          res.setHeader('Cache-Control', 'no-cache');
          res.send(Buffer.from(buffer));
        } catch (error) {
          console.error('Error proxying file download:', error);
          res.status(500).json({ message: 'Failed to download file' });
        }
      } else {
        // Return the Supabase URL for direct download
        res.json({ 
          downloadUrl: document.pdf_supabase_url,
          filename: `${document.type.replace('_', ' ')} - Case ${document.case_id}.pdf`
        });
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({ message: 'Failed to download document' });
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

  // Timeline Management Routes
  app.get('/api/timeline/case/:caseId', authenticateUser, async (req: Request, res: Response) => {
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

      const caseUserId = (caseData as any).user_id || caseData.userId;
      if (caseUserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Get timeline entries for this case
      const { data: timeline, error } = await supabaseAdmin
        .from('timeline_events')
        .select('*')
        .eq('case_id', caseId)
        .order('date', { ascending: true });

      if (error) throw error;
      res.json(timeline || []);
    } catch (error) {
      console.error('Error fetching case timeline:', error);
      res.status(500).json({ message: 'Failed to fetch case timeline' });
    }
  });

  app.get('/api/timeline/case', authenticateUser, async (req: Request, res: Response) => {
    // Return empty array for general timeline endpoint
    res.json([]);
  });

  app.post('/api/timeline/case/:caseId', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { caseId } = req.params;
      const { title, description, date, type, priority, status } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Get the case to verify ownership
      const caseData = await supabaseStorage.getCase(parseInt(caseId));
      if (!caseData) {
        return res.status(404).json({ message: 'Case not found' });
      }

      const caseUserId = (caseData as any).user_id || caseData.userId;
      if (caseUserId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Create timeline entry
      const { data: timelineEntry, error } = await supabaseAdmin
        .from('timeline_events')
        .insert({
          case_id: parseInt(caseId),
          user_id: userId,
          title: title || 'New Timeline Entry',
          description: description || '',
          date: date || new Date().toISOString(),
          type: type || 'milestone',
          priority: priority || 'medium',
          status: status || 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      res.json(timelineEntry);
    } catch (error) {
      console.error('Error creating timeline entry:', error);
      res.status(500).json({ message: 'Failed to create timeline entry' });
    }
  });

  app.put('/api/timeline/:entryId', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { entryId } = req.params;
      const { title, description, date, type, priority, status } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Check if entry belongs to user
      const { data: existingEntry, error: fetchError } = await supabaseAdmin
        .from('timeline_events')
        .select('*')
        .eq('id', entryId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !existingEntry) {
        return res.status(404).json({ message: 'Timeline entry not found' });
      }

      // Update timeline entry
      const { data: updatedEntry, error } = await supabaseAdmin
        .from('timeline_events')
        .update({
          title: title || existingEntry.title,
          description: description || existingEntry.description,
          date: date || existingEntry.date,
          type: type || existingEntry.type,
          priority: priority || existingEntry.priority,
          status: status || existingEntry.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', entryId)
        .select()
        .single();

      if (error) throw error;
      res.json(updatedEntry);
    } catch (error) {
      console.error('Error updating timeline entry:', error);
      res.status(500).json({ message: 'Failed to update timeline entry' });
    }
  });

  app.delete('/api/timeline/:entryId', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { entryId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Check if entry belongs to user
      const { data: existingEntry, error: fetchError } = await supabaseAdmin
        .from('timeline_events')
        .select('user_id')
        .eq('id', entryId)
        .single();

      if (fetchError || !existingEntry || existingEntry.user_id !== userId) {
        return res.status(404).json({ message: 'Timeline entry not found' });
      }

      // Delete timeline entry
      const { error } = await supabaseAdmin
        .from('timeline_events')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      res.json({ message: 'Timeline entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting timeline entry:', error);
      res.status(500).json({ message: 'Failed to delete timeline entry' });
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
      
      // Update case progress to 30% when document generation starts
      try {
        console.log(`Attempting to update case ${caseId} progress to 30%`);
        const { data: updateResult, error: progressError } = await supabaseAdmin
          .from('cases')
          .update({ 
            progress: 30,
            updated_at: new Date().toISOString()
          })
          .eq('id', caseId)
          .select();
          
        if (progressError) {
          console.error('Error updating case progress:', progressError);
        } else {
          console.log(`Case ${caseId} progress updated to 30%. Updated rows:`, updateResult);
        }
      } catch (error) {
        console.error('Failed to update case progress:', error);
      }
      
      res.json({ 
        message: 'Document generated successfully', 
        documentId,
        status: 'pending_review',
        progress: 30
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

  // AI Document Tagging Routes
  app.post('/api/documents/:documentId/analyze-tags', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { documentId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Get document to verify ownership
      const { data: document, error: docError } = await supabaseAdmin
        .from('document_storage')
        .select('*')
        .eq('id', parseInt(documentId))
        .eq('user_id', userId)
        .single();

      if (docError || !document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Analyze document with AI
      const analysis = await aiTaggingService.analyzeDocument(
        parseInt(documentId), 
        document.filename
      );

      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing document tags:', error);
      res.status(500).json({ message: 'Failed to analyze document' });
    }
  });

  app.get('/api/documents/:documentId/tags', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { documentId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Verify document ownership
      const { data: document, error: docError } = await supabaseAdmin
        .from('document_storage')
        .select('*')
        .eq('id', parseInt(documentId))
        .eq('user_id', userId)
        .single();

      if (docError || !document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      const tags = await aiTaggingService.getDocumentTags(parseInt(documentId));
      res.json(tags);
    } catch (error) {
      console.error('Error fetching document tags:', error);
      res.status(500).json({ message: 'Failed to fetch document tags' });
    }
  });

  app.post('/api/documents/:documentId/tags', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { documentId } = req.params;
      const { tagIds } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (!Array.isArray(tagIds)) {
        return res.status(400).json({ message: 'tagIds must be an array' });
      }

      // Verify document ownership
      const { data: document, error: docError } = await supabaseAdmin
        .from('document_storage')
        .select('*')
        .eq('id', parseInt(documentId))
        .eq('user_id', userId)
        .single();

      if (docError || !document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      const success = await aiTaggingService.applyTagsToDocument(
        parseInt(documentId), 
        tagIds, 
        userId
      );

      if (success) {
        res.json({ message: 'Tags applied successfully' });
      } else {
        res.status(500).json({ message: 'Failed to apply tags' });
      }
    } catch (error) {
      console.error('Error applying tags to document:', error);
      res.status(500).json({ message: 'Failed to apply tags' });
    }
  });

  app.get('/api/documents/:documentId/tag-suggestions', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { documentId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Verify document ownership
      const { data: document, error: docError } = await supabaseAdmin
        .from('document_storage')
        .select('*')
        .eq('id', parseInt(documentId))
        .eq('user_id', userId)
        .single();

      if (docError || !document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      const suggestions = await aiTaggingService.getTagSuggestions(parseInt(documentId));
      res.json(suggestions);
    } catch (error) {
      console.error('Error fetching tag suggestions:', error);
      res.status(500).json({ message: 'Failed to fetch tag suggestions' });
    }
  });

  app.get('/api/tags', authenticateUser, async (req: Request, res: Response) => {
    try {
      const tags = await aiTaggingService.getAllTags();
      res.json(tags);
    } catch (error) {
      console.error('Error fetching all tags:', error);
      res.status(500).json({ message: 'Failed to fetch tags' });
    }
  });

  app.post('/api/tags', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const { name, category, description } = req.body;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      if (!name || !category) {
        return res.status(400).json({ message: 'Name and category are required' });
      }

      const tag = await aiTaggingService.createCustomTag(name, category, description, userId);
      
      if (tag) {
        res.status(201).json(tag);
      } else {
        res.status(500).json({ message: 'Failed to create tag' });
      }
    } catch (error) {
      console.error('Error creating custom tag:', error);
      res.status(500).json({ message: 'Failed to create tag' });
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
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            planType: 'monthly_subscription',
            status: 'active',
            stripeSubscriptionId: 'demo_sub_' + Date.now(),
            stripeCustomerId: 'demo_cus_' + Date.now(),
            currentPeriodStart: new Date().toISOString(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            strategyPacksRemaining: null,
            hasInitialStrategyPack: true
          }
        });

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

  // Subscription status endpoint
  app.get('/api/subscription/status', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      // Get user data from Supabase auth
      const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (error || !user) {
        console.log('Error fetching user or user not found:', error);
        return res.json({
          planType: 'none',
          status: 'inactive',
          canCreateCases: false,
          message: 'No active subscription'
        });
      }

      console.log('User fetched for subscription check:', {
        userId,
        user_metadata: (user as any).user_metadata,
        nested_user_metadata: (user as any).user?.user_metadata,
        raw_user_meta_data: (user as any).raw_user_meta_data,
        hasUser: !!user,
        userStructure: Object.keys(user as any)
      });

      // Fix: Access nested user metadata correctly
      const actualUser = (user as any).user || user;
      const metadata = actualUser.user_metadata || actualUser.raw_user_meta_data || {};
      const planType = metadata.planType || 'none';
      const status = metadata.status || 'inactive';
      const subscriptionExpiresAt = metadata.currentPeriodEnd;

      console.log('Subscription status parsed:', {
        planType,
        status,
        subscriptionExpiresAt,
        metadata,
        metadataKeys: Object.keys(metadata)
      });

      // Check if subscription is active and not expired
      const isActive = status === 'active' && 
        (!subscriptionExpiresAt || new Date(subscriptionExpiresAt) > new Date());

      let message = '';
      let remainingCases = 0;
      let remainingContracts = 0;

      if (isActive) {
        message = 'Active monthly subscription - unlimited access';
      } else {
        // Get usage counts for unsubscribed users
        const [caseCheck, contractCheck] = await Promise.all([
          checkUsageLimits(userId, 'case'),
          checkUsageLimits(userId, 'contract')
        ]);
        
        remainingCases = caseCheck.remainingCreations;
        remainingContracts = contractCheck.remainingCreations;
        
        message = `Free trial: ${remainingCases} case${remainingCases === 1 ? '' : 's'}, ${remainingContracts} contract${remainingContracts === 1 ? '' : 's'} remaining`;
      }

      res.json({
        planType,
        status: isActive ? 'active' : 'inactive',
        canCreateCases: isActive || remainingCases > 0,
        canCreateContracts: isActive || remainingContracts > 0,
        subscriptionExpiresAt,
        remainingCases: isActive ? -1 : remainingCases,
        remainingContracts: isActive ? -1 : remainingContracts,
        message
      });
    } catch (error) {
      console.error('Error checking subscription status:', error);
      res.status(500).json({ message: 'Failed to check subscription status' });
    }
  });

  // Contact form submission endpoint - using direct PostgreSQL
  app.post('/api/contact-direct', async (req: Request, res: Response) => {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      console.log('Supabase contact submission:', { name, email, subject });

      // Use Supabase client to save to proper database
      const { data: submission, error } = await supabaseAdmin
        .from('contact_submissions')
        .insert({
          name,
          email,
          subject,
          message,
          status: 'unread'
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving contact submission to Supabase:', error);
        return res.status(500).json({ 
          message: 'Failed to save contact submission',
          error: error.message 
        });
      }

      console.log('Contact submission saved successfully to Supabase:', submission);

      res.json({ 
        message: 'Contact submission received successfully',
        submissionId: submission.id 
      });

    } catch (error) {
      console.error('Error in direct contact submission:', error);
      res.status(500).json({ message: 'Failed to process contact submission' });
    }
  });

  // Contact form submission endpoint - original Supabase version
  app.post('/api/contact', async (req: Request, res: Response) => {
    try {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      console.log('Attempting to insert contact submission:', { name, email, subject });

      // Try using raw SQL insert to bypass potential RLS issues
      const { data: submission, error } = await supabase
        .rpc('exec_sql', {
          sql_query: `
            INSERT INTO contact_submissions (name, email, subject, message, status, created_at)
            VALUES ($1, $2, $3, $4, 'unread', NOW())
            RETURNING id, name, email, subject, message, status, created_at
          `,
          params: [name, email, subject, message]
        });

      if (error || !submission) {
        console.error('SQL RPC error, trying simple insert:', error);
        
        // Use direct PostgreSQL connection if Supabase client fails
        const { createClient } = await import('@supabase/supabase-js');
        
        // Create a fresh client instance
        const directClient = createClient(
          process.env.VITE_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: { persistSession: false },
            db: { schema: 'public' }
          }
        );

        const { data: directSubmission, error: directError } = await directClient
          .from('contact_submissions')
          .insert({
            name,
            email,  
            subject,
            message,
            status: 'unread'
          })
          .select()
          .single();

        if (directError) {
          console.error('Direct client error:', directError);
          return res.status(500).json({ 
            message: 'Failed to save contact submission',
            error: directError.message || 'Database error'
          });
        }

        console.log('Contact submission saved via direct client:', directSubmission);
        
        res.json({ 
          message: 'Contact submission received successfully',
          submissionId: directSubmission.id
        });
        return;
      }

      console.log('Contact submission saved via SQL RPC:', submission);

      // Optional: Send notification to admin email (if configured)
      try {
        // You can implement email notification to admin here if needed
        console.log(`New contact submission from ${email}: ${subject}`);
      } catch (emailError) {
        console.error('Error sending admin notification:', emailError);
        // Don't fail the request if email fails
      }

      res.json({ 
        message: 'Contact submission received successfully',
        submissionId: submission.id 
      });
    } catch (error) {
      console.error('Error processing contact submission:', error);
      res.status(500).json({ message: 'Failed to process contact submission' });
    }
  });

  // Admin: Get all contact submissions
  app.get('/api/admin/contact-submissions', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      console.log('Fetching contact submissions from Supabase...');
      
      const { data: submissions, error } = await supabaseAdmin
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching contact submissions:', error);
        return res.status(500).json({ message: 'Failed to fetch contact submissions', error: error.message });
      }

      console.log(`Found ${submissions?.length || 0} contact submissions`);
      if (submissions && submissions.length > 0) {
        console.log('Latest submission:', submissions[0]);
      }

      res.json(submissions || []);
    } catch (error) {
      console.error('Error fetching contact submissions:', error);
      res.status(500).json({ message: 'Failed to fetch contact submissions' });
    }
  });

  // Admin: Update contact submission status
  app.put('/api/admin/contact-submissions/:id', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, admin_response } = req.body;

      const updateData: any = { status };
      if (admin_response) {
        updateData.admin_response = admin_response;
        updateData.responded_at = new Date().toISOString();
        updateData.responded_by = 'admin';
      }

      const { data: updatedSubmission, error } = await supabaseAdmin
        .from('contact_submissions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating contact submission:', error);
        return res.status(500).json({ message: 'Failed to update contact submission' });
      }

      // Create notification for user when admin responds
      if (admin_response && updatedSubmission) {
        try {
          // Get user ID by email to send notification
          const { data: userData, error: userError } = await supabaseAdmin
            .from('auth.users')
            .select('id')
            .eq('email', updatedSubmission.email)
            .single();

          if (userData && !userError) {
            const { error: notificationError } = await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: userData.id,
                title: 'Response to Your Contact Inquiry',
                message: `Our team has responded to your inquiry "${updatedSubmission.subject}". Check the response in your contact submissions.`,
                type: 'system',
                priority: 'medium',
                category: 'general',
                related_id: updatedSubmission.id,
                related_type: 'contact_submission'
              });

            if (notificationError) {
              console.error('Error creating user notification:', notificationError);
            } else {
              console.log('User notification created for contact response');
            }
          }
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError);
          // Don't fail the main request if notification fails
        }
      }

      res.json(updatedSubmission);
    } catch (error) {
      console.error('Error updating contact submission:', error);
      res.status(500).json({ message: 'Failed to update contact submission' });
    }
  });

  // Admin: Send email to contact submission user
  app.post('/api/admin/send-email', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { to, subject, message, contactSubmissionId } = req.body;

      if (!to || !subject || !message) {
        return res.status(400).json({ message: 'Email recipient, subject, and message are required' });
      }

      // Use Supabase Auth's email functionality to send emails
      const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(to, {
        data: {
          contact_response: true,
          subject: subject,
          message: message,
          contactSubmissionId: contactSubmissionId
        }
      });

      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Failed to send email', error: error.message });
      }

      console.log(`Email sent successfully to ${to} regarding contact submission ${contactSubmissionId}`);

      res.json({ 
        message: 'Email sent successfully',
        recipient: to,
        subject: subject
      });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ message: 'Failed to send email' });
    }
  });

  // User: Get their contact submissions and responses
  app.get('/api/user/contact-submissions', async (req: Request, res: Response) => {
    try {
      // Get user from Supabase session
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: 'No authorization header' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ message: 'Invalid session' });
      }

      const { data: submissions, error } = await supabaseAdmin
        .from('contact_submissions')
        .select('*')
        .eq('email', user.email)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user contact submissions:', error);
        return res.status(500).json({ message: 'Failed to fetch contact submissions' });
      }

      res.json(submissions || []);
    } catch (error) {
      console.error('Error fetching user contact submissions:', error);
      res.status(500).json({ message: 'Failed to fetch contact submissions' });
    }
  });

  // Admin: Send documentation via email
  app.post('/api/admin/send-documentation', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { emailDocumentationService } = await import('./email-documentation-service');
      const { recipientEmail, recipientName, documentTitle, documentUrl, customMessage, caseId } = req.body;

      if (!recipientEmail || !recipientName || !documentTitle) {
        return res.status(400).json({ 
          message: 'Recipient email, name, and document title are required' 
        });
      }

      const result = await emailDocumentationService.sendDocumentationEmail({
        recipientEmail,
        recipientName,
        documentTitle,
        documentUrl,
        customMessage,
        caseId
      });

      if (result.success) {
        res.json({ message: result.message });
      } else {
        res.status(500).json({ message: result.message });
      }
    } catch (error: any) {
      console.error('Error sending documentation email:', error);
      res.status(500).json({ message: 'Failed to send documentation email' });
    }
  });

  // Admin: Send bulk documentation emails
  app.post('/api/admin/send-bulk-documentation', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { emailDocumentationService } = await import('./email-documentation-service');
      const { emails } = req.body;

      if (!emails || !Array.isArray(emails)) {
        return res.status(400).json({ message: 'Emails array is required' });
      }

      const result = await emailDocumentationService.sendBulkDocumentation(emails);
      
      res.json({
        message: `Bulk email completed: ${result.sent} sent, ${result.failed} failed`,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors
      });
    } catch (error: any) {
      console.error('Error sending bulk documentation emails:', error);
      res.status(500).json({ message: 'Failed to send bulk documentation emails' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}