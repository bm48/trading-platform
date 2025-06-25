import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/dashboard-layout';
import { 
  CheckCircle, 
  Clock, 
  CreditCard, 
  FileText, 
  Download,
  Calendar,
  DollarSign,
  Brain,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

const workflowStages = [
  { key: 'submitted', label: 'Application Submitted', icon: CheckCircle },
  { key: 'ai_reviewed', label: 'AI Review Complete', icon: Brain },
  { key: 'payment_pending', label: 'Payment Required', icon: CreditCard },
  { key: 'intake_pending', label: 'Detailed Intake', icon: FileText },
  { key: 'pdf_generation', label: 'Strategy Generation', icon: Download },
  { key: 'dashboard_access', label: 'Dashboard Access', icon: Calendar }
];

export default function ApplicationStatus() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: application, isLoading } = useQuery({
    queryKey: ['/api/applications', id],
    enabled: !!id,
  });

  const getCurrentStageIndex = () => {
    if (!application) return 0;
    const currentStage = application.workflow_stage || 'submitted';
    return workflowStages.findIndex(stage => stage.key === currentStage);
  };

  const getProgressPercentage = () => {
    return ((getCurrentStageIndex() + 1) / workflowStages.length) * 100;
  };

  const handlePayment = () => {
    // Redirect to Stripe payment with application ID
    setLocation(`/checkout?application_id=${id}&amount=299`);
  };

  const handleIntakeForm = () => {
    setLocation(`/intake-form/${id}`);
  };

  const handleDashboardAccess = () => {
    setLocation('/dashboard');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!application) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-dark mb-2">Application Not Found</h3>
              <p className="text-neutral-medium">The application you're looking for doesn't exist or you don't have access to it.</p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const currentStageIndex = getCurrentStageIndex();
  const currentStage = workflowStages[currentStageIndex];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Application Status</h1>
          <p className="text-neutral-medium">
            Track your application progress through our workflow
          </p>
        </div>

        {/* Application Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Application #{application.id}</span>
              <Badge variant={application.status === 'approved' ? 'default' : 'secondary'}>
                {application.status?.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-neutral-medium">Trade</p>
                <p className="font-medium">{application.trade}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-medium">Issue Type</p>
                <p className="font-medium">{application.issue_type}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-medium">Amount</p>
                <p className="font-medium">${application.amount || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-neutral-medium">State</p>
                <p className="font-medium">{application.state}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Tracker */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Tracker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(getProgressPercentage())}%</span>
              </div>
              <Progress value={getProgressPercentage()} className="w-full" />
            </div>

            <div className="space-y-4">
              {workflowStages.map((stage, index) => {
                const Icon = stage.icon;
                const isCompleted = index < currentStageIndex;
                const isCurrent = index === currentStageIndex;
                const isPending = index > currentStageIndex;

                return (
                  <div 
                    key={stage.key}
                    className={`flex items-center p-4 rounded-lg border ${
                      isCompleted ? 'bg-green-50 border-green-200' :
                      isCurrent ? 'bg-blue-50 border-blue-200' :
                      'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <Icon className={`h-6 w-6 mr-4 ${
                      isCompleted ? 'text-green-600' :
                      isCurrent ? 'text-blue-600' :
                      'text-neutral-400'
                    }`} />
                    <div className="flex-1">
                      <h4 className={`font-medium ${
                        isCompleted ? 'text-green-800' :
                        isCurrent ? 'text-blue-800' :
                        'text-neutral-600'
                      }`}>
                        {stage.label}
                      </h4>
                      {isCurrent && (
                        <p className="text-sm text-neutral-medium">Currently in progress</p>
                      )}
                    </div>
                    {isCompleted && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {isCurrent && (
                      <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Action Cards */}
        <div className="grid gap-6">
          {/* Payment Required */}
          {application.workflow_stage === 'payment_pending' && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-800">
                  <CreditCard className="h-6 w-6 mr-2" />
                  Payment Required - $299
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-700 mb-4">
                  Your application has been approved! Complete your payment to proceed with the detailed intake form and receive your custom strategy pack.
                </p>
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-lg border border-orange-200">
                    <h4 className="font-medium text-orange-800 mb-2">What You'll Receive:</h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Custom AI-generated strategy PDF</li>
                      <li>• Timeline with legal steps and calendar dates</li>
                      <li>• Editable legal letter templates</li>
                      <li>• Risk overview and legal rights information</li>
                      <li>• Full dashboard access for case management</li>
                    </ul>
                  </div>
                  <Button onClick={handlePayment} className="w-full bg-orange-600 hover:bg-orange-700">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay $299 & Continue
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Intake Form */}
          {application.workflow_stage === 'intake_pending' && application.payment_status === 'completed' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-800">
                  <FileText className="h-6 w-6 mr-2" />
                  Complete Detailed Intake Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-700 mb-4">
                  Payment received! Now complete our detailed questionnaire to generate your custom strategy pack and legal documents.
                </p>
                <Button onClick={handleIntakeForm} className="w-full bg-blue-600 hover:bg-blue-700">
                  <FileText className="h-4 w-4 mr-2" />
                  Complete Intake Form
                </Button>
              </CardContent>
            </Card>
          )}

          {/* PDF Generation */}
          {application.workflow_stage === 'pdf_generation' && (
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-800">
                  <Brain className="h-6 w-6 mr-2" />
                  Strategy Pack Being Generated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-purple-700 mb-4">
                  Our AI is creating your custom strategy pack based on your detailed intake. This will be reviewed by our team before delivery.
                </p>
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-purple-600 border-t-transparent rounded-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dashboard Access */}
          {application.workflow_stage === 'dashboard_access' && application.dashboard_access_granted && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center text-green-800">
                  <CheckCircle className="h-6 w-6 mr-2" />
                  Welcome to Your Dashboard!
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-700 mb-4">
                  Your custom strategy pack is ready and dashboard access has been granted. You can now manage your case and access all features.
                </p>
                <div className="space-y-3">
                  <Button onClick={handleDashboardAccess} className="w-full bg-green-600 hover:bg-green-700">
                    <Calendar className="h-4 w-4 mr-2" />
                    Access Dashboard
                  </Button>
                  {!application.monthly_subscription_offered && (
                    <div className="bg-white p-4 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-800 mb-2">Upgrade to Monthly Subscription</h4>
                      <p className="text-sm text-green-700 mb-3">
                        Get unlimited access to all features for just $49/month
                      </p>
                      <Button variant="outline" size="sm" className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Subscribe for $49/month
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}