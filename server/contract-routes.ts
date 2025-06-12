import type { Express } from "express";
import { storage } from "./storage";
import { insertContractSchema } from "@shared/schema";
import { authenticateToken } from "./auth-middleware";

export function registerContractRoutes(app: Express) {
  // Create a new contract
  app.post("/api/contracts", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      // Validate request body
      const validatedData = insertContractSchema.parse(req.body);
      
      // Generate unique contract number
      const contractNumber = `CONTRACT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const contractData = {
        ...validatedData,
        userId,
        contractNumber,
        status: "draft",
        version: 1
      };

      const newContract = await storage.createContract(contractData);
      
      // Create initial timeline event
      await storage.createTimelineEvent({
        contractId: newContract.id,
        userId,
        eventType: "contract_created",
        title: "Contract Created",
        description: `Contract ${newContract.contractNumber} has been created`,
        eventDate: new Date(),
        isCompleted: true
      });

      res.status(201).json(newContract);
    } catch (error: any) {
      console.error("Error creating contract:", error);
      res.status(400).json({ 
        message: "Failed to create contract", 
        error: error.message 
      });
    }
  });

  // Get all contracts for the authenticated user
  app.get("/api/contracts", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      const contracts = await storage.getUserContracts(userId);
      res.json(contracts);
    } catch (error: any) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  // Get a specific contract
  app.get("/api/contracts/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      const contractId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      const contract = await storage.getContract(contractId);
      
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Ensure user owns this contract
      if (contract.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(contract);
    } catch (error: any) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  // Update a contract
  app.put("/api/contracts/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      const contractId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      // Check if user owns this contract
      const existingContract = await storage.getContract(contractId);
      if (!existingContract || existingContract.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate update data
      const validatedData = insertContractSchema.partial().parse(req.body);
      
      const updatedContract = await storage.updateContract(contractId, validatedData);
      
      // Create timeline event for update
      await storage.createTimelineEvent({
        contractId,
        userId,
        eventType: "contract_updated",
        title: "Contract Updated",
        description: "Contract details have been updated",
        eventDate: new Date(),
        isCompleted: true
      });

      res.json(updatedContract);
    } catch (error: any) {
      console.error("Error updating contract:", error);
      res.status(400).json({ 
        message: "Failed to update contract", 
        error: error.message 
      });
    }
  });

  // Create a new version of a contract
  app.post("/api/contracts/:id/versions", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      const contractId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      // Check if user owns this contract
      const existingContract = await storage.getContract(contractId);
      if (!existingContract || existingContract.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate new version data
      const validatedData = insertContractSchema.partial().parse(req.body);
      
      // Create new version with incremented version number
      const newVersion = await storage.createContract({
        ...existingContract,
        ...validatedData,
        version: existingContract.version + 1,
        status: "draft"
      });

      // Create timeline event
      await storage.createTimelineEvent({
        contractId: newVersion.id,
        userId,
        eventType: "contract_version_created",
        title: "New Contract Version",
        description: `Version ${newVersion.version} created`,
        eventDate: new Date(),
        isCompleted: true
      });

      res.status(201).json(newVersion);
    } catch (error: any) {
      console.error("Error creating contract version:", error);
      res.status(400).json({ 
        message: "Failed to create contract version", 
        error: error.message 
      });
    }
  });

  // Delete a contract
  app.delete("/api/contracts/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      const contractId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      // Check if user owns this contract
      const existingContract = await storage.getContract(contractId);
      if (!existingContract || existingContract.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Instead of hard delete, update status to 'deleted'
      await storage.updateContract(contractId, { status: 'deleted' });
      
      res.json({ message: "Contract deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  // Get contract timeline
  app.get("/api/contracts/:id/timeline", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      const contractId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      // Check if user owns this contract
      const existingContract = await storage.getContract(contractId);
      if (!existingContract || existingContract.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const timeline = await storage.getContractTimeline(contractId);
      res.json(timeline);
    } catch (error: any) {
      console.error("Error fetching contract timeline:", error);
      res.status(500).json({ message: "Failed to fetch contract timeline" });
    }
  });

  // Get contract documents
  app.get("/api/contracts/:id/documents", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      const contractId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      // Check if user owns this contract
      const existingContract = await storage.getContract(contractId);
      if (!existingContract || existingContract.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const documents = await storage.getContractDocuments(contractId);
      res.json(documents);
    } catch (error: any) {
      console.error("Error fetching contract documents:", error);
      res.status(500).json({ message: "Failed to fetch contract documents" });
    }
  });
}