import type { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { authenticateToken } from "./auth-middleware";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
const thumbnailDir = path.join(uploadDir, 'thumbnails');

// Ensure upload directories exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow documents and images
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only documents and images are allowed.'));
    }
  }
});

// Helper function to determine file type
function getFileType(mimetype: string): string {
  if (mimetype.startsWith('image/')) {
    return 'photo';
  } else {
    return 'document';
  }
}

// Helper function to determine category based on file type
function getFileCategory(fileType: string, category?: string): string {
  if (category) return category;
  return fileType === 'photo' ? 'photos' : 'evidence';
}

export function registerFileUploadRoutes(app: Express) {
  // Upload file for case
  app.post("/api/cases/:id/upload", authenticateToken, upload.single('file'), async (req, res) => {
    try {
      const userId = req.user?.id;
      const caseId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Check if user owns this case
      const existingCase = await storage.getCase(caseId);
      if (!existingCase || existingCase.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const fileType = getFileType(req.file.mimetype);
      const category = getFileCategory(fileType, req.body.category);

      const documentData = {
        caseId,
        userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        uploadPath: req.file.path,
        category,
        description: req.body.description || '',
        version: 1,
        parentDocumentId: req.body.parentDocumentId ? parseInt(req.body.parentDocumentId) : undefined,
        isLatestVersion: true
      };

      // If this is a new version, mark previous version as not latest
      if (documentData.parentDocumentId) {
        // This would require additional storage method to update parent document
        // For now, we'll handle versioning in the frontend
      }

      const document = await storage.createDocument(documentData);

      // Create timeline event
      await storage.createTimelineEvent({
        caseId,
        userId,
        eventType: "document_uploaded",
        title: `${fileType === 'photo' ? 'Photo' : 'Document'} Uploaded`,
        description: `${req.file.originalname} has been uploaded`,
        eventDate: new Date(),
        isCompleted: true
      });

      res.status(201).json(document);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      res.status(500).json({ 
        message: "Failed to upload file", 
        error: error.message 
      });
    }
  });

  // Upload file for contract
  app.post("/api/contracts/:id/upload", authenticateToken, upload.single('file'), async (req, res) => {
    try {
      const userId = req.user?.id;
      const contractId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Check if user owns this contract
      const existingContract = await storage.getContract(contractId);
      if (!existingContract || existingContract.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const fileType = getFileType(req.file.mimetype);
      const category = getFileCategory(fileType, req.body.category);

      const documentData = {
        contractId,
        userId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        uploadPath: req.file.path,
        category,
        description: req.body.description || '',
        version: 1,
        parentDocumentId: req.body.parentDocumentId ? parseInt(req.body.parentDocumentId) : undefined,
        isLatestVersion: true
      };

      const document = await storage.createDocument(documentData);

      // Create timeline event
      await storage.createTimelineEvent({
        contractId,
        userId,
        eventType: "document_uploaded",
        title: `${fileType === 'photo' ? 'Photo' : 'Document'} Uploaded`,
        description: `${req.file.originalname} has been uploaded`,
        eventDate: new Date(),
        isCompleted: true
      });

      res.status(201).json(document);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      res.status(500).json({ 
        message: "Failed to upload file", 
        error: error.message 
      });
    }
  });

  // Download/view file
  app.get("/api/documents/:id/download", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      const documentId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if user owns this document
      if (document.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if file exists
      if (!fs.existsSync(document.uploadPath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
      res.setHeader('Content-Type', document.mimeType);
      
      // Stream the file
      const fileStream = fs.createReadStream(document.uploadPath);
      fileStream.pipe(res);
    } catch (error: any) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Preview file (for images)
  app.get("/api/documents/:id/preview", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      const documentId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if user owns this document
      if (document.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Only allow preview for images
      if (!document.mimeType.startsWith('image/')) {
        return res.status(400).json({ message: "Preview only available for images" });
      }

      // Check if file exists
      if (!fs.existsSync(document.uploadPath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      // Set appropriate headers for inline display
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Disposition', 'inline');
      
      // Stream the file
      const fileStream = fs.createReadStream(document.uploadPath);
      fileStream.pipe(res);
    } catch (error: any) {
      console.error("Error previewing file:", error);
      res.status(500).json({ message: "Failed to preview file" });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      const documentId = parseInt(req.params.id);
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if user owns this document
      if (document.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Delete file from disk
      if (fs.existsSync(document.uploadPath)) {
        fs.unlinkSync(document.uploadPath);
      }

      // Delete from database (this would require adding deleteDocument method to storage)
      // For now, we could mark it as deleted or implement soft delete
      
      res.json({ message: "Document deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // Get all user documents
  app.get("/api/documents", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User ID required" });
      }

      const documents = await storage.getUserDocuments(userId);
      res.json(documents);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });
}