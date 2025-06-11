import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Image, X, Download } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface FileUploadProps {
  caseId?: number;
  contractId?: number;
  category?: 'pdf' | 'contract' | 'photo' | 'document' | 'timeline';
  accept?: string;
  maxSize?: number; // in MB
  onUploadComplete?: (file: any) => void;
  className?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  url: string;
  uploadedAt: Date;
}

export default function FileUpload({
  caseId,
  contractId,
  category = 'document',
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif',
  maxSize = 50,
  onUploadComplete,
  className = ''
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      if (caseId) formData.append('caseId', caseId.toString());
      if (contractId) formData.append('contractId', contractId.toString());
      formData.append('category', category);

      // Determine the upload endpoint based on category
      let endpoint = '/api/upload';
      switch (category) {
        case 'pdf':
          endpoint = '/api/upload/case-pdf';
          break;
        case 'contract':
          endpoint = '/api/upload/contract';
          break;
        case 'photo':
          endpoint = '/api/upload/photo';
          break;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: `${selectedFile?.name} has been uploaded successfully.`,
      });
      
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Invalidate relevant queries
      if (caseId) {
        queryClient.invalidateQueries({ queryKey: ['/api/files/case', caseId] });
      }
      if (contractId) {
        queryClient.invalidateQueries({ queryKey: ['/api/files/contract', contractId] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/files/user'] });

      onUploadComplete?.(data.file);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (file: File) => {
    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: `File size must be less than ${maxSize}MB`,
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const allowedTypes = accept.split(',').map(type => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const isValidType = allowedTypes.some(type => 
      type === fileExtension || file.type.startsWith(type.replace('.*', ''))
    );

    if (!isValidType) {
      toast({
        title: "Invalid File Type",
        description: `Please select a file with one of these extensions: ${accept}`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="h-6 w-6 text-blue-500" />;
    }
    return <FileText className="h-6 w-6 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload {category === 'pdf' ? 'PDF Document' : 
                 category === 'photo' ? 'Photo' : 
                 category === 'contract' ? 'Contract' : 'File'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={triggerFileSelect}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              Drop your file here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supported formats: {accept}
            </p>
            <p className="text-xs text-gray-400">
              Maximum file size: {maxSize}MB
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getFileIcon(selectedFile)}
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                disabled={uploadMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {uploadMutation.isPending && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="w-full" />
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="flex-1"
              >
                {uploadMutation.isPending ? 'Uploading...' : 'Upload File'}
              </Button>
              <Button 
                variant="outline" 
                onClick={clearFile}
                disabled={uploadMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// File List Component for displaying uploaded files
interface FileListProps {
  caseId?: number;
  contractId?: number;
  category?: string;
  className?: string;
}

export function FileList({ caseId, contractId, category, className = '' }: FileListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine the query endpoint
  let queryKey: string[];
  if (caseId) {
    queryKey = ['/api/files/case', caseId.toString()];
  } else if (contractId) {
    queryKey = ['/api/files/contract', contractId.toString()];
  } else {
    queryKey = ['/api/files/user', category].filter(Boolean);
  }

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest('DELETE', `/api/files/${fileId}`);
    },
    onSuccess: () => {
      toast({
        title: "File Deleted",
        description: "The file has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadFile = async (fileId: string, fileName: string) => {
    try {
      const response = await apiRequest('GET', `/api/files/${fileId}/download`);
      const data = await response.json();
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = data.url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the file.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Uploaded Files</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-500 py-8">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>File list functionality will be implemented once authentication is working properly</p>
        </div>
      </CardContent>
    </Card>
  );
}