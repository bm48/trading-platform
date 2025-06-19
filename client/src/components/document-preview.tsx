import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface DocumentPreviewProps {
  document: {
    id: number;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
  };
  trigger?: React.ReactNode;
}

export default function DocumentPreview({ document, trigger }: DocumentPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getFileExtension = (fileName: string) => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  };

  const isImageFile = (fileName: string) => {
    const ext = getFileExtension(fileName);
    return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext);
  };

  const isPdfFile = (fileName: string) => {
    const ext = getFileExtension(fileName);
    return ext === 'pdf';
  };

  const isPreviewable = (fileName: string) => {
    return isImageFile(fileName) || isPdfFile(fileName);
  };

  const handlePreview = async () => {
    setIsLoading(true);
    try {
      // Get auth token for authenticated request
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to preview documents",
          variant: "destructive",
        });
        return;
      }

      // Create authenticated URL for preview
      const previewUrl = `/api/documents/${document.id}/download?token=${encodeURIComponent(token)}`;
      window.open(previewUrl, '_blank');
    } catch (error) {
      toast({
        title: "Preview Failed",
        description: "Could not open document preview",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      // Get auth token for authenticated download
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to download documents",
          variant: "destructive",
        });
        return;
      }

      // Create authenticated download request
      const response = await fetch(`/api/documents/${document.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.fileName;
      window.document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(link);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download document",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = getFileExtension(fileName);
    switch (ext) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'doc':
      case 'docx':
        return '📝';
      case 'txt':
        return '📄';
      default:
        return '📎';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Eye className="w-4 h-4" />
            Preview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{getFileIcon(document.fileName)}</div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {document.fileName}
                </DialogTitle>
                <p className="text-sm text-gray-500">
                  {formatFileSize(document.fileSize)} • {getFileExtension(document.fileName).toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                disabled={isLoading || !isPreviewable(document.fileName)}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                {isLoading ? 'Opening...' : 'Open in New Tab'}
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50">
          {isPreviewable(document.fileName) ? (
            <div className="w-full h-full flex items-center justify-center">
              {isImageFile(document.fileName) ? (
                <AuthenticatedImage 
                  documentId={document.id}
                  fileName={document.fileName}
                  className="max-w-full max-h-full object-contain"
                />
              ) : isPdfFile(document.fileName) ? (
                <AuthenticatedPdf 
                  documentId={document.id}
                  fileName={document.fileName}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <div className="text-6xl mb-4">{getFileIcon(document.fileName)}</div>
                  <p>Preview not available for this file type</p>
                  <p className="text-sm mt-2">Use "Open in New Tab" to view the document</p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8 text-center text-gray-500">
              <div>
                <div className="text-6xl mb-4">{getFileIcon(document.fileName)}</div>
                <p>Preview not available for this file type</p>
                <p className="text-sm mt-2">Use the download button to access the file</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for authenticated image display
function AuthenticatedImage({ documentId, fileName, className }: { documentId: number; fileName: string; className?: string }) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        if (!token) {
          setError(true);
          return;
        }

        const response = await fetch(`/api/documents/${documentId}/download?preview=true`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to load image');
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setImageSrc(url);
      } catch (err) {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();

    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [documentId]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📷</div>
          <p>Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={fileName}
      className={className}
    />
  );
}

// Helper component for authenticated PDF display
function AuthenticatedPdf({ documentId, fileName }: { documentId: number; fileName: string }) {
  const [pdfSrc, setPdfSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        if (!token) {
          setError(true);
          return;
        }

        const response = await fetch(`/api/documents/${documentId}/download?preview=true`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to load PDF');
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfSrc(url);
      } catch (err) {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (pdfSrc) {
        URL.revokeObjectURL(pdfSrc);
      }
    };
  }, [documentId]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !pdfSrc) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📄</div>
          <p>Failed to load PDF</p>
          <p className="text-sm mt-2">Try using "Open in New Tab"</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={pdfSrc}
      className="w-full h-full border-0"
      title={fileName}
    />
  );
}