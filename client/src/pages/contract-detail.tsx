import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/dashboard-layout';
import DocumentPreview from '@/components/document-preview';
import EnhancedFileUpload from '@/components/enhanced-file-upload';
import { 
  FileText, 
  Calendar, 
  Clock, 
  DollarSign, 
  User, 
  Building,
  Target,
  Plus,
  MessageSquare,
  Upload,
  AlertCircle,
  CheckCircle,
  Download
} from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor, calculateProgress } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function ContractDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [newNote, setNewNote] = useState('');

  const { data: contractData, isLoading } = useQuery<any>({
    queryKey: ['/api/contracts', id],
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery<any[]>({
    queryKey: ['/api/documents/contract', id],
    queryFn: async () => {
      const response = await fetch(`/api/documents/contract/${id}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
    enabled: !!id,
  });

  const { data: timeline = [] } = useQuery<any[]>({
    queryKey: ['/api/timeline/contract', id],
    enabled: !!id,
  });

  const addNote = useMutation({
    mutationFn: async (note: string) => {
      const response = await fetch('/api/timeline/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contractId: parseInt(id!),
          eventType: 'note_added',
          title: 'Note Added',
          description: note,
          eventDate: new Date().toISOString(),
          isCompleted: true,
        }),
      });
      if (!response.ok) throw new Error('Failed to add note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/timeline/contract', id] });
      setNewNote('');
      toast({
        title: "Note Added",
        description: "Your note has been added to the contract timeline.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/documents/contract', id] });
    toast({
      title: "File Uploaded",
      description: "Your document has been added to the contract.",
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!contractData) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-dark mb-2">Contract not found</h3>
            <p className="text-neutral-medium">This contract doesn't exist or you don't have access to it.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const progress = calculateProgress(contractData);
  const analysis = contractData.ai_analysis || contractData.aiAnalysis;
  const strategy = contractData.strategy_pack || contractData.strategyPack;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-dark">{contractData.title}</h1>
            <p className="text-neutral-medium">{contractData.contract_number || contractData.contractNumber}</p>
          </div>
          <Badge className={getStatusColor(contractData.status)}>
            {contractData.status}
          </Badge>
        </div>

        {/* Contract Overview Card */}
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-neutral-medium">Contract Value</p>
                  <p className="font-semibold text-neutral-dark">
                    {contractData.value ? formatCurrency(contractData.value) : 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-medium">Created</p>
                  <p className="font-semibold text-neutral-dark">{formatDate(contractData.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-medium">Last Updated</p>
                  <p className="font-semibold text-neutral-dark">{formatDate(contractData.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-neutral-medium mb-2">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Next Action */}
            {contractData.nextAction && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-semibold text-neutral-dark mb-2 flex items-center">
                  <Target className="h-4 w-4 text-primary mr-2" />
                  Next Action Required
                </h5>
                <p className="text-sm text-neutral-dark mb-2">{contractData.nextAction}</p>
                {contractData.nextActionDue && (
                  <div className="flex items-center text-sm text-neutral-medium">
                    <Calendar className="h-4 w-4 mr-2" />
                    Due: {formatDate(contractData.nextActionDue)}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="strategy">Strategy</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Contract Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Contract Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-neutral-dark mb-2">Description</h4>
                    <p className="text-sm text-neutral-medium">{contractData.description}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-neutral-dark mb-2">Contract Type</h4>
                    <p className="text-sm text-neutral-medium">{contractData.contract_type || contractData.contractType || 'Not specified'}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-neutral-dark mb-2">Party Details</h4>
                    <p className="text-sm text-neutral-medium">{contractData.party_details || contractData.partyDetails || 'Not specified'}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-neutral-dark mb-2">Terms</h4>
                    <p className="text-sm text-neutral-medium">{contractData.terms || 'Not specified'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {Array.isArray(timeline) && timeline.length > 0 ? (
                    timeline.slice(0, 5).map((event: any) => (
                      <div key={event.id} className="flex items-start space-x-3 mb-4 last:mb-0">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          event.isCompleted ? 'bg-success' : 'bg-warning'
                        }`} />
                        <div className="flex-1">
                          <p className="font-medium text-neutral-dark">{event.title}</p>
                          <p className="text-sm text-neutral-medium">{event.description}</p>
                          <p className="text-xs text-neutral-medium mt-1">{formatDate(event.eventDate)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-neutral-medium">No recent activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            {analysis ? (
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contract Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: analysis.legal_analysis || analysis.legalAnalysis || 'No analysis available' }} />
                    </div>
                  </CardContent>
                </Card>

                {analysis.risk_assessment && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Risk Assessment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Success Probability</h4>
                          <div className="flex items-center gap-3">
                            <Progress value={analysis.risk_assessment.success_probability || 0} className="flex-1" />
                            <span className="text-sm font-medium">{analysis.risk_assessment.success_probability || 0}%</span>
                          </div>
                        </div>
                        
                        {analysis.risk_assessment.risks && (
                          <div>
                            <h4 className="font-medium mb-2">Identified Risks</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {analysis.risk_assessment.risks.map((risk: string, index: number) => (
                                <li key={index} className="text-sm text-neutral-medium">{risk}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <AlertCircle className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-dark mb-2">No Analysis Available</h3>
                  <p className="text-neutral-medium mb-4">AI analysis has not been generated for this contract yet.</p>
                  <Button>Generate Analysis</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Strategy Tab */}
          <TabsContent value="strategy" className="space-y-6">
            {strategy ? (
              <Card>
                <CardHeader>
                  <CardTitle>Contract Strategy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: strategy.content || 'No strategy available' }} />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-dark mb-2">No Strategy Pack</h3>
                  <p className="text-neutral-medium mb-4">A strategy pack has not been generated for this contract yet.</p>
                  <Button>Generate Strategy Pack</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Upload Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Upload Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <EnhancedFileUpload
                    contractId={parseInt(id!)}
                    onUploadSuccess={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx"
                    maxSize={10485760}
                    multiple={true}
                    category="contract_document"
                  />
                </CardContent>
              </Card>

              {/* Document List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Contract Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.length > 0 ? (
                    <div className="space-y-3">
                      {documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-neutral-medium" />
                            <div>
                              <p className="font-medium text-neutral-dark">{doc.fileName || doc.filename}</p>
                              <p className="text-sm text-neutral-medium">
                                {doc.fileSize ? `${Math.round(doc.fileSize / 1024)}KB` : 'Unknown size'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <DocumentPreview document={doc} />
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
                      <p className="text-neutral-medium">No documents uploaded yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Contract Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {(timeline || []).map((event: any) => (
                      <div key={event.id} className="flex items-start space-x-3">
                        <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                          event.isCompleted ? 'bg-success' : 'bg-warning'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-neutral-dark">{event.title}</h5>
                            <span className="text-xs text-neutral-medium">{formatDate(event.eventDate)}</span>
                          </div>
                          <p className="text-sm text-neutral-medium">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Add Note */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Add Note
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Add a note to your contract timeline..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={4}
                  />
                  <Button 
                    onClick={() => addNote.mutate(newNote)}
                    disabled={!newNote.trim() || addNote.isPending}
                    className="w-full"
                  >
                    {addNote.isPending ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                        Adding Note...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Note
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}