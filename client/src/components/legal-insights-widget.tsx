import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  TrendingUp,
  Lightbulb,
  CheckSquare,
  Clock,
  DollarSign,
  FileText,
  ChevronRight,
  Bell,
  Scale,
  AlertCircle,
  Zap
} from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

interface LegalInsight {
  id: string;
  type: 'deadline_alert' | 'case_analysis' | 'industry_trend' | 'legal_tip' | 'action_required';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'payment_disputes' | 'contract_issues' | 'regulatory_compliance' | 'general';
  actionable: boolean;
  expiresAt?: string;
  relatedCaseId?: number;
  metadata?: {
    amount?: number;
    daysUntil?: number;
    legislation?: string;
    severity?: string;
  };
}

interface DashboardInsights {
  urgentAlerts: LegalInsight[];
  caseAnalysis: LegalInsight[];
  industryTrends: LegalInsight[];
  legalTips: LegalInsight[];
  actionItems: LegalInsight[];
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'critical': return <AlertTriangle className="h-4 w-4" />;
    case 'high': return <AlertCircle className="h-4 w-4" />;
    case 'medium': return <Bell className="h-4 w-4" />;
    case 'low': return <Lightbulb className="h-4 w-4" />;
    default: return <Lightbulb className="h-4 w-4" />;
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'deadline_alert': return <Clock className="h-4 w-4" />;
    case 'case_analysis': return <FileText className="h-4 w-4" />;
    case 'industry_trend': return <TrendingUp className="h-4 w-4" />;
    case 'legal_tip': return <Scale className="h-4 w-4" />;
    case 'action_required': return <CheckSquare className="h-4 w-4" />;
    default: return <Lightbulb className="h-4 w-4" />;
  }
};

interface InsightCardProps {
  insight: LegalInsight;
  className?: string;
}

function InsightCard({ insight, className }: InsightCardProps) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={cn("p-1.5 rounded-full", getPriorityColor(insight.priority))}>
              {getTypeIcon(insight.type)}
            </div>
            <Badge variant="secondary" className="text-xs">
              {insight.priority.toUpperCase()}
            </Badge>
          </div>
          {insight.metadata?.daysUntil !== undefined && (
            <Badge variant={insight.metadata.daysUntil <= 3 ? "destructive" : "default"}>
              {insight.metadata.daysUntil} days
            </Badge>
          )}
        </div>
        
        <h4 className="font-semibold text-gray-900 mb-2 leading-tight">
          {insight.title}
        </h4>
        
        <p className="text-sm text-gray-600 mb-3 leading-relaxed">
          {insight.content}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {insight.metadata?.amount && (
              <Badge variant="outline" className="text-xs">
                <DollarSign className="h-3 w-3 mr-1" />
                {new Intl.NumberFormat('en-AU', { 
                  style: 'currency', 
                  currency: 'AUD',
                  maximumFractionDigits: 0
                }).format(insight.metadata.amount)}
              </Badge>
            )}
            {insight.metadata?.legislation && (
              <Badge variant="outline" className="text-xs">
                {insight.metadata.legislation}
              </Badge>
            )}
          </div>
          
          {insight.actionable && insight.relatedCaseId && (
            <Link href={`/case/${insight.relatedCaseId}`}>
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800">
                View Case <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface LegalInsightsWidgetProps {
  className?: string;
}

export function LegalInsightsWidget({ className }: LegalInsightsWidgetProps) {
  const { data: insights, isLoading, error } = useQuery<DashboardInsights>({
    queryKey: ['/api/legal-insights'],
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2 text-blue-600" />
            Legal Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2 text-blue-600" />
            Legal Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load legal insights. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  const allInsights = [
    ...insights.urgentAlerts,
    ...insights.actionItems,
    ...insights.caseAnalysis
  ].slice(0, 6); // Show top 6 insights

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Zap className="h-5 w-5 mr-2 text-blue-600" />
            Legal Insights
          </div>
          <Badge variant="secondary">
            {allInsights.length} insights
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="alerts">
              Alerts ({insights.urgentAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="tips">
              Tips ({insights.legalTips.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {allInsights.length > 0 ? (
                  allInsights.map((insight) => (
                    <InsightCard key={insight.id} insight={insight} />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Scale className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No urgent insights at the moment.</p>
                    <p className="text-sm">Keep monitoring your cases for updates.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="alerts" className="mt-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {insights.urgentAlerts.length > 0 ? (
                  insights.urgentAlerts.map((insight) => (
                    <InsightCard key={insight.id} insight={insight} />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckSquare className="h-12 w-12 mx-auto mb-4 text-green-300" />
                    <p>No urgent alerts!</p>
                    <p className="text-sm">All deadlines and actions are up to date.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="tips" className="mt-4">
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {insights.legalTips.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
                
                {insights.industryTrends.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Industry Trends
                    </h4>
                    <div className="space-y-3">
                      {insights.industryTrends.map((insight) => (
                        <InsightCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}