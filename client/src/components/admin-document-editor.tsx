import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Edit3, 
  Send, 
  Download, 
  FileText, 
  Mail, 
  Calendar, 
  Eye, 
  CheckCircle, 
  Clock,
  AlertCircle,
  Save
} from 'lucide-react';

interface GeneratedDocument {
  id: number;
  caseId: number;
  type: 'strategy' | 'demand_letter' | 'adjudication_application';
  status: 'draft' | 'reviewed' | 'sent';
  wordDocId: number;
  pdfDocId: number;
  aiContent: any;
  intakeData: any;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  sentAt?: string;
  clientEmail?: string;
}

interface AdminDocumentEditorProps {
  documentId?: number;
  caseId?: number;
}

export default function AdminDocumentEditor({ documentId, caseId }: AdminDocumentEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [emailPreview, setEmailPreview] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Fetch pending documents for review
  const { data: pendingDocs = [], isLoading } = useQuery({
    queryKey: ['/api/admin/pending-documents', caseId],
    enabled: !documentId, // Only fetch list if no specific document ID
  });

  // Fetch specific document if ID provided
  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ['/api/admin/documents', documentId],
    enabled: !!documentId,
  });

  // Update document content mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ docId, content, type }: { docId: number; content: string; type: string }) => {
      return await apiRequest('PUT', `/api/admin/documents/${docId}`, { content, type });
    },
    onSuccess: () => {
      toast({
        title: "Document Updated",
        description: "Changes have been saved successfully",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents'] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not save changes. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Send document mutation
  const sendDocumentMutation = useMutation({
    mutationFn: async ({ docId, emailData }: { docId: number; emailData: any }) => {
      return await apiRequest('POST', `/api/admin/documents/${docId}/send`, emailData);
    },
    onSuccess: () => {
      toast({
        title: "Document Sent",
        description: "Strategy pack has been sent to the client",
      });
      setEmailPreview(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/documents'] });
    },
    onError: () => {
      toast({
        title: "Send Failed",
        description: "Could not send document. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Create calendar event mutation
  const createCalendarEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      return await apiRequest('POST', '/api/calendar/events', eventData);
    },
    onSuccess: () => {
      toast({
        title: "Calendar Event Created",
        description: "Timeline events have been added to the calendar",
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'reviewed': return 'default';
      case 'sent': return 'destructive';
      default: return 'outline';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      'strategy': 'Strategy Pack',
      'demand_letter': 'Demand Letter',
      'adjudication_application': 'Adjudication Application'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const handleEdit = (doc: GeneratedDocument) => {
    setEditedContent(JSON.stringify(doc.aiContent, null, 2));
    setIsEditing(true);
  };

  const handleSaveChanges = (docId: number) => {
    try {
      const parsedContent = JSON.parse(editedContent);
      updateDocumentMutation.mutate({
        docId,
        content: editedContent,
        type: 'ai_content'
      });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please check your JSON syntax",
        variant: "destructive",
      });
    }
  };

  const handleSendDocument = (doc: GeneratedDocument) => {
    const defaultSubject = `Legal Strategy Pack - ${doc.intakeData?.caseTitle || 'Your Case'}`;
    const defaultBody = `Dear ${doc.intakeData?.clientName || 'Client'},

Please find attached your comprehensive legal strategy pack prepared by our AI-powered system and reviewed by our legal team.

This strategy pack includes:
- Detailed legal analysis of your situation
- Step-by-step action plan
- Timeline with key deadlines
- Risk assessment and recommendations
- Downloadable documents and checklists

Please review the documents carefully and contact us if you have any questions.

Best regards,
RESOLVE+ Legal Team`;

    setEmailSubject(defaultSubject);
    setEmailBody(defaultBody);
    setEmailPreview(true);
  };

  const handleCreateCalendarEvents = (doc: GeneratedDocument) => {
    if (doc.aiContent?.timeline) {
      doc.aiContent.timeline.forEach((item: any) => {
        if (item.date && item.type === 'deadline') {
          createCalendarEventMutation.mutate({
            title: item.milestone,
            description: item.description,
            start_time: new Date(item.date).toISOString(),
            end_time: new Date(new Date(item.date).getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
            case_id: doc.caseId,
            location: 'Legal deadline',
          });
        }
      });
    }
  };

  if (isLoading || docLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const docsToShow = documentId ? [document].filter(Boolean) : pendingDocs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Document Review & Management</h2>
          <p className="text-gray-600">Review AI-generated documents before sending to clients</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {docsToShow.length} {docsToShow.length === 1 ? 'Document' : 'Documents'}
        </Badge>
      </div>

      {docsToShow.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No Documents Pending Review</h3>
            <p className="text-gray-600">Generated documents will appear here for review before sending</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {docsToShow.map((doc: GeneratedDocument) => (
            <Card key={doc.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {getTypeLabel(doc.type)}
                    </CardTitle>
                    <CardDescription>
                      Case: {doc.intakeData?.caseTitle || 'Unknown'} • 
                      Client: {doc.intakeData?.clientName || 'Unknown'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(doc.status)}>
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </Badge>
                    {doc.status === 'draft' && (
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                    )}
                    {doc.status === 'sent' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="edit">Edit Content</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="actions">Actions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="preview" className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Legal Analysis</h4>
                      <p className="text-sm text-gray-700">
                        {doc.aiContent?.legalAnalysis || 'No analysis available'}
                      </p>
                    </div>
                    
                    {doc.aiContent?.recommendedActions && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Recommended Actions</h4>
                        <ul className="space-y-2">
                          {doc.aiContent.recommendedActions.slice(0, 3).map((action: any, idx: number) => (
                            <li key={idx} className="text-sm">
                              <span className="font-medium">{action.step}.</span> {action.action}
                            </li>
                          ))}
                          {doc.aiContent.recommendedActions.length > 3 && (
                            <li className="text-sm text-gray-600">
                              + {doc.aiContent.recommendedActions.length - 3} more actions...
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="edit" className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">AI Content (JSON)</h4>
                        <Button
                          size="sm"
                          onClick={() => handleEdit(doc)}
                          disabled={isEditing}
                        >
                          <Edit3 className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="min-h-64 font-mono text-sm"
                            placeholder="Edit the AI-generated content in JSON format..."
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveChanges(doc.id)}
                              disabled={updateDocumentMutation.isPending}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIsEditing(false)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-64">
                          {JSON.stringify(doc.aiContent, null, 2)}
                        </pre>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="timeline" className="space-y-4">
                    {doc.aiContent?.timeline ? (
                      <div className="space-y-3">
                        {doc.aiContent.timeline.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                            <div className={`w-3 h-3 rounded-full mt-2 ${
                              item.type === 'deadline' ? 'bg-red-500' : 
                              item.type === 'action' ? 'bg-blue-500' : 'bg-green-500'
                            }`} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h5 className="font-medium">{item.milestone}</h5>
                                <span className="text-sm text-gray-500">{item.date}</span>
                              </div>
                              <p className="text-sm text-gray-600">{item.description}</p>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {item.type}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateCalendarEvents(doc)}
                          disabled={createCalendarEventMutation.isPending}
                          className="w-full"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Create Calendar Events
                        </Button>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No timeline data available</p>
                    )}
                  </TabsContent>

                  <TabsContent value="actions" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline" className="justify-start">
                        <Download className="w-4 h-4 mr-2" />
                        Download Word
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <FileText className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>

                    <div className="border-t pt-4">
                      <h5 className="font-medium mb-3">Client Communication</h5>
                      <div className="space-y-2">
                        <Dialog open={emailPreview} onOpenChange={setEmailPreview}>
                          <DialogTrigger asChild>
                            <Button 
                              className="w-full justify-start"
                              onClick={() => handleSendDocument(doc)}
                              disabled={doc.status === 'sent'}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              {doc.status === 'sent' ? 'Already Sent' : 'Send to Client'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Send Strategy Pack to Client</DialogTitle>
                              <DialogDescription>
                                Review and customize the email before sending
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Subject</label>
                                <Input
                                  value={emailSubject}
                                  onChange={(e) => setEmailSubject(e.target.value)}
                                  placeholder="Email subject..."
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Message</label>
                                <Textarea
                                  value={emailBody}
                                  onChange={(e) => setEmailBody(e.target.value)}
                                  className="min-h-32"
                                  placeholder="Email body..."
                                />
                              </div>
                            </div>

                            <DialogFooter>
                              <Button variant="outline" onClick={() => setEmailPreview(false)}>
                                Cancel
                              </Button>
                              <Button
                                onClick={() => sendDocumentMutation.mutate({
                                  docId: doc.id,
                                  emailData: {
                                    to: doc.intakeData?.clientEmail,
                                    subject: emailSubject,
                                    body: emailBody,
                                    attachments: [doc.wordDocId, doc.pdfDocId]
                                  }
                                })}
                                disabled={sendDocumentMutation.isPending}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Send Email
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        {doc.sentAt && (
                          <p className="text-sm text-gray-600">
                            Sent on {new Date(doc.sentAt).toLocaleDateString()} at{' '}
                            {new Date(doc.sentAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}