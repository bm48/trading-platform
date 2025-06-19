import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, Download, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
      // Open the document in a new tab for preview
      const previewUrl = `/api/documents/${document.id}/download`;
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
      const downloadUrl = `/api/documents/${document.id}/download`;
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = document.fileName;
      window.document.body.appendChild(link);
      link.click();
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
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2"
            disabled={!isPreviewable(document.fileName)}
          >
            <Eye className="w-4 h-4" />
            Preview
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full h-[80vh]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getFileIcon(document.fileName)}</span>
            <div>
              <DialogTitle className="text-left">{document.fileName}</DialogTitle>
              <p className="text-sm text-gray-600">
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
        </DialogHeader>
        
        <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50">
          {isPreviewable(document.fileName) ? (
            <div className="w-full h-full flex items-center justify-center">
              {isImageFile(document.fileName) ? (
                <img
                  src={`/api/documents/${document.id}/download`}
                  alt={document.fileName}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="text-center text-gray-500">
                          <p>Preview not available</p>
                          <p class="text-sm">Click "Open in New Tab" to view the file</p>
                        </div>
                      `;
                    }
                  }}
                />
              ) : isPdfFile(document.fileName) ? (
                <iframe
                  src={`/api/documents/${document.id}/download`}
                  className="w-full h-full border-0"
                  title={document.fileName}
                />
              ) : (
                <div className="text-center text-gray-500 p-8">
                  <p>Preview not available for this file type</p>
                  <p className="text-sm mt-2">Click "Open in New Tab" to view the file</p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              <div className="text-center p-8">
                <div className="text-6xl mb-4">{getFileIcon(document.fileName)}</div>
                <p className="text-lg font-medium">{document.fileName}</p>
                <p className="text-sm mt-2">Preview not available for this file type</p>
                <p className="text-sm">Use the download button to access the file</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}