import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { supabaseAdmin, userManagement, database } from "./supabase";
import { authenticateToken, requireAdmin, requireModerator, optionalAuth } from "./auth-middleware";
import { analyzeCase, generateStrategyPack } from "./openai";
import { sendWelcomeEmail, sendApprovalEmail, sendRejectionEmail } from "./email";
import { generateStrategyPackPDF, generateAIStrategyPackPDF } from "./pdf";
import { storageService, upload, STORAGE_BUCKETS } from "./storage-service";
import multer from 'multer';
import path from 'path';

export async function registerSupabaseRoutes(app: Express): Promise<Server> {
  // User profile routes
  app.get('/api/user/profile', authenticateToken, async (req: Request, res: Response) => {
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

  app.put('/api/user/profile', authenticateToken, async (req: Request, res: Response) => {
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
  app.get('/api/admin/users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
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

  app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
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

  app.get('/api/applications', authenticateToken, async (req: Request, res: Response) => {
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

  app.put('/api/applications/:id/status', authenticateToken, requireModerator, async (req: Request, res: Response) => {
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
  app.post('/api/cases', authenticateToken, async (req: Request, res: Response) => {
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

  app.get('/api/cases', authenticateToken, async (req: Request, res: Response) => {
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

  app.get('/api/cases/:id', authenticateToken, async (req: Request, res: Response) => {
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

  app.post('/api/cases/:id/generate-strategy', authenticateToken, async (req: Request, res: Response) => {
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
  app.post('/api/upload', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { caseId, contractId, category = 'document' } = req.body;
      const userId = req.user!.id;

      // Determine bucket based on category
      let bucket = STORAGE_BUCKETS.DOCUMENTS;
      switch (category) {
        case 'pdf':
          bucket = STORAGE_BUCKETS.CASE_FILES;
          break;
        case 'contract':
          bucket = STORAGE_BUCKETS.CONTRACTS;
          break;
        case 'photo':
          bucket = STORAGE_BUCKETS.PHOTOS;
          break;
        case 'timeline':
          bucket = STORAGE_BUCKETS.TIMELINES;
          break;
      }

      const result = await storageService.uploadFile(req.file, bucket, userId, {
        caseId: caseId ? parseInt(caseId) : undefined,
        contractId: contractId ? parseInt(contractId) : undefined,
        category: category as any
      });

      res.json({
        message: "File uploaded successfully",
        file: result
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Upload case PDF
  app.post('/api/upload/case-pdf', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { caseId } = req.body;
      if (!caseId) {
        return res.status(400).json({ message: "Case ID is required" });
      }

      const result = await storageService.uploadCasePDF(req.file, req.user!.id, parseInt(caseId));

      res.json({
        message: "Case PDF uploaded successfully",
        file: result
      });
    } catch (error) {
      console.error("Error uploading case PDF:", error);
      res.status(500).json({ message: "Failed to upload case PDF" });
    }
  });

  // Upload contract version
  app.post('/api/upload/contract', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { contractId } = req.body;
      if (!contractId) {
        return res.status(400).json({ message: "Contract ID is required" });
      }

      const result = await storageService.uploadContract(req.file, req.user!.id, parseInt(contractId));

      res.json({
        message: "Contract uploaded successfully",
        file: result
      });
    } catch (error) {
      console.error("Error uploading contract:", error);
      res.status(500).json({ message: "Failed to upload contract" });
    }
  });

  // Upload photo
  app.post('/api/upload/photo', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { caseId } = req.body;
      const result = await storageService.uploadPhoto(req.file, req.user!.id, caseId ? parseInt(caseId) : undefined);

      res.json({
        message: "Photo uploaded successfully",
        file: result
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // Get files for a case
  app.get('/api/files/case/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const caseId = parseInt(req.params.id);
      const files = await storageService.getCaseFiles(caseId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching case files:", error);
      res.status(500).json({ message: "Failed to fetch case files" });
    }
  });

  // Get files for a contract
  app.get('/api/files/contract/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const contractId = parseInt(req.params.id);
      const files = await storageService.getContractFiles(contractId);
      res.json(files);
    } catch (error) {
      console.error("Error fetching contract files:", error);
      res.status(500).json({ message: "Failed to fetch contract files" });
    }
  });

  // Get user files by category
  app.get('/api/files/user', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { category } = req.query;
      const files = await storageService.getUserFiles(req.user!.id, category as any);
      res.json(files);
    } catch (error) {
      console.error("Error fetching user files:", error);
      res.status(500).json({ message: "Failed to fetch user files" });
    }
  });

  // Delete a file
  app.delete('/api/files/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
      const fileId = req.params.id;
      await storageService.deleteFile(fileId, req.user!.id);
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Get signed URL for private files
  app.get('/api/files/:id/download', authenticateToken, async (req: Request, res: Response) => {
    try {
      const fileId = req.params.id;
      
      // Get file metadata to check ownership and get path/bucket
      const files = await storageService.getUserFiles(req.user!.id);
      const file = files.find(f => f.id === fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found or access denied" });
      }

      const signedUrl = await storageService.getSignedUrl(file.path, file.bucket);
      res.json({ url: signedUrl });
    } catch (error) {
      console.error("Error generating download URL:", error);
      res.status(500).json({ message: "Failed to generate download URL" });
    }
  });

  // Admin role management
  app.get('/api/admin/roles', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const roles = ['user', 'moderator', 'admin'];
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}