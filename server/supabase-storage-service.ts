import { supabaseAdmin } from './db';
import path from 'path';
import fs from 'fs';

export interface UploadedFile {
  id: number;
  userId: string;
  caseId?: number;
  contractId?: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  category: string;
  description?: string;
  supabaseUrl: string;
  supabasePath: string;
  createdAt: string;
}

export class SupabaseStorageService {
  private bucketName = 'documents';

  constructor() {
    this.initializeBucket();
  }

  // Initialize storage bucket if it doesn't exist
  private async initializeBucket() {
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        const { error } = await supabaseAdmin.storage.createBucket(this.bucketName, {
          public: false, // Private bucket for security
          allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'text/plain',
            'application/vnd.ms-outlook',
            'message/rfc822'
          ],
          fileSizeLimit: 10485760 // 10MB
        });

        if (error) {
          console.error('Error creating storage bucket:', error);
        } else {
          console.log('Storage bucket created successfully');
        }
      }
    } catch (error) {
      console.error('Error initializing storage bucket:', error);
    }
  }

  // Upload file to Supabase Storage
  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    options: {
      caseId?: number;
      contractId?: number;
      category?: string;
      description?: string;
    } = {}
  ): Promise<UploadedFile> {
    try {
      // Generate unique file path
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = path.extname(file.originalname);
      const fileName = `${timestamp}_${randomId}${fileExtension}`;
      
      // Create organized folder structure
      let folderPath = `users/${userId}`;
      if (options.caseId) {
        folderPath += `/cases/${options.caseId}`;
      } else if (options.contractId) {
        folderPath += `/contracts/${options.contractId}`;
      }
      
      const supabasePath = `${folderPath}/${fileName}`;

      // Read file buffer
      const fileBuffer = fs.readFileSync(file.path);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(supabasePath, fileBuffer, {
          contentType: file.mimetype,
          duplex: 'half'
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL (signed URL for private files)
      const { data: urlData } = await supabaseAdmin.storage
        .from(this.bucketName)
        .createSignedUrl(supabasePath, 3600); // 1 hour expiry

      // Save file metadata to database (using correct snake_case field names)
      const { data: documentData, error: dbError } = await supabaseAdmin
        .from('documents')
        .insert({
          user_id: userId,
          caseid: options.caseId || null,
          contractid: options.contractId || null,
          filename: fileName,
          original_name: file.originalname,
          file_path: urlData?.signedUrl || '',
          file_type: 'document',
          file_size: file.size,
          mime_type: file.mimetype,
          category: options.category || 'general',
          description: options.description || file.originalname,
          supabase_url: urlData?.signedUrl || '',
          supabase_path: supabasePath,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabaseAdmin.storage.from(this.bucketName).remove([supabasePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Clean up local temp file
      try {
        fs.unlinkSync(file.path);
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file:', cleanupError);
      }

      return {
        id: documentData.id,
        userId: documentData.user_id,
        caseId: documentData.caseid,
        contractId: documentData.contractid,
        fileName: documentData.filename,
        originalName: documentData.original_name,
        filePath: documentData.file_path,
        fileType: documentData.file_type,
        fileSize: documentData.file_size,
        mimeType: documentData.mime_type,
        category: documentData.category,
        description: documentData.description,
        supabaseUrl: documentData.supabase_url,
        supabasePath: documentData.supabase_path,
        createdAt: documentData.created_at
      };

    } catch (error) {
      // Clean up temp file on error
      try {
        fs.unlinkSync(file.path);
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file on error:', cleanupError);
      }
      throw error;
    }
  }

  // Download file from Supabase Storage
  async downloadFile(documentId: number, userId: string): Promise<{ buffer: Buffer; metadata: UploadedFile }> {
    try {
      // Get document metadata from database
      const { data: documentData, error: dbError } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .eq('user_id', userId) // Ensure user owns the document
        .single();

      if (dbError || !documentData) {
        throw new Error('Document not found or access denied');
      }

      // Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from(this.bucketName)
        .download(documentData.supabase_path);

      if (downloadError) {
        throw new Error(`Download failed: ${downloadError.message}`);
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());

      return {
        buffer,
        metadata: {
          id: documentData.id,
          userId: documentData.user_id,
          caseId: documentData.caseid,
          contractId: documentData.contractid,
          fileName: documentData.filename,
          originalName: documentData.original_name,
          filePath: documentData.file_path,
          fileType: documentData.file_type,
          fileSize: documentData.file_size,
          mimeType: documentData.mime_type,
          category: documentData.category,
          description: documentData.description,
          supabaseUrl: documentData.supabase_url,
          supabasePath: documentData.supabase_path,
          createdAt: documentData.created_at
        }
      };

    } catch (error) {
      throw error;
    }
  }

  // Get signed URL for file access
  async getSignedUrl(documentId: number, userId: string, expiresIn: number = 3600): Promise<string> {
    try {
      // Get document metadata
      const { data: documentData, error: dbError } = await supabaseAdmin
        .from('documents')
        .select('supabase_path')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (dbError || !documentData) {
        throw new Error('Document not found or access denied');
      }

      // Generate signed URL
      const { data: urlData, error: urlError } = await supabaseAdmin.storage
        .from(this.bucketName)
        .createSignedUrl(documentData.supabase_path, expiresIn);

      if (urlError) {
        throw new Error(`URL generation failed: ${urlError.message}`);
      }

      return urlData.signedUrl;

    } catch (error) {
      throw error;
    }
  }

  // Delete file from Supabase Storage
  async deleteFile(documentId: number, userId: string): Promise<boolean> {
    try {
      // Get document metadata
      const { data: documentData, error: dbError } = await supabaseAdmin
        .from('documents')
        .select('supabase_path')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (dbError || !documentData) {
        throw new Error('Document not found or access denied');
      }

      // Delete from Supabase Storage
      const { error: deleteError } = await supabaseAdmin.storage
        .from(this.bucketName)
        .remove([documentData.supabase_path]);

      if (deleteError) {
        console.error('Storage deletion error:', deleteError);
      }

      // Delete from database
      const { error: dbDeleteError } = await supabaseAdmin
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', userId);

      if (dbDeleteError) {
        throw new Error(`Database deletion failed: ${dbDeleteError.message}`);
      }

      return true;

    } catch (error) {
      throw error;
    }
  }

  // List user's documents
  async listUserDocuments(
    userId: string,
    options: {
      caseId?: number;
      contractId?: number;
      category?: string;
    } = {}
  ): Promise<UploadedFile[]> {
    try {
      let query = supabaseAdmin
        .from('documents')
        .select('*')
        .eq('user_id', userId);

      if (options.caseId) {
        query = query.eq('caseid', options.caseId);
      }

      if (options.contractId) {
        query = query.eq('contractid', options.contractId);
      }

      if (options.category) {
        query = query.eq('category', options.category);
      }

      const { data: documents, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      return documents?.map(doc => ({
        id: doc.id,
        userId: doc.user_id,
        caseId: doc.caseid,
        contractId: doc.contractid,
        fileName: doc.filename,
        originalName: doc.original_name,
        filePath: doc.file_path,
        fileType: doc.file_type,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        category: doc.category,
        description: doc.description,
        supabaseUrl: doc.supabase_url,
        supabasePath: doc.supabase_path,
        createdAt: doc.created_at
      })) || [];

    } catch (error) {
      throw error;
    }
  }
}

export const supabaseStorageService = new SupabaseStorageService();