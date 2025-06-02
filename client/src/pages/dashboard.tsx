import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/dashboard-layout';
import ApplicationForm from '@/components/application-form';
import { formatCurrency, formatDate, getStatusColor, calculateProgress } from '@/lib/utils';
import { 
  FolderOpen, 
  FileText, 
  Calendar, 
  Clock, 
  DollarSign, 
  Plus, 
  ChevronRight,
  Shield,
  AlertCircle 
} from 'lucide-react';
import { Link } from 'wouter';

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('cases');
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);

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

  const activeCases = cases.filter((c: any) => c.status === 'active');
  const resolvedCases = cases.filter((c: any) => c.status === 'resolved');

  const handleNewCaseClick = () => {
    if (!subscriptionStatus?.canCreateCases) {
      // Redirect to pricing/subscription page
      window.location.href = '/checkout';
      return;
    }
    setShowNewCaseForm(true);
  };

  if (showNewCaseForm) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-neutral-dark">New Case Application</h1>
              <p className="text-neutral-medium">Fill out the details to start your legal case</p>
            </div>
            <Button variant="outline" onClick={() => setShowNewCaseForm(false)}>
              Back to Dashboard
            </Button>
          </div>
          <ApplicationForm />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-dark">Welcome back, {user?.firstName || 'User'}</h1>
            <p className="text-neutral-medium">Manage your cases and track your progress</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleNewCaseClick}>
              <Plus className="h-4 w-4 mr-2" />
              New Case
            </Button>
            {subscriptionStatus && !subscriptionStatus.canCreateCases && (
              <div className="text-sm text-neutral-medium">
                {subscriptionStatus.message}
              </div>
            )}
          </div>
        </div>

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
                    <Button size="sm" variant="outline" onClick={async () => {
                      try {
                        const response = await fetch('/api/subscription/grant-demo-pack', { method: 'POST' });
                        if (response.ok) {
                          window.location.reload();
                        }
                      } catch (error) {
                        console.error('Failed to grant demo pack');
                      }
                    }}>
                      Get Demo Pack
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-medium">Active Cases</p>
                  <p className="text-2xl font-bold text-neutral-dark">{activeCases.length}</p>
                </div>
                <FolderOpen className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-medium">Total Value</p>
                  <p className="text-2xl font-bold text-neutral-dark">
                    {formatCurrency(
                      cases.reduce((total: number, c: any) => total + (parseFloat(c.amount) || 0), 0)
                    )}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-medium">Resolved Cases</p>
                  <p className="text-2xl font-bold text-neutral-dark">{resolvedCases.length}</p>
                </div>
                <Shield className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-neutral-medium">Success Rate</p>
                  <p className="text-2xl font-bold text-neutral-dark">
                    {cases.length > 0 ? Math.round((resolvedCases.length / cases.length) * 100) : 0}%
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cases" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Case Files
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Contract Files
            </TabsTrigger>
          </TabsList>

          {/* Case Files Tab */}
          <TabsContent value="cases" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-dark">Case Files</h2>
              <Button variant="outline" onClick={handleNewCaseClick}>
                <Plus className="h-4 w-4 mr-2" />
                New Case
              </Button>
            </div>

            {casesLoading ? (
              <div className="grid gap-6">
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
              <Card>
                <CardContent className="p-12 text-center">
                  <FolderOpen className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-dark mb-2">No cases yet</h3>
                  <p className="text-neutral-medium mb-6">Start by creating your first case to get legal support</p>
                  <Button onClick={handleNewCaseClick}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Case
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {cases.map((caseItem: any) => {
                  const progress = calculateProgress(caseItem);
                  return (
                    <Card key={caseItem.id} className="hover:shadow-lg transition-shadow">
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

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-neutral-medium">Case Number</p>
                            <p className="font-medium text-neutral-dark">{caseItem.caseNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm text-neutral-medium">Created</p>
                            <p className="font-medium text-neutral-dark">{formatDate(caseItem.createdAt)}</p>
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
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-dark">Contract Files</h2>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Contract
              </Button>
            </div>

            {contractsLoading ? (
              <div className="grid gap-6">
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
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-dark mb-2">No contracts yet</h3>
                  <p className="text-neutral-medium mb-6">
                    Protect your future work by creating professional contracts
                  </p>
                  <Button variant="outline">
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
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-neutral-medium">Contract Number</p>
                          <p className="font-medium text-neutral-dark">{contract.contractNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-medium">Client</p>
                          <p className="font-medium text-neutral-dark">{contract.clientName || 'N/A'}</p>
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
