import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileIcon, ImageIcon, X, Download, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DocumentPreview from '@/components/document-preview';

interface EnhancedFileUploadProps {
  caseId?: number;
  contractId?: number;
  onUploadSuccess?: () => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  category?: string;
  className?: string;
}

interface UploadedFile {
  id: number;
  filename: string;
  originalName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  category: string;
  description?: string;
  createdAt: string;
}

export default function EnhancedFileUpload({
  caseId,
  contractId,
  onUploadSuccess,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  maxSize = 50 * 1024 * 1024, // 50MB
  multiple = false,
  category = "evidence",
  className = ""
}: EnhancedFileUploadProps) {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);
      formData.append('description', `${category} - ${file.name}`);
      
      // Add case or contract ID to form data
      if (caseId) {
        formData.append('case_id', caseId.toString());
      }
      if (contractId) {
        formData.append('contract_id', contractId.toString());
      }

      const endpoint = caseId 
        ? `/api/cases/${caseId}/upload`
        : contractId 
        ? `/api/contracts/${contractId}/upload`
        : `/api/documents/upload`;

      // Get fresh auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.error('Session error:', sessionError);
        throw new Error('Authentication required. Please log in again.');
      }

      console.log('Making upload request to:', endpoint);
      console.log('Auth token present:', !!session.access_token);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If we can't parse JSON, it might be an HTML error page
          const text = await response.text();
          if (text.includes('<!DOCTYPE')) {
            errorMessage = 'Authentication error - please refresh and try again';
          }
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (data) => {
      setUploadedFiles(prev => [...prev, data]);
      toast({
        title: "File Uploaded Successfully",
        description: `${data.originalName} has been uploaded.`,
      });
      onUploadSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const fileArray = Array.from(selectedFiles);
    const validFiles = fileArray.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than ${maxSize / (1024 * 1024)}MB`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (multiple) {
      setFiles(prev => [...prev, ...validFiles]);
    } else {
      setFiles(validFiles.slice(0, 1));
    }
  };

  const handleUpload = async () => {
    for (const file of files) {
      await uploadMutation.mutateAsync(file);
    }
    setFiles([]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const downloadFile = (fileId: number) => {
    window.open(`/api/documents/${fileId}/download`, '_blank');
  };

  const previewFile = (fileId: number) => {
    window.open(`/api/documents/${fileId}/preview`, '_blank');
  };

  const isImage = (mimeType: string | undefined) => mimeType && mimeType.startsWith('image/');

  return (
    <div className={`space-y-4 ${className} animate-fade-in`}>
      {/* Upload Area */}
      <Card 
        className={`border-2 border-dashed smooth-transition card-hover ${
          dragOver ? 'border-primary bg-primary/5 animate-glow' : 'border-gray-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-6 text-center">
          <Upload className="h-8 w-8 mx-auto mb-4 text-gray-400 animate-bounce-hover" />
          <p className="text-sm text-gray-600 mb-4">
            Drag and drop files here, or click to browse
          </p>
          <Input
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="file-upload-input"
          />
          <Button 
            variant="outline" 
            onClick={() => document.getElementById('file-upload-input')?.click()}
            className="btn-hover-lift animate-pulse-hover"
          >
            Choose Files
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Supported: {accept} (Max: {Math.round(maxSize / (1024 * 1024))}MB)
          </p>
        </CardContent>
      </Card>

      {/* Selected Files */}
      {files.length > 0 && (
        <Card className="animate-slide-in">
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Selected Files</h4>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-2 bg-gray-50 rounded smooth-transition btn-hover-scale"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center gap-2">
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 animate-bounce-hover" />
                    ) : (
                      <FileIcon className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({Math.round(file.size / 1024)}KB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="btn-hover-scale smooth-transition"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button 
              onClick={handleUpload} 
              disabled={uploadMutation.isPending}
              className="w-full mt-4 btn-hover-lift animate-pulse-hover"
            >
              {uploadMutation.isPending ? 'Uploading...' : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Card className="animate-fade-in">
          <CardContent className="p-4">
            <h4 className="font-medium mb-3">Uploaded Files</h4>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div 
                  key={file.id} 
                  className="flex items-center justify-between p-2 bg-green-50 rounded smooth-transition card-hover"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center gap-2">
                    {isImage(file.mimeType) ? (
                      <ImageIcon className="h-4 w-4 text-green-600 animate-bounce-hover" />
                    ) : (
                      <FileIcon className="h-4 w-4 text-green-600" />
                    )}
                    <span className="text-sm font-medium">{file.originalName}</span>
                    <span className="text-xs text-gray-500">
                      ({Math.round((file.fileSize || 0) / 1024)}KB)
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <DocumentPreview
                      document={{
                        id: file.id,
                        fileName: file.originalName || 'Unknown File',
                        filePath: file.filename || '',
                        fileType: file.fileType || 'application/octet-stream',
                        fileSize: file.fileSize || 0
                      }}
                      trigger={
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(file.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}