import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onUploadSuccess?: () => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  additionalData?: Record<string, any>;
  className?: string;
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export default function FileUpload({
  onUploadSuccess,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = true,
  additionalData = {},
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, additionalData }: { file: File; additionalData: Record<string, any> }) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add additional data to the form
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Upload failed');
      }

      return response.json();
    },
  });

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`;
    }

    // Check file type
    const allowedTypes = accept.split(',').map(type => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      return `File type not allowed. Accepted types: ${accept}`;
    }

    return null;
  };

  const handleFiles = (fileList: FileList) => {
    const newFiles: UploadFile[] = [];
    
    Array.from(fileList).forEach((file) => {
      const error = validateFile(file);
      const uploadFile: UploadFile = {
        file,
        id: `${Date.now()}-${Math.random()}`,
        status: error ? 'error' : 'pending',
        progress: 0,
        error,
      };
      newFiles.push(uploadFile);
    });

    if (!multiple) {
      setFiles(newFiles.slice(0, 1));
    } else {
      setFiles(prev => [...prev, ...newFiles]);
    }

    // Auto-upload valid files
    newFiles.forEach((uploadFile) => {
      if (uploadFile.status === 'pending') {
        uploadFile.status = 'uploading';
        setFiles(prev => prev.map(f => f.id === uploadFile.id ? uploadFile : f));
        
        uploadMutation.mutate(
          { file: uploadFile.file, additionalData },
          {
            onSuccess: () => {
              setFiles(prev => prev.map(f => 
                f.id === uploadFile.id 
                  ? { ...f, status: 'success', progress: 100 }
                  : f
              ));
              onUploadSuccess?.();
              toast({
                title: "Upload Successful",
                description: `${uploadFile.file.name} has been uploaded.`,
              });
            },
            onError: (error: any) => {
              setFiles(prev => prev.map(f => 
                f.id === uploadFile.id 
                  ? { ...f, status: 'error', error: error.message }
                  : f
              ));
              toast({
                title: "Upload Failed",
                description: error.message,
                variant: "destructive",
              });
            },
          }
        );
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearAll = () => {
    setFiles([]);
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (['pdf'].includes(extension || '')) return 'fas fa-file-pdf text-red-500';
    if (['doc', 'docx'].includes(extension || '')) return 'fas fa-file-word text-blue-500';
    if (['jpg', 'jpeg', 'png'].includes(extension || '')) return 'fas fa-file-image text-green-500';
    return 'fas fa-file-alt text-gray-500';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 hover:border-primary hover:bg-gray-50'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className={cn(
          'h-12 w-12 mx-auto mb-4 transition-colors',
          isDragOver ? 'text-primary' : 'text-neutral-medium'
        )} />
        <p className="text-lg font-medium text-neutral-dark mb-2">
          Drop files here or click to upload
        </p>
        <p className="text-sm text-neutral-medium mb-4">
          {accept.split(',').join(', ')} up to {Math.round(maxSize / (1024 * 1024))}MB
        </p>
        <Button variant="outline" size="sm" type="button">
          Choose Files
        </Button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
        className="hidden"
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-neutral-dark">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </h4>
            {files.length > 1 && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {files.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className="flex items-center p-3 border border-gray-200 rounded-lg bg-white"
              >
                <i className={`${getFileIcon(uploadFile.file.name)} text-lg mr-3`} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-neutral-dark truncate">
                      {uploadFile.file.name}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-medium">
                      {formatFileSize(uploadFile.file.size)}
                    </span>
                    
                    <div className="flex items-center">
                      {uploadFile.status === 'uploading' && (
                        <div className="flex items-center text-xs text-primary">
                          <div className="animate-spin w-3 h-3 border border-primary border-t-transparent rounded-full mr-1" />
                          Uploading...
                        </div>
                      )}
                      
                      {uploadFile.status === 'success' && (
                        <div className="flex items-center text-xs text-success">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Uploaded
                        </div>
                      )}
                      
                      {uploadFile.status === 'error' && (
                        <div className="flex items-center text-xs text-error">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Failed
                        </div>
                      )}
                    </div>
                  </div>

                  {uploadFile.error && (
                    <p className="text-xs text-error mt-1">{uploadFile.error}</p>
                  )}

                  {uploadFile.status === 'uploading' && (
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                      <div 
                        className="bg-primary h-1 rounded-full transition-all duration-300"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
