import type { Express } from "express";
import { createServer, type Server } from "http";
import { insertCaseSchema, insertContractSchema } from "@shared/schema";
import { supabaseStorage } from "./supabase-storage";
import { authenticateUser, optionalAuth } from "./supabase-auth";

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

      // Create timeline event  
      await supabaseStorage.createTimelineEvent({
        case_id: caseData.id,
        user_id: userId,
        event_type: "case_created",
        title: "Case Created",
        description: `Case ${caseNumber} has been created`,
        eventDate: new Date(),
        is_completed: true
      });

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

      // Create timeline event
      await supabaseStorage.createTimelineEvent({
        contract_id: contractData.id,
        user_id: userId,
        event_type: "contract_created",
        title: "Contract Created", 
        description: `Contract ${contractNumber} has been created`,
        eventDate: new Date(),
        is_completed: true
      });

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

      const contracts = await directStorage.getUserContracts(userId);
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

      const application = await directStorage.createApplication(applicationData);
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

      const applications = await directStorage.getUserApplications(userId);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}