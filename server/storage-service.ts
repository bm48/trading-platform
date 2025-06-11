import { createClient } from '@supabase/supabase-js';
import { Request } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// File upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

export interface FileUploadResult {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  url: string;
  bucket: string;
}

export interface StorageFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  url: string;
  bucket: string;
  uploadedBy: string;
  uploadedAt: Date;
  caseId?: number;
  contractId?: number;
  category: 'pdf' | 'contract' | 'photo' | 'document' | 'timeline';
}

// Storage buckets for different file types
export const STORAGE_BUCKETS = {
  CASE_FILES: 'case-files',
  CONTRACTS: 'contracts', 
  PHOTOS: 'photos',
  DOCUMENTS: 'documents',
  TIMELINES: 'timelines'
} as const;

export class StorageService {
  // Upload file to specific bucket
  async uploadFile(
    file: Express.Multer.File,
    bucket: string,
    userId: string,
    metadata: {
      caseId?: number;
      contractId?: number;
      category: StorageFile['category'];
    }
  ): Promise<FileUploadResult> {
    const fileId = uuidv4();
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${fileId}.${fileExtension}`;
    const filePath = `${userId}/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        metadata: {
          userId,
          originalName: file.originalname,
          ...metadata
        }
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    // Store file metadata in database
    await this.saveFileMetadata({
      id: fileId,
      name: file.originalname,
      path: filePath,
      size: file.size,
      mimeType: file.mimetype,
      url: urlData.publicUrl,
      bucket,
      uploadedBy: userId,
      uploadedAt: new Date(),
      ...metadata
    });

    return {
      id: fileId,
      fileName: file.originalname,
      filePath: data.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      url: urlData.publicUrl,
      bucket
    };
  }

  // Save file metadata to database
  private async saveFileMetadata(fileData: StorageFile): Promise<void> {
    const { error } = await supabase
      .from('file_storage')
      .insert(fileData);

    if (error) {
      throw new Error(`Failed to save file metadata: ${error.message}`);
    }
  }

  // Get files by case ID
  async getCaseFiles(caseId: number): Promise<StorageFile[]> {
    const { data, error } = await supabase
      .from('file_storage')
      .select('*')
      .eq('caseId', caseId)
      .order('uploadedAt', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch case files: ${error.message}`);
    }

    return data || [];
  }

  // Get files by contract ID
  async getContractFiles(contractId: number): Promise<StorageFile[]> {
    const { data, error } = await supabase
      .from('file_storage')
      .select('*')
      .eq('contractId', contractId)
      .order('uploadedAt', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch contract files: ${error.message}`);
    }

    return data || [];
  }

  // Get files by user
  async getUserFiles(userId: string, category?: StorageFile['category']): Promise<StorageFile[]> {
    let query = supabase
      .from('file_storage')
      .select('*')
      .eq('uploadedBy', userId);

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('uploadedAt', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user files: ${error.message}`);
    }

    return data || [];
  }

  // Delete file
  async deleteFile(fileId: string, userId: string): Promise<void> {
    // Get file metadata
    const { data: fileData, error: fetchError } = await supabase
      .from('file_storage')
      .select('*')
      .eq('id', fileId)
      .eq('uploadedBy', userId)
      .single();

    if (fetchError || !fileData) {
      throw new Error('File not found or access denied');
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(fileData.bucket)
      .remove([fileData.path]);

    if (storageError) {
      throw new Error(`Failed to delete file from storage: ${storageError.message}`);
    }

    // Delete metadata
    const { error: dbError } = await supabase
      .from('file_storage')
      .delete()
      .eq('id', fileId);

    if (dbError) {
      throw new Error(`Failed to delete file metadata: ${dbError.message}`);
    }
  }

  // Get signed URL for private files
  async getSignedUrl(filePath: string, bucket: string, expiresIn: number = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  // Upload case PDF
  async uploadCasePDF(
    file: Express.Multer.File,
    userId: string,
    caseId: number
  ): Promise<FileUploadResult> {
    return this.uploadFile(file, STORAGE_BUCKETS.CASE_FILES, userId, {
      caseId,
      category: 'pdf'
    });
  }

  // Upload contract version
  async uploadContract(
    file: Express.Multer.File,
    userId: string,
    contractId: number
  ): Promise<FileUploadResult> {
    return this.uploadFile(file, STORAGE_BUCKETS.CONTRACTS, userId, {
      contractId,
      category: 'contract'
    });
  }

  // Upload photo
  async uploadPhoto(
    file: Express.Multer.File,
    userId: string,
    caseId?: number
  ): Promise<FileUploadResult> {
    return this.uploadFile(file, STORAGE_BUCKETS.PHOTOS, userId, {
      caseId,
      category: 'photo'
    });
  }

  // Upload document
  async uploadDocument(
    file: Express.Multer.File,
    userId: string,
    caseId?: number,
    contractId?: number
  ): Promise<FileUploadResult> {
    return this.uploadFile(file, STORAGE_BUCKETS.DOCUMENTS, userId, {
      caseId,
      contractId,
      category: 'document'
    });
  }
}

export const storageService = new StorageService();
export { upload };