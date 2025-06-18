import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/dashboard-layout';
import EnhancedFileUpload from '@/components/enhanced-file-upload';
import { 
  formatCurrency, 
  formatDate, 
  getStatusColor, 
  calculateProgress,
  getFileIcon,
  getPriorityColor 
} from '@/lib/utils';
import {
  FolderOpen,
  FileText,
  Calendar,
  Clock,
  Download,
  Plus,
  CheckCircle,
  AlertCircle,
  Target,
  Scale,
  Briefcase,
  MessageSquare,
  Upload
} from 'lucide-react';

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [newNote, setNewNote] = useState('');

  const { data: caseData, isLoading } = useQuery({
    queryKey: ['/api/cases', id],
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['/api/documents/case', id],
    enabled: !!id,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ['/api/timeline/case', id],
    enabled: !!id,
  });

  const addNote = useMutation({
    mutationFn: async (note: string) => {
      // This would create a timeline event for the note
      const response = await fetch('/api/timeline/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          caseId: parseInt(id!),
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
      queryClient.invalidateQueries({ queryKey: ['/api/timeline/case', id] });
      setNewNote('');
      toast({
        title: "Note Added",
        description: "Your note has been added to the case timeline.",
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
    queryClient.invalidateQueries({ queryKey: ['/api/documents/case', id] });
    toast({
      title: "File Uploaded",
      description: "Your document has been added to the case.",
    });
  };

  const downloadDocument = async (documentId: number, filename: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download the document. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (!caseData) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-dark mb-2">Case not found</h3>
            <p className="text-neutral-medium">This case doesn't exist or you don't have access to it.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const progress = calculateProgress(caseData);
  const analysis = caseData.aiAnalysis;
  const strategy = caseData.strategyPack;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Case Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-neutral-dark">{caseData.title}</h1>
                <Badge className={getStatusColor(caseData.status)}>
                  {caseData.status}
                </Badge>
              </div>
              {caseData.amount && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-accent">
                    {formatCurrency(caseData.amount)}
                  </div>
                  <div className="text-sm text-neutral-medium">Amount claimed</div>
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-neutral-medium">Case Number</p>
                <p className="font-semibold text-neutral-dark">{caseData.caseNumber}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-medium">Issue Type</p>
                <p className="font-semibold text-neutral-dark">{caseData.issueType}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-medium">Created</p>
                <p className="font-semibold text-neutral-dark">{formatDate(caseData.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-medium">Last Updated</p>
                <p className="font-semibold text-neutral-dark">{formatDate(caseData.updatedAt)}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-neutral-medium mb-2">
                <span>Case Progress</span>
                <span>{progress}% Complete</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            {/* Next Action */}
            {caseData.nextAction && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-semibold text-neutral-dark mb-2 flex items-center">
                  <Target className="h-4 w-4 text-primary mr-2" />
                  Next Action Required
                </h5>
                <p className="text-sm text-neutral-dark mb-2">{caseData.nextAction}</p>
                {caseData.nextActionDue && (
                  <div className="flex items-center text-sm text-neutral-medium">
                    <Calendar className="h-4 w-4 mr-2" />
                    Due: {formatDate(caseData.nextActionDue)}
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
            <div className="grid md:grid-cols-2 gap-6">
              {/* Case Description */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="h-5 w-5 mr-2" />
                    Case Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-dark">{caseData.description}</p>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Scale className="h-5 w-5 mr-2" />
                    Case Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-neutral-medium">Case Strength</span>
                        <Badge className={
                          analysis.strengthOfCase === 'strong' ? 'bg-success/10 text-success' :
                          analysis.strengthOfCase === 'moderate' ? 'bg-warning/10 text-warning' :
                          'bg-error/10 text-error'
                        }>
                          {analysis.strengthOfCase}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-medium">Risk Level</span>
                        <Badge className={
                          analysis.riskLevel === 'low' ? 'bg-success/10 text-success' :
                          analysis.riskLevel === 'medium' ? 'bg-warning/10 text-warning' :
                          'bg-error/10 text-error'
                        }>
                          {analysis.riskLevel}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-medium">Success Probability</span>
                        <span className="font-semibold">{analysis.successProbability}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-medium">Est. Timeframe</span>
                        <span className="font-semibold">{analysis.estimatedTimeframe}</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.slice(0, 5).map((event: any) => (
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
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            {analysis ? (
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Legal Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-neutral-dark mb-2">Case Assessment</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-medium">Strength</span>
                            <span className="text-sm font-medium">{analysis.strengthOfCase}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-medium">Risk Level</span>
                            <span className="text-sm font-medium">{analysis.riskLevel}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-neutral-medium">Success Rate</span>
                            <span className="text-sm font-medium">{analysis.successProbability}%</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-dark mb-2">Jurisdiction</h4>
                        <p className="text-sm text-neutral-dark">{analysis.jurisdiction}</p>
                        <h4 className="font-semibold text-neutral-dark mb-2 mt-4">Legal Framework</h4>
                        <div className="flex flex-wrap gap-1">
                          {analysis.legalFramework?.map((law: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {law}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {analysis.keyIssues && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Issues Identified</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.keyIssues.map((issue: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <AlertCircle className="h-4 w-4 text-warning mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-neutral-dark">{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {analysis.legalProtections && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Available Legal Protections</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.legalProtections.map((protection: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-neutral-dark">{protection}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Scale className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-dark mb-2">Analysis Pending</h3>
                  <p className="text-neutral-medium">AI analysis is being generated for this case.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Strategy Tab */}
          <TabsContent value="strategy" className="space-y-6">
            {strategy ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Executive Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-neutral-dark">{strategy.executiveSummary}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Strategy Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-neutral-dark">{strategy.strategyOverview}</p>
                  </CardContent>
                </Card>

                {strategy.stepByStepPlan && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Action Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {strategy.stepByStepPlan.map((step: any, index: number) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-neutral-dark">
                                Step {step.step}: {step.action}
                              </h4>
                              <Badge className={getPriorityColor(step.priority)}>
                                {step.priority}
                              </Badge>
                            </div>
                            <p className="text-neutral-dark mb-2">{step.description}</p>
                            <div className="flex items-center text-sm text-neutral-medium">
                              <Clock className="h-4 w-4 mr-1" />
                              {step.timeframe}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {strategy.timeline && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Strategic Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {strategy.timeline.immediateActions && (
                        <div>
                          <h4 className="font-semibold text-error mb-2">Immediate Actions</h4>
                          <ul className="space-y-1">
                            {strategy.timeline.immediateActions.map((action: string, index: number) => (
                              <li key={index} className="text-sm text-neutral-dark">• {action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {strategy.timeline.shortTerm && (
                        <div>
                          <h4 className="font-semibold text-warning mb-2">Short Term (1-2 weeks)</h4>
                          <ul className="space-y-1">
                            {strategy.timeline.shortTerm.map((action: string, index: number) => (
                              <li key={index} className="text-sm text-neutral-dark">• {action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {strategy.timeline.mediumTerm && (
                        <div>
                          <h4 className="font-semibold text-success mb-2">Medium Term (1-3 months)</h4>
                          <ul className="space-y-1">
                            {strategy.timeline.mediumTerm.map((action: string, index: number) => (
                              <li key={index} className="text-sm text-neutral-dark">• {action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Target className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-dark mb-2">Strategy Pack Pending</h3>
                  <p className="text-neutral-medium">Your custom strategy pack is being generated.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-dark">Case Documents</h3>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Upload Area */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Upload Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FileUpload
                    onUploadSuccess={handleFileUpload}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    maxSize={10 * 1024 * 1024}
                    additionalData={{ caseId: id }}
                  />
                </CardContent>
              </Card>

              {/* Document List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Uploaded Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-8 w-8 text-neutral-medium mx-auto mb-2" />
                      <p className="text-neutral-medium">No documents uploaded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {documents.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <i className={`${getFileIcon(doc.fileType)} text-lg mr-3`} />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-neutral-dark">{doc.originalName}</div>
                            <div className="text-xs text-neutral-medium">
                              Uploaded {formatDate(doc.createdAt)}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadDocument(doc.id, doc.originalName)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
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
                    Case Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {timeline.map((event: any) => (
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
                    placeholder="Add a note to your case timeline..."
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
