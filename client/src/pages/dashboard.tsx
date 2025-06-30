import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/dashboard-layout';
import ApplicationForm from '@/components/application-form';
import ValidatedCaseForm from '@/components/validated-case-form';
import ValidatedContractForm from '@/components/validated-contract-form';
import { LegalInsightsWidget } from '@/components/legal-insights-widget';
import { NotificationWidget } from '@/components/notification-center';
import { formatCurrency, formatDate, getStatusColor, calculateProgress } from '@/lib/utils';
import { MoodIndicator } from '@/components/mood-visualization';
import { MoodData } from '@/lib/mood-utils';
import { 
  FolderOpen, 
  FileText, 
  Calendar, 
  Clock, 
  DollarSign, 
  Plus, 
  ChevronRight,
  Shield,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Bell
} from 'lucide-react';
import { Link } from 'wouter';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out",
      });
    } catch (error: any) {
      toast({
        title: "Sign Out Failed",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
    }
  };
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [showNewContractForm, setShowNewContractForm] = useState(false);
  
  // Get tab from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab') || 'cases';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  const { data: cases = [], isLoading: casesLoading } = useQuery({
    queryKey: ['/api/cases'],
    enabled: !!user,
  });

  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['/api/contracts'],
    enabled: !!user,
  });

  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/subscription/status'],
    enabled: !!user,
  });

  // Generate timeline events from cases and contracts
  const generateTimelineEvents = () => {
    const events = [];
    const today = new Date();
    
    // Add case events
    if (Array.isArray(cases)) {
      cases.forEach((caseItem: any) => {
        if (caseItem.nextActionDue) {
          const dueDate = new Date(caseItem.nextActionDue);
          const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          events.push({
            id: `case-${caseItem.id}`,
            type: 'case',
            title: caseItem.nextAction || 'Follow up required',
            subtitle: `Case ${caseItem.caseNumber}`,
            date: dueDate,
            daysUntil,
            priority: daysUntil <= 3 ? 'high' : daysUntil <= 7 ? 'medium' : 'low',
            status: caseItem.status,
            amount: caseItem.amount,
            caseId: caseItem.id
          });
        }
      });
    }

    // Add contract events
    if (Array.isArray(contracts)) {
      contracts.forEach((contract: any) => {
        if (contract.nextActionDue) {
          const dueDate = new Date(contract.nextActionDue);
          const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          events.push({
            id: `contract-${contract.id}`,
            type: 'contract',
            title: contract.nextAction || 'Contract review required',
            subtitle: `Contract ${contract.contractNumber}`,
            date: dueDate,
            daysUntil,
            priority: daysUntil <= 3 ? 'high' : daysUntil <= 7 ? 'medium' : 'low',
            status: contract.status,
            amount: contract.value,
            contractId: contract.id
          });
        }
      });
    }

    // Sort by date (closest first)
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const timelineEvents = generateTimelineEvents();

  const activeCases = cases.filter((c: any) => c.status === 'active');
  const resolvedCases = cases.filter((c: any) => c.status === 'resolved');

  const handleNewCaseClick = () => {
    setShowNewCaseForm(true);
  };

  if (showNewCaseForm) {
    return (
      <>
        <ValidatedCaseForm 
          onClose={() => setShowNewCaseForm(false)}
          onSuccess={() => {
            // Refresh cases data after successful creation
            window.location.reload();
          }}
        />
      </>
    );
  }

  if (showNewContractForm) {
    return (
      <>
        <ValidatedContractForm 
          onClose={() => setShowNewContractForm(false)}
          onSuccess={() => {
            // Refresh contracts data after successful creation
            window.location.reload();
          }}
        />
      </>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-neutral-dark">Welcome!</h1>
            <p className="text-neutral-medium">Manage your cases and track your progress</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={activeTab === 'contracts' ? () => setShowNewContractForm(true) : handleNewCaseClick}
              className="btn-hover-lift animate-pulse-hover"
              disabled={activeTab === 'contracts' ? 
                (subscriptionStatus && !subscriptionStatus.canCreateContracts) : 
                (subscriptionStatus && !subscriptionStatus.canCreateCases)
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              {activeTab === 'contracts' ? 'New Contract' : 'New Case'}
            </Button>
            {subscriptionStatus && (
              <div className="text-sm text-neutral-medium">
                {subscriptionStatus.message}
              </div>
            )}    
          </div>
        </div>

        {/* Central Timeline */}
        {timelineEvents.length > 0 && (
          <Card className="border-l-4 border-l-primary bg-blue-50 animate-fade-in card-hover">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary animate-glow" />
                <CardTitle className="text-lg text-primary">Upcoming Actions & Deadlines</CardTitle>
              </div>
              <p className="text-sm text-neutral-medium">Stay on top of your cases and contracts - never miss a deadline</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {timelineEvents.slice(0, 5).map((event: any, index: number) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-3 bg-white rounded-lg border smooth-transition btn-hover-scale"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      event.priority === 'high' ? 'bg-red-100 text-red-600' :
                      event.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {event.type === 'case' ? <FolderOpen className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-dark">{event.title}</p>
                      <p className="text-sm text-neutral-medium">{event.subtitle}</p>
                      {event.amount && (
                        <p className="text-sm font-medium text-green-600">{formatCurrency(event.amount)}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        event.daysUntil <= 0 ? 'destructive' :
                        event.daysUntil <= 3 ? 'destructive' :
                        event.daysUntil <= 7 ? 'secondary' : 'outline'
                      }>
                        {event.daysUntil <= 0 ? 'Overdue' :
                         event.daysUntil === 1 ? 'Tomorrow' :
                         `${event.daysUntil} days`}
                      </Badge>
                      <Link href={event.type === 'case' ? `/case/${event.caseId}` : `/contract/${event.contractId}`}>
                        <Button size="sm" variant="ghost">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                    <p className="text-xs text-neutral-medium mt-1">{formatDate(event.date)}</p>
                  </div>
                </div>
              ))}
              {timelineEvents.length > 5 && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm">
                    View All {timelineEvents.length} Actions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State for Timeline */}
        {timelineEvents.length === 0 && !casesLoading && !contractsLoading && (
          <Card className="border-l-4 border-l-green-500 bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-700 mb-2">All Caught Up!</h3>
              <p className="text-green-600">No upcoming deadlines or actions required. Great work staying on top of your cases!</p>
            </CardContent>
          </Card>
        )}

        {/* Subscription Status Banner */}
        {subscriptionStatus && !subscriptionLoading && (
          <Card className={`border-l-4 ${subscriptionStatus.canCreateCases ? 'border-l-success bg-green-50' : 'border-l-warning bg-yellow-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-neutral-dark">
                    {subscriptionStatus.planType === 'monthly_subscription' ? 'Monthly Subscription' : 
                     subscriptionStatus.planType === 'strategy_pack' ? 'Strategy Pack' : 'No Active Plan'}
                  </h3>
                  <p className="text-sm text-neutral-medium">{subscriptionStatus.message}</p>
                </div>
                {!subscriptionStatus.canCreateCases && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => window.location.href = '/checkout'}>
                      Upgrade Plan
                    </Button>

                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
          {/* Legal Insights Widget */}
          <LegalInsightsWidget />
          
          {/* Notification Widget */}
          <NotificationWidget />
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
          <Card className="card-hover smooth-transition" style={{ animationDelay: '0.1s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-medium">
                    {activeTab === 'cases' ? 'Active Cases' : 'Active Contracts'}
                  </p>
                  <p className="text-2xl font-bold text-neutral-dark animate-pulse-hover">
                    {activeTab === 'cases' ? activeCases.length : 
                     (contracts as any[])?.filter((c: any) => c.status === 'draft' || c.status === 'active')?.length || 0}
                  </p>
                </div>
                <FolderOpen className="h-8 w-8 text-primary animate-bounce-hover" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover smooth-transition" style={{ animationDelay: '0.2s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-medium">Total Value</p>
                  <p className="text-2xl font-bold text-neutral-dark animate-pulse-hover">
                    {activeTab === 'cases' ? 
                      formatCurrency(cases.reduce((total: number, c: any) => total + (parseFloat(c.amount) || 0), 0)) :
                      formatCurrency((contracts as any[])?.reduce((total: number, c: any) => total + (parseFloat(c.value) || 0), 0) || 0)
                    }
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-success animate-bounce-hover" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover smooth-transition" style={{ animationDelay: '0.3s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-medium">
                    {activeTab === 'cases' ? 'Resolved Cases' : 'Completed Contracts'}
                  </p>
                  <p className="text-2xl font-bold text-neutral-dark animate-pulse-hover">
                    {activeTab === 'cases' ? resolvedCases.length : 
                     (contracts as any[])?.filter((c: any) => c.status === 'completed')?.length || 0}
                  </p>
                </div>
                <Shield className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover smooth-transition" style={{ animationDelay: '0.4s' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-medium">Success Rate</p>
                  <p className="text-2xl font-bold text-neutral-dark animate-pulse-hover">
                    {cases.length > 0 ? Math.round((resolvedCases.length / cases.length) * 100) : 0}%
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-warning animate-bounce-hover" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          // Update URL without full page reload
          const url = new URL(window.location.href);
          url.searchParams.set('tab', value);
          window.history.pushState({}, '', url.toString());
        }} className="space-y-6 animate-fade-in">
          <TabsList className="grid w-full grid-cols-3 smooth-transition">
            <TabsTrigger value="cases" className="flex items-center gap-2 smooth-transition btn-hover-scale">
              <FolderOpen className="h-4 w-4" />
              Case Files
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center gap-2 smooth-transition btn-hover-scale">
              <FileText className="h-4 w-4" />
              Contract Files
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2 smooth-transition btn-hover-scale">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>

          {/* Case Files Tab */}
          <TabsContent value="cases" className="space-y-6">
            <div className="flex items-center justify-between animate-slide-in">
              <h2 className="text-xl font-semibold text-neutral-dark">Case Files</h2>
              <Button variant="outline" onClick={handleNewCaseClick} className="btn-hover-lift">
                <Plus className="h-4 w-4 mr-2" />
                New Case
              </Button>
            </div>

            {casesLoading ? (
              <div className="grid gap-6 animate-fade-in">
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
            ) : cases.length === 0 ? (
              <Card className="animate-fade-in">
                <CardContent className="p-12 text-center">
                  <FolderOpen className="h-12 w-12 text-neutral-medium mx-auto mb-4 animate-bounce-hover" />
                  <h3 className="text-lg font-semibold text-neutral-dark mb-2">No cases yet</h3>
                  <p className="text-neutral-medium mb-6">Start by creating your first case to get legal support</p>
                  <Button onClick={handleNewCaseClick} className="btn-hover-lift animate-pulse-hover">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Case
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 animate-fade-in">
                {cases.map((caseItem: any, index: number) => {
                  // Use the actual progress from the database instead of calculating it
                  const progress = caseItem.progress || 0;
                  return (
                    <Card 
                      key={caseItem.id} 
                      className="card-hover smooth-transition" 
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-neutral-dark">{caseItem.title}</h3>
                            <Badge className={getStatusColor(caseItem.status)}>
                              {caseItem.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            {caseItem.amount && (
                              <div className="text-right">
                                <div className="text-lg font-bold text-accent">
                                  {formatCurrency(caseItem.amount)}
                                </div>
                                <div className="text-sm text-neutral-medium">Amount claimed</div>
                              </div>
                            )}
                            <Link href={`/case/${caseItem.id}`}>
                              <Button variant="ghost" size="sm">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-neutral-medium">Case Number</p>
                            <p className="font-medium text-neutral-dark">{caseItem.case_number || caseItem.caseNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-medium">Created</p>
                            <p className="font-medium text-neutral-dark">{formatDate(caseItem.created_at || caseItem.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-medium">Current Mood</p>
                            <div className="flex items-center gap-2">
                              <MoodIndicator moodData={{
                                moodScore: caseItem.mood_score || 5,
                                stressLevel: (caseItem.stress_level as 'low' | 'medium' | 'high' | 'critical') || 'medium',
                                urgencyFeeling: (caseItem.urgency_feeling as 'calm' | 'moderate' | 'urgent' | 'panic') || 'moderate',
                                confidenceLevel: caseItem.confidence_level || 5,
                                clientSatisfaction: caseItem.client_satisfaction || 5,
                                moodNotes: caseItem.mood_notes || '',
                                lastMoodUpdate: caseItem.last_mood_update || ''
                              }} />
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-sm text-neutral-medium mb-1">
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        {/* Next Action */}
                        {caseItem.nextAction && (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h5 className="font-semibold text-neutral-dark mb-2 flex items-center">
                              <Clock className="h-4 w-4 text-primary mr-2" />
                              Next Action Required
                            </h5>
                            <p className="text-sm text-neutral-dark mb-2">{caseItem.nextAction}</p>
                            {caseItem.nextActionDue && (
                              <div className="flex items-center text-sm text-neutral-medium">
                                <Calendar className="h-4 w-4 mr-2" />
                                Due: {formatDate(caseItem.nextActionDue)}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Contract Files Tab */}
          <TabsContent value="contracts" className="space-y-6">
            <div className="flex items-center justify-between animate-slide-in">
              <h2 className="text-xl font-semibold text-neutral-dark">Contract Files</h2>
              <Button variant="outline" onClick={() => setShowNewContractForm(true)} className="btn-hover-lift">
                <Plus className="h-4 w-4 mr-2" />
                New Contract
              </Button>
            </div>

            {contractsLoading ? (
              <div className="grid gap-6 animate-fade-in">
                {[1, 2].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : contracts.length === 0 ? (
              <Card className="animate-fade-in">
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-neutral-medium mx-auto mb-4 animate-bounce-hover" />
                  <h3 className="text-lg font-semibold text-neutral-dark mb-2">No contracts yet</h3>
                  <p className="text-neutral-medium mb-6">
                    Protect your future work by creating professional contracts
                  </p>
                  <Button variant="outline" onClick={() => setShowNewContractForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Contract
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {contracts.map((contract: any) => (
                  <Card key={contract.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-neutral-dark">{contract.title}</h3>
                          <Badge className={getStatusColor(contract.status)}>
                            {contract.status}
                          </Badge>
                        </div>
                        <Link href={`/contract/${contract.id}`}>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-neutral-medium">Contract Number</p>
                          <p className="font-medium text-neutral-dark">{contract.contract_number || contract.contractNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-medium">Client</p>
                          <p className="font-medium text-neutral-dark">{contract.client_name || contract.clientName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-medium">Value</p>
                          <p className="font-medium text-neutral-dark">
                            {contract.value ? formatCurrency(contract.value) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <div className="flex items-center justify-between animate-slide-in">
              <h2 className="text-xl font-semibold text-neutral-dark">Legal Calendar</h2>
              <div className="flex gap-2">
                <Link href="/calendar">
                  <Button variant="outline" className="btn-hover-lift">
                    <Calendar className="h-4 w-4 mr-2" />
                    Full Calendar View
                  </Button>
                </Link>
              </div>
            </div>

            {/* Calendar Integration Status */}
            <Card className="border-l-4 border-l-primary bg-blue-50 animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-dark">Calendar Integration</h3>
                      <p className="text-sm text-neutral-medium">Connect your Google or Outlook calendar to sync legal deadlines</p>
                    </div>
                  </div>
                  <Link href="/calendar">
                    <Button className="btn-hover-lift">
                      <Plus className="h-4 w-4 mr-2" />
                      Connect Calendar
                    </Button>
                  </Link>
                </div>
                
                {/* Quick Calendar Stats */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-neutral-dark">{timelineEvents.length}</div>
                    <div className="text-sm text-neutral-medium">Upcoming Deadlines</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-neutral-dark">
                      {timelineEvents.filter(event => {
                        const eventDate = new Date(event.date);
                        const weekFromNow = new Date();
                        weekFromNow.setDate(weekFromNow.getDate() + 7);
                        return eventDate <= weekFromNow;
                      }).length}
                    </div>
                    <div className="text-sm text-neutral-medium">This Week</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg">
                    <div className="text-2xl font-bold text-neutral-dark">0</div>
                    <div className="text-sm text-neutral-medium">Connected Calendars</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Legal Events */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Upcoming Legal Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timelineEvents.length > 0 ? (
                  <div className="space-y-3">
                    {timelineEvents.slice(0, 10).map((event: any, index: number) => (
                      <div 
                        key={event.id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors smooth-transition"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            event.priority === 'high' ? 'bg-red-100 text-red-600' :
                            event.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {event.type === 'case' ? <FolderOpen className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          </div>
                          <div>
                            <h4 className="font-medium text-neutral-dark">{event.title}</h4>
                            <p className="text-sm text-neutral-medium">{event.subtitle}</p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-neutral-medium">
                              <span>{formatDate(event.date)}</span>
                              {event.amount && (
                                <span className="font-medium text-accent">{formatCurrency(event.amount)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${
                            event.priority === 'high' ? 'bg-red-100 text-red-800' :
                            event.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {event.daysUntil === 0 ? 'Today' : 
                             event.daysUntil === 1 ? 'Tomorrow' :
                             event.daysUntil > 0 ? `${event.daysUntil} days` : 'Overdue'}
                          </Badge>
                          <Link href={event.type === 'case' ? `/case/${event.caseId}` : `/contract/${event.contractId}`}>
                            <Button variant="ghost" size="sm" className="btn-hover-lift">
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-neutral-dark mb-2">No Upcoming Events</h3>
                    <p className="text-neutral-medium mb-4">Your calendar is clear! Create cases or contracts to see deadlines here.</p>
                    <div className="flex justify-center gap-2">
                      <Button onClick={handleNewCaseClick} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        New Case
                      </Button>
                      <Button onClick={() => setShowNewContractForm(true)} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        New Contract
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Calendar Quick Actions */}
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle>Calendar Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
                  <p className="text-gray-600 mb-4">
                    Calendar integration with Google and Outlook is coming soon to help you manage legal deadlines.
                  </p>
                  <Link href="/calendar">
                    <Button variant="outline" className="btn-hover-lift">
                      <Calendar className="h-4 w-4 mr-2" />
                      Learn More
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
