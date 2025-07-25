import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/dashboard-layout';
import EnhancedFileUpload from '@/components/enhanced-file-upload';
import DocumentPreview from '@/components/document-preview';
import StrategyDocuments from '@/components/strategy-documents';
import { DocumentTagging } from '@/components/document-tagging';

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
  Upload,
  Eye,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react';

export default function CaseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [newNote, setNewNote] = useState('');
  const [showTimelineForm, setShowTimelineForm] = useState(false);
  const [editingTimelineEntry, setEditingTimelineEntry] = useState<any>(null);
  const [timelineForm, setTimelineForm] = useState({
    title: '',
    description: '',
    date: '',
    type: 'milestone',
    priority: 'medium',
    status: 'pending'
  });
  
  // Remove mood tracking states and data

  const { data: caseData, isLoading } = useQuery<any>({
    queryKey: ['/api/cases', id],
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['/api/documents/case', id],
    queryFn: async () => {
      const response = await fetch(`/api/documents/case/${id}`, {
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

  const { data: timeline = [], refetch: refetchTimeline } = useQuery({
    queryKey: ['/api/timeline/case', id],
    queryFn: async () => {
      const response = await fetch(`/api/timeline/case/${id}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch timeline');
      return response.json();
    },
    enabled: !!id,
  });

  const generateAIDocument = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/cases/${id}/generate-document`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to generate document');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/case', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/cases', id] }); // Refresh case data to show updated progress
      toast({
        title: "AI Strategy Pack Generated",
        description: "Your personalized RESOLVE strategy document has been generated and sent for admin approval. Case progress updated to 30%.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate AI document. Please try again.",
        variant: "destructive",
      });
    },
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

  // Timeline mutations
  const createTimelineEntry = useMutation({
    mutationFn: async (entryData: any) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/timeline/case/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify(entryData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create timeline entry');
      }
      
      return response.json();
    },
    onSuccess: () => {
      refetchTimeline();
      setShowTimelineForm(false);
      setTimelineForm({
        title: '',
        description: '',
        date: '',
        type: 'milestone',
        priority: 'medium',
        status: 'pending'
      });
      toast({
        title: "Timeline entry added",
        description: "Your timeline entry has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create timeline entry. Please try again.",
        variant: "destructive",
      });
    }
  });

  const updateTimelineEntry = useMutation({
    mutationFn: async ({ entryId, entryData }: { entryId: number, entryData: any }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/timeline/${entryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify(entryData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update timeline entry');
      }
      
      return response.json();
    },
    onSuccess: () => {
      refetchTimeline();
      setEditingTimelineEntry(null);
      setShowTimelineForm(false);
      toast({
        title: "Timeline entry updated",
        description: "Your timeline entry has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update timeline entry. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteTimelineEntry = useMutation({
    mutationFn: async (entryId: number) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/timeline/${entryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete timeline entry');
      }
      
      return response.json();
    },
    onSuccess: () => {
      refetchTimeline();
      toast({
        title: "Timeline entry deleted",
        description: "Your timeline entry has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete timeline entry. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleFileUpload = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/documents/case', id] });
    toast({
      title: "File Uploaded",
      description: "Your document has been added to the case.",
    });
  };

  // Timeline helper functions
  const handleCreateTimeline = () => {
    if (!timelineForm.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for the timeline entry.",
        variant: "destructive",
      });
      return;
    }

    createTimelineEntry.mutate({
      ...timelineForm,
      date: timelineForm.date || new Date().toISOString()
    });
  };

  const handleEditTimeline = (entry: any) => {
    setEditingTimelineEntry(entry);
    setTimelineForm({
      title: entry.title,
      description: entry.description || '',
      date: entry.date,
      type: entry.type,
      priority: entry.priority,
      status: entry.status
    });
    setShowTimelineForm(true);
  };

  const handleUpdateTimeline = () => {
    if (!editingTimelineEntry) return;

    updateTimelineEntry.mutate({
      entryId: editingTimelineEntry.id,
      entryData: timelineForm
    });
  };

  const handleDeleteTimeline = (entryId: number) => {
    if (confirm('Are you sure you want to delete this timeline entry?')) {
      deleteTimelineEntry.mutate(entryId);
    }
  };

  const resetTimelineForm = () => {
    setTimelineForm({
      title: '',
      description: '',
      date: '',
      type: 'milestone',
      priority: 'medium',
      status: 'pending'
    });
    setEditingTimelineEntry(null);
    setShowTimelineForm(false);
  };

  const downloadDocument = async (documentId: number, filename: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Authentication Required",
          description: "Please log in to download documents.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(`/api/documents/${documentId}/download`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Verify we have a valid blob
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      
      // Cleanup after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 100);

      toast({
        title: "Download Started",
        description: `${filename} (${(blob.size / 1024).toFixed(1)} KB) is downloading`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Could not download the document. Please try again.",
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

  // Use the actual progress from the database instead of calculating it
  const progress = caseData.progress || 0;
  const analysis = caseData.ai_analysis || caseData.aiAnalysis;
  const strategy = caseData.strategy_pack || caseData.strategyPack;

  // Removed mood tracking functionality

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
              <div className="flex items-center gap-4">
                <Button 
                  onClick={() => generateAIDocument.mutate()}
                  disabled={generateAIDocument.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {generateAIDocument.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate AI Strategy Pack
                    </>
                  )}
                </Button>
                {caseData.amount && (
                  <div className="text-right">
                    <div className="text-2xl font-bold text-accent">
                      {formatCurrency(caseData.amount)}
                    </div>
                    <div className="text-sm text-neutral-medium">Amount claimed</div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-neutral-medium">Case Number</p>
                <p className="font-semibold text-neutral-dark">{caseData.case_number}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-medium">Issue Type</p>
                <p className="font-semibold text-neutral-dark">{caseData.issue_type}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-medium">Created</p>
                <p className="font-semibold text-neutral-dark">{formatDate(caseData.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-medium">Last Updated</p>
                <p className="font-semibold text-neutral-dark">{formatDate(caseData.updated_at)}</p>
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
            {/* AI-Generated Strategy Documents */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  AI-Generated Strategy Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StrategyDocuments caseId={parseInt(id!)} />
              </CardContent>
            </Card>

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
                  <EnhancedFileUpload
                    caseId={parseInt(id!)}
                    onUploadSuccess={handleFileUpload}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    maxSize={10 * 1024 * 1024}
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
                          <i className={`${getFileIcon(doc.file_type || doc.fileType)} text-lg mr-3`} />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-neutral-dark">{doc.original_name || doc.originalName}</div>
                            <div className="text-xs text-neutral-medium">
                              Uploaded {formatDate(doc.created_at || doc.createdAt)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <DocumentPreview
                              document={{
                                id: doc.id,
                                fileName: doc.original_name || doc.originalName || 'Unknown File',
                                filePath: doc.upload_path || doc.filePath || '',
                                fileType: doc.mime_type || doc.fileType || 'application/octet-stream',
                                fileSize: doc.file_size || doc.fileSize || 0
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
                              onClick={() => downloadDocument(doc.id, doc.original_name || doc.originalName)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Smart Document Tagging Section */}
            {documents.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-neutral-dark">Smart Document Organization</h4>
                <div className="grid gap-4">
                  {documents.map((doc: any) => (
                    <DocumentTagging
                      key={doc.id}
                      documentId={doc.id}
                      documentName={doc.original_name || doc.originalName || 'Unknown File'}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-neutral-dark">Case Timeline Management</h3>
              <Button 
                onClick={() => setShowTimelineForm(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Timeline Entry
              </Button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Timeline Entries
                  </CardTitle>
                  <p className="text-sm text-neutral-medium">Manage your case milestones and deadlines</p>
                </CardHeader>
                <CardContent>
                  {timeline && Array.isArray(timeline) && timeline.length > 0 ? (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {timeline.map((entry: any) => (
                        <div key={entry.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                          <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                            entry.status === 'completed' ? 'bg-green-500' : 
                            entry.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h5 className="font-medium text-neutral-dark">{entry.title}</h5>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  entry.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  entry.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {entry.priority}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditTimeline(entry)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTimeline(entry.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-neutral-medium mb-1">{entry.description}</p>
                            <div className="flex items-center gap-4 text-xs text-neutral-medium">
                              <span>{formatDate(entry.date)}</span>
                              <span className="capitalize">{entry.type}</span>
                              <span className="capitalize">{entry.status}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-8 w-8 text-neutral-medium mx-auto mb-2" />
                      <p className="text-neutral-medium">No timeline entries yet</p>
                      <p className="text-sm text-neutral-light">Create your first timeline entry to track case progress</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline Form or Add Note */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {showTimelineForm ? (
                      <>
                        <Calendar className="h-5 w-5 mr-2" />
                        {editingTimelineEntry ? 'Edit Timeline Entry' : 'Create Timeline Entry'}
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Add Note
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showTimelineForm ? (
                    <>
                      <div>
                        <label className="text-sm font-medium text-neutral-dark mb-2 block">Title *</label>
                        <Input
                          placeholder="Timeline entry title..."
                          value={timelineForm.title}
                          onChange={(e) => setTimelineForm({...timelineForm, title: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-neutral-dark mb-2 block">Description</label>
                        <Textarea
                          placeholder="Additional details..."
                          value={timelineForm.description}
                          onChange={(e) => setTimelineForm({...timelineForm, description: e.target.value})}
                          rows={3}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-neutral-dark mb-2 block">Date</label>
                          <Input
                            type="datetime-local"
                            value={timelineForm.date ? new Date(timelineForm.date).toISOString().slice(0, 16) : ''}
                            onChange={(e) => setTimelineForm({...timelineForm, date: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-neutral-dark mb-2 block">Type</label>
                          <select
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            value={timelineForm.type}
                            onChange={(e) => setTimelineForm({...timelineForm, type: e.target.value})}
                          >
                            <option value="milestone">Milestone</option>
                            <option value="deadline">Deadline</option>
                            <option value="action">Action</option>
                            <option value="note">Note</option>
                            <option value="document">Document</option>
                            <option value="email">Email</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-neutral-dark mb-2 block">Priority</label>
                          <select
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            value={timelineForm.priority}
                            onChange={(e) => setTimelineForm({...timelineForm, priority: e.target.value})}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium text-neutral-dark mb-2 block">Status</label>
                          <select
                            className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            value={timelineForm.status}
                            onChange={(e) => setTimelineForm({...timelineForm, status: e.target.value})}
                          >
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="overdue">Overdue</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          onClick={editingTimelineEntry ? handleUpdateTimeline : handleCreateTimeline}
                          disabled={createTimelineEntry.isPending || updateTimelineEntry.isPending}
                          className="flex-1"
                        >
                          {(createTimelineEntry.isPending || updateTimelineEntry.isPending) ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                              {editingTimelineEntry ? 'Updating...' : 'Creating...'}
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              {editingTimelineEntry ? 'Update Entry' : 'Create Entry'}
                            </>
                          )}
                        </Button>
                        
                        <Button 
                          variant="outline"
                          onClick={resetTimelineForm}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
