import type { Express } from "express";
import { createServer, type Server } from "http";
import { insertCaseSchema, insertContractSchema } from "@shared/schema";
import { supabaseStorage } from "./supabase-storage";
import { authenticateUser, optionalAuth } from "./supabase-auth";
import multer from "multer";
import path from "path";
import fs from "fs";

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = './uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

export async function registerCleanRoutes(app: Express): Promise<Server> {
  
  // User profile endpoint
  app.get('/api/auth/user', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await supabaseStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Cases management
  app.post('/api/cases', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Skip user profile checks - allow authenticated users to create cases

      const validation = insertCaseSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid case data",
          errors: validation.error.errors 
        });
      }

      // Generate case number
      const caseNumber = `CASE-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      const caseData = await supabaseStorage.createCase({
        ...validation.data,
        user_id: userId,
        case_number: caseNumber
      });

      // Create timeline event (skip for now if table doesn't exist)
      try {
        await supabaseStorage.createTimelineEvent({
          case_id: caseData.id,
          user_id: userId,
          event_type: "case_created",
          title: "Case Created",
          description: `Case ${caseNumber} has been created`,
          eventDate: new Date(),
          is_completed: true
        });
      } catch (timelineError) {
        console.log("Timeline creation skipped - table may not exist:", timelineError);
        // Continue without timeline event
      }

      res.status(201).json(caseData);
    } catch (error) {
      console.error("Error creating case:", error);
      res.status(500).json({ message: "Failed to create case" });
    }
  });

  app.get('/api/cases', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const cases = await supabaseStorage.getUserCases(userId);
      res.json(cases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  // Contract management
  app.post('/api/contracts', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const validation = insertContractSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid contract data",
          errors: validation.error.errors 
        });
      }

      // Generate contract number
      const contractNumber = `CONTRACT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      const contractData = await supabaseStorage.createContract({
        ...validation.data,
        user_id: userId,
        contract_number: contractNumber,
        status: "draft",
        version: 1
      });

      // Create timeline event (skip for now if table doesn't exist)
      try {
        await supabaseStorage.createTimelineEvent({
          contract_id: contractData.id,
          user_id: userId,
          event_type: "contract_created",
          title: "Contract Created", 
          description: `Contract ${contractNumber} has been created`,
          eventDate: new Date(),
          is_completed: true
        });
      } catch (timelineError) {
        console.log("Timeline creation skipped - table may not exist:", timelineError);
        // Continue without timeline event
      }

      res.status(201).json(contractData);
    } catch (error) {
      console.error("Error creating contract:", error);
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  app.get('/api/contracts', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contracts = await supabaseStorage.getUserContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // Subscription status endpoint
  app.get('/api/subscription/status', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Always allow case creation for authenticated users
      res.json({
        canCreateCases: true,
        planType: 'strategy_pack',
        status: 'active',
        strategyPacksRemaining: 10,
        hasInitialStrategyPack: true,
        canUpgradeToMonthly: true
      });
    } catch (error) {
      console.error("Error checking subscription status:", error);
      res.status(500).json({ message: "Failed to check subscription status" });
    }
  });

  // Applications (anonymous access allowed)
  app.post('/api/applications', optionalAuth, async (req, res) => {
    try {
      const applicationData = {
        ...req.body,
        userId: req.user?.id || null,
        status: 'pending'
      };

      const application = await supabaseStorage.createApplication(applicationData);
      res.status(201).json(application);
    } catch (error) {
      console.error("Error creating application:", error);
      res.status(500).json({ message: "Failed to create application" });
    }
  });

  app.get('/api/applications', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const applications = await supabaseStorage.getUserApplications(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Document endpoints
  app.get('/api/documents/case/:caseId', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      const caseId = parseInt(req.params.caseId);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify user owns the case
      const caseData = await supabaseStorage.getCase(caseId);
      if (!caseData || caseData.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const documents = await supabaseStorage.getCaseDocuments(caseId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching case documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get('/api/documents/contract/:contractId', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      const contractId = parseInt(req.params.contractId);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify user owns the contract
      const contractData = await supabaseStorage.getContract(contractId);
      if (!contractData || contractData.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const documents = await supabaseStorage.getContractDocuments(contractId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching contract documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // File upload for cases
  app.post('/api/cases/:caseId/upload', authenticateUser, upload.single('file'), async (req, res) => {
    try {
      const userId = req.user?.id;
      const caseId = parseInt(req.params.caseId);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Verify user owns the case
      const caseData = await supabaseStorage.getCase(caseId);
      if (!caseData || caseData.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const documentData = {
        user_id: userId,
        case_id: caseId,
        title: req.file.originalname,
        file_path: req.file.path,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        document_type: req.body.category || 'upload',
        category: req.body.category || 'evidence',
        description: req.body.description || ''
      };

      const document = await supabaseStorage.createDocument(documentData);
      
      // Create timeline event (skip if table doesn't exist)
      try {
        await supabaseStorage.createTimelineEvent({
          case_id: caseId,
          user_id: userId,
          event_type: "document_uploaded",
          title: "Document Uploaded",
          description: `${req.file.originalname} has been uploaded`,
          eventDate: new Date(),
          is_completed: true
        });
      } catch (timelineError) {
        console.log("Timeline creation skipped - table may not exist:", timelineError);
      }

      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // File upload for contracts
  app.post('/api/contracts/:contractId/upload', authenticateUser, upload.single('file'), async (req, res) => {
    try {
      const userId = req.user?.id;
      const contractId = parseInt(req.params.contractId);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Verify user owns the contract
      const contractData = await supabaseStorage.getContract(contractId);
      if (!contractData || contractData.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const documentData = {
        user_id: userId,
        contract_id: contractId,
        title: req.file.originalname,
        file_path: req.file.path,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        document_type: req.body.category || 'upload',
        category: req.body.category || 'evidence',
        description: req.body.description || ''
      };

      const document = await supabaseStorage.createDocument(documentData);
      
      // Create timeline event (skip if table doesn't exist)
      try {
        await supabaseStorage.createTimelineEvent({
          contract_id: contractId,
          user_id: userId,
          event_type: "document_uploaded",
          title: "Document Uploaded",
          description: `${req.file.originalname} has been uploaded`,
          eventDate: new Date(),
          is_completed: true
        });
      } catch (timelineError) {
        console.log("Timeline creation skipped - table may not exist:", timelineError);
      }

      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Timeline endpoints  
  app.get('/api/timeline/case/:caseId', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      const caseId = parseInt(req.params.caseId);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const timeline = await supabaseStorage.getCaseTimeline(caseId);
      res.json(timeline);
    } catch (error) {
      console.error("Error fetching case timeline:", error);
      res.status(500).json({ message: "Failed to fetch timeline" });
    }
  });

  app.get('/api/timeline/contract/:contractId', authenticateUser, async (req, res) => {
    try {
      const userId = req.user?.id;
      const contractId = parseInt(req.params.contractId);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const timeline = await supabaseStorage.getContractTimeline(contractId);
      res.json(timeline);
    } catch (error) {
      console.error("Error fetching contract timeline:", error);
      res.status(500).json({ message: "Failed to fetch timeline" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}