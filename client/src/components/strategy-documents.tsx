import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Calendar, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StrategyDocument {
  id: number;
  filename: string;
  original_name: string;
  file_type: string;
  storage_path: string;
  category: string;
  description: string;
  uploaded_at: string;
  metadata?: {
    ai_document_id?: number;
    generated_by?: string;
    admin_approved?: boolean;
    approved_by?: string;
    approved_at?: string;
  };
}

interface StrategyDocumentsProps {
  caseId: number;
}

export default function StrategyDocuments({ caseId }: StrategyDocumentsProps) {
  const { toast } = useToast();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/documents/strategy', caseId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/documents/strategy/${caseId}`);
      return response.json() as Promise<StrategyDocument[]>;
    }
  });

  const handleDownload = async (doc: StrategyDocument) => {
    try {
      const response = await apiRequest('GET', `/api/documents/download/${doc.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();
      
      if (data.downloadUrl) {
        // Use the Supabase URL for direct download
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = data.downloadUrl;
        a.download = data.filename || doc.original_name;
        a.target = '_blank'; // Open in new tab as fallback
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast({
          title: "Download Started",
          description: `${data.filename || doc.original_name} is downloading`,
        });
      } else {
        throw new Error('No download URL provided');
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download document. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Strategy Documents Yet</h3>
        <p className="text-gray-500">
          AI-generated strategy documents will appear here once they're approved by our legal team.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((document) => (
        <div 
          key={document.id} 
          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <h4 className="font-medium text-gray-900">{document.original_name}</h4>
              {document.metadata?.admin_approved && (
                <Badge className="bg-green-100 text-green-800">
                  Approved
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-2">{document.description}</p>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(document.uploaded_at).toLocaleDateString()}
              </div>
              {document.metadata?.approved_by && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Approved by {document.metadata.approved_by}
                </div>
              )}
            </div>
          </div>
          
          <Button
            size="sm"
            onClick={() => handleDownload(document)}
            className="ml-4"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      ))}
    </div>
  );
}