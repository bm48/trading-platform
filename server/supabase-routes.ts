import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { supabaseAdmin, userManagement, database } from "./supabase";
import { authenticateUser, optionalAuth } from "./supabase-auth";
import { analyzeCase, generateStrategyPack } from "./openai";
import { sendWelcomeEmail, sendApprovalEmail, sendRejectionEmail } from "./email";
import { generateStrategyPackPDF, generateAIStrategyPackPDF } from "./pdf";
import multer from 'multer';
import path from 'path';

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
      const applicationData = {
        ...req.body,
        user_id: req.user?.id || null,
        created_at: new Date().toISOString()
      };

      const { data: application, error } = await database.createApplication(applicationData);
      if (error) throw error;

      // Send welcome email
      if (application.email) {
        await sendWelcomeEmail(application.email, application.full_name);
      }

      res.status(201).json(application);
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Failed to create application" });
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
      const caseData = {
        ...req.body,
        user_id: req.user!.id,
        created_at: new Date().toISOString()
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

  // File upload endpoints
  app.post('/api/documents/upload', authenticateUser, upload.single('file'), async (req: Request, res: Response) => {
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
      
      const { data: document, error } = await database.createDocument({
        user_id: userId,
        file_name: file.filename,
        original_name: file.originalname,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        category: category,
        description: description
      });

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

  app.post('/api/cases/:caseId/upload', authenticateUser, upload.single('file'), async (req: Request, res: Response) => {
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
      
      const { data: document, error } = await database.createDocument({
        user_id: userId,
        case_id: caseId,
        file_name: file.filename,
        original_name: file.originalname,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        category: category,
        description: description
      });

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

  app.post('/api/contracts/:contractId/upload', authenticateUser, upload.single('file'), async (req: Request, res: Response) => {
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
      
      const { data: document, error } = await database.createDocument({
        user_id: userId,
        contract_id: contractId,
        file_name: file.filename,
        original_name: file.originalname,
        file_path: file.path,
        file_size: file.size,
        mime_type: file.mimetype,
        category: category,
        description: description
      });

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