import type { Express } from "express";
import { storage } from "./storage";
import { insertCaseSchema } from "@shared/schema";
import { isAuthenticated } from "./replitAuth";

export function registerCaseRoutes(app: Express) {
  // Create a new case
  app.post("/api/cases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      // Validate request body
      const validatedData = insertCaseSchema.parse(req.body);
      
      // Generate unique case number
      const caseNumber = `CASE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      const caseData = {
        ...validatedData,
        userId,
        caseNumber,
        status: "active",
        progress: 0
      };

      const newCase = await storage.createCase(caseData);
      
      // Create initial timeline event
      await storage.createTimelineEvent({
        caseId: newCase.id,
        userId,
        eventType: "case_created",
        title: "Case Created",
        description: `Case ${newCase.caseNumber} has been created`,
        eventDate: new Date(),
        isCompleted: true
      });

      res.status(201).json(newCase);
    } catch (error: any) {
      console.error("Error creating case:", error);
      res.status(400).json({ 
        message: "Failed to create case", 
        error: error.message 
      });
    }
  });

  // Get all cases for the authenticated user
  app.get("/api/cases", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      const cases = await storage.getUserCases(userId);
      res.json(cases);
    } catch (error: any) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  // Get a specific case
  app.get("/api/cases/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      const caseId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      const caseData = await storage.getCase(caseId);
      
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      // Ensure user owns this case
      if (caseData.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(caseData);
    } catch (error: any) {
      console.error("Error fetching case:", error);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  // Update a case
  app.put("/api/cases/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      const caseId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      // Check if user owns this case
      const existingCase = await storage.getCase(caseId);
      if (!existingCase || existingCase.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Validate update data
      const validatedData = insertCaseSchema.partial().parse(req.body);
      
      const updatedCase = await storage.updateCase(caseId, validatedData);
      
      // Create timeline event for update
      await storage.createTimelineEvent({
        caseId,
        userId,
        eventType: "case_updated",
        title: "Case Updated",
        description: "Case details have been updated",
        eventDate: new Date(),
        isCompleted: true
      });

      res.json(updatedCase);
    } catch (error: any) {
      console.error("Error updating case:", error);
      res.status(400).json({ 
        message: "Failed to update case", 
        error: error.message 
      });
    }
  });

  // Delete a case
  app.delete("/api/cases/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      const caseId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      // Check if user owns this case
      const existingCase = await storage.getCase(caseId);
      if (!existingCase || existingCase.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Instead of hard delete, update status to 'deleted'
      await storage.updateCase(caseId, { status: 'deleted' });
      
      res.json({ message: "Case deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting case:", error);
      res.status(500).json({ message: "Failed to delete case" });
    }
  });

  // Get case timeline
  app.get("/api/cases/:id/timeline", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      const caseId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      // Check if user owns this case
      const existingCase = await storage.getCase(caseId);
      if (!existingCase || existingCase.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const timeline = await storage.getCaseTimeline(caseId);
      res.json(timeline);
    } catch (error: any) {
      console.error("Error fetching case timeline:", error);
      res.status(500).json({ message: "Failed to fetch case timeline" });
    }
  });

  // Get case documents
  app.get("/api/cases/:id/documents", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      const caseId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      // Check if user owns this case
      const existingCase = await storage.getCase(caseId);
      if (!existingCase || existingCase.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const documents = await storage.getCaseDocuments(caseId);
      res.json(documents);
    } catch (error: any) {
      console.error("Error fetching case documents:", error);
      res.status(500).json({ message: "Failed to fetch case documents" });
    }
  });
}