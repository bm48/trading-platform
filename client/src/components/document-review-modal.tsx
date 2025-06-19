import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Send, 
  Save, 
  Edit,
  Eye,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

interface PendingDocument {
  id: number;
  caseId: number;
  caseTitle: string;
  clientName: string;
  type: string;
  status: string;
  aiContent: any;
  intakeData: any;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

interface DocumentReviewModalProps {
  document: PendingDocument | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentReviewModal({ document, isOpen, onClose }: DocumentReviewModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedContent, setEditedContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  // Initialize edited content when document changes
  useState(() => {
    if (document?.aiContent) {
      setEditedContent(JSON.stringify(document.aiContent, null, 2));
    }
  }, [document]);

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, content, status }: { id: number; content?: any; status?: string }) => {
      const response = await apiRequest('PUT', `/api/admin/documents/${id}`, { content, status });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Updated",
        description: "Document has been successfully updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update document",
        variant: "destructive",
      });
    },
  });

  const sendDocumentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/admin/documents/${id}/send`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document Sent",
        description: "Document has been sent to client",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/notifications'] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Send Failed",
        description: "Failed to send document",
        variant: "destructive",
      });
    },
  });

  const handleSaveChanges = () => {
    if (!document) return;
    
    try {
      const parsedContent = JSON.parse(editedContent);
      updateDocumentMutation.mutate({
        id: document.id,
        content: parsedContent,
        status: 'reviewed'
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please check the document content format",
        variant: "destructive",
      });
    }
  };

  const handleSendDocument = () => {
    if (!document) return;
    sendDocumentMutation.mutate(document.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'destructive';
      case 'reviewed': return 'default';
      case 'sent': return 'default';
      default: return 'secondary';
    }
  };

  if (!document) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Review: {document.caseTitle}
              </DialogTitle>
              <DialogDescription>
                Review and edit AI-generated document before sending to client
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusColor(document.status)}>
                {document.status}
              </Badge>
              <Badge variant="outline">
                {document.type.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="content" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">
              <FileText className="w-4 h-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="metadata">
              <Eye className="w-4 h-4 mr-2" />
              Metadata
            </TabsTrigger>
            <TabsTrigger value="client-data">
              <Edit className="w-4 h-4 mr-2" />
              Client Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Document Content</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {isEditing ? 'View Mode' : 'Edit Mode'}
                </Button>
                {isEditing && (
                  <Button
                    size="sm"
                    onClick={handleSaveChanges}
                    disabled={updateDocumentMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save Changes
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="h-96 border rounded-md">
              {isEditing ? (
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-96 font-mono text-sm border-0 resize-none"
                  placeholder="Edit document content (JSON format)"
                />
              ) : (
                <div className="p-4 space-y-4">
                  {document.aiContent?.legalAnalysis && (
                    <div>
                      <h4 className="font-semibold mb-2">Legal Analysis</h4>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {document.aiContent.legalAnalysis}
                      </p>
                    </div>
                  )}
                  
                  {document.aiContent?.recommendedActions && (
                    <div>
                      <h4 className="font-semibold mb-2">Recommended Actions</h4>
                      <div className="space-y-2">
                        {document.aiContent.recommendedActions.map((action: any, index: number) => (
                          <div key={index} className="border-l-2 border-blue-200 pl-3">
                            <p className="font-medium text-sm">{action.action}</p>
                            <p className="text-xs text-gray-600">{action.description}</p>
                            <p className="text-xs text-blue-600">Timeframe: {action.timeframe}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {document.aiContent?.timeline && (
                    <div>
                      <h4 className="font-semibold mb-2">Timeline</h4>
                      <div className="space-y-2">
                        {document.aiContent.timeline.map((item: any, index: number) => (
                          <div key={index} className="flex items-start gap-2 text-sm">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                            <div>
                              <p className="font-medium">{item.date}: {item.milestone}</p>
                              <p className="text-gray-600">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Document ID</Label>
                    <p className="text-sm text-gray-600">{document.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Case ID</Label>
                    <p className="text-sm text-gray-600">{document.caseId}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Client Name</Label>
                    <p className="text-sm text-gray-600">{document.clientName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Document Type</Label>
                    <p className="text-sm text-gray-600">{document.type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created</Label>
                    <p className="text-sm text-gray-600">
                      {format(new Date(document.createdAt), 'PPp')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <Badge variant={getStatusColor(document.status)}>
                      {document.status}
                    </Badge>
                  </div>
                </div>

                {document.reviewedBy && (
                  <div className="pt-4 border-t">
                    <Label className="text-sm font-medium">Review Information</Label>
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-gray-600">
                        Reviewed by: {document.reviewedBy}
                      </p>
                      {document.reviewedAt && (
                        <p className="text-sm text-gray-600">
                          Reviewed at: {format(new Date(document.reviewedAt), 'PPp')}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="client-data" className="space-y-4">
            <Label className="text-sm font-medium">Original Intake Data</Label>
            <ScrollArea className="h-96 border rounded-md">
              <pre className="p-4 text-sm font-mono">
                {JSON.stringify(document.intakeData, null, 2)}
              </pre>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {document.status === 'draft' && (
              <>
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Requires review before sending
              </>
            )}
            {document.status === 'reviewed' && (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Ready to send to client
              </>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            
            {document.status === 'reviewed' && (
              <Button
                onClick={handleSendDocument}
                disabled={sendDocumentMutation.isPending}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Send to Client
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}