import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export class SupabaseStorageClient {
  private bucketName = 'documents';

  // Upload file to Supabase Storage via API
  async uploadFile(
    file: File,
    options: {
      caseId?: number;
      contractId?: number;
      category?: string;
      description?: string;
    } = {}
  ): Promise<UploadedFile> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional data to the form
    if (options.category) {
      formData.append('category', options.category);
    }
    if (options.description) {
      formData.append('description', options.description);
    }

    // Determine upload endpoint based on context
    let endpoint = '/api/documents/upload';
    if (options.caseId) {
      endpoint = `/api/cases/${options.caseId}/upload`;
    } else if (options.contractId) {
      endpoint = `/api/contracts/${options.contractId}/upload`;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    const result = await response.json();
    return result.document;
  }

  // Get signed URL for file download
  async getFileUrl(documentId: number): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`/api/documents/${documentId}/download?preview=true`, {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get file URL');
    }

    return response.url;
  }

  // Download file
  async downloadFile(documentId: number, preview: boolean = false): Promise<Blob> {
    const { data: { session } } = await supabase.auth.getSession();
    
    const url = preview 
      ? `/api/documents/${documentId}/download?preview=true`
      : `/api/documents/${documentId}/download`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    return response.blob();
  }

  // List user's documents
  async listDocuments(options: {
    caseId?: number;
    contractId?: number;
    category?: string;
  } = {}): Promise<UploadedFile[]> {
    const { data: { session } } = await supabase.auth.getSession();
    
    let endpoint = '/api/documents';
    const params = new URLSearchParams();
    
    if (options.caseId) {
      endpoint = `/api/cases/${options.caseId}/documents`;
    } else if (options.contractId) {
      endpoint = `/api/contracts/${options.contractId}/documents`;
    }
    
    if (options.category) {
      params.append('category', options.category);
    }

    const url = params.toString() ? `${endpoint}?${params}` : endpoint;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }

    return response.json();
  }

  // Delete file
  async deleteFile(documentId: number): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`/api/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  }

  // Get file metadata
  async getFileMetadata(documentId: number): Promise<UploadedFile> {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`/api/documents/${documentId}`, {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get file metadata');
    }

    return response.json();
  }

  // Check if file exists in storage
  async fileExists(documentId: number): Promise<boolean> {
    try {
      await this.getFileMetadata(documentId);
      return true;
    } catch {
      return false;
    }
  }

  // Get file size
  async getFileSize(documentId: number): Promise<number> {
    const metadata = await this.getFileMetadata(documentId);
    return metadata.fileSize;
  }

  // Validate file before upload
  validateFile(file: File, options: {
    maxSize?: number;
    allowedTypes?: string[];
  } = {}): { valid: boolean; error?: string } {
    const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
    const allowedTypes = options.allowedTypes || [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain'
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
      };
    }

    return { valid: true };
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file icon based on file type
  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'fas fa-file-pdf text-red-500';
      case 'doc':
      case 'docx':
        return 'fas fa-file-word text-blue-500';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'fas fa-file-image text-green-500';
      case 'txt':
        return 'fas fa-file-alt text-gray-500';
      case 'eml':
      case 'msg':
        return 'fas fa-envelope text-purple-500';
      default:
        return 'fas fa-file text-gray-400';
    }
  }
}

export const supabaseStorageClient = new SupabaseStorageClient();