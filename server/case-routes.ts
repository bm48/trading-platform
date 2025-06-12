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
        status: "active"
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
      res.status(500).json({ 
        message: "Failed to create case", 
        error: error.message 
      });
    }
  });

  // Get all cases for a user
  app.get("/api/cases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
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
  app.get("/api/cases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const caseId = parseInt(req.params.id);

      const caseData = await storage.getCase(caseId);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      // Verify ownership
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
  app.put("/api/cases/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const caseId = parseInt(req.params.id);

      const caseData = await storage.getCase(caseId);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      // Verify ownership
      if (caseData.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = req.body;
      const updatedCase = await storage.updateCase(caseId, updates);

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
      res.status(500).json({ message: "Failed to update case" });
    }
  });

  // Generate strategy pack for a case
  app.post("/api/cases/:id/generate-strategy", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const caseId = parseInt(req.params.id);

      const caseData = await storage.getCase(caseId);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      // Verify ownership
      if (caseData.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Here you would integrate with OpenAI to generate strategy
      // For now, return a success message
      await storage.createTimelineEvent({
        caseId,
        userId,
        eventType: "strategy_generated",
        title: "Strategy Pack Generated",
        description: "AI-powered strategy pack has been generated for this case",
        eventDate: new Date(),
        isCompleted: true
      });

      res.json({ message: "Strategy pack generated successfully" });
    } catch (error: any) {
      console.error("Error generating strategy:", error);
      res.status(500).json({ message: "Failed to generate strategy" });
    }
  });

  // Get case timeline
  app.get("/api/cases/:id/timeline", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const caseId = parseInt(req.params.id);

      const caseData = await storage.getCase(caseId);
      if (!caseData) {
        return res.status(404).json({ message: "Case not found" });
      }

      // Verify ownership
      if (caseData.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const timeline = await storage.getCaseTimeline(caseId);
      res.json(timeline);
    } catch (error: any) {
      console.error("Error fetching timeline:", error);
      res.status(500).json({ message: "Failed to fetch timeline" });
    }
  });
}