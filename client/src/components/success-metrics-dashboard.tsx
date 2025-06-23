import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  Calendar, 
  Award,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Users,
  CheckCircle,
  Clock,
  Star
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SuccessMetricsDashboardProps {
  userId?: string;
  className?: string;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6'];

export default function SuccessMetricsDashboard({ userId, className }: SuccessMetricsDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedView, setSelectedView] = useState('overview');

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/analytics/overview', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/overview?period=${selectedPeriod}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
  });

  const { data: metricsHistory, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/analytics/metrics'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/metrics', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch metrics history');
      return response.json();
    },
  });

  if (analyticsLoading || metricsLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card className={className}>
        <CardContent className="p-12 text-center">
          <BarChart3 className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-neutral-dark mb-2">No Analytics Data</h3>
          <p className="text-neutral-medium">Complete some cases to see your success metrics.</p>
        </CardContent>
      </Card>
    );
  }

  const successRate = analytics.successRate || 0;
  const recoveryRate = analytics.averageRecoveryRate || 0;
  const avgResolutionTime = analytics.averageDaysToResolution || 0;
  const clientSatisfaction = analytics.averageClientSatisfaction || 0;

  const outcomeData = [
    { name: 'Successful', value: analytics.successfulCases, color: '#10B981' },
    { name: 'Partial Success', value: analytics.partialSuccessCases, color: '#F59E0B' },
    { name: 'Unsuccessful', value: analytics.unsuccessfulCases, color: '#EF4444' },
    { name: 'Settled', value: analytics.settledCases, color: '#3B82F6' },
    { name: 'Ongoing', value: analytics.ongoingCases, color: '#8B5CF6' }
  ].filter(item => item.value > 0);

  const monthlyTrendData = analytics.monthlyTrends?.map((trend: any) => ({
    month: new Date(trend.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    successRate: trend.successRate,
    casesResolved: trend.casesResolved,
    averageRecovery: trend.averageRecovery
  })) || [];

  const strategyData = analytics.topStrategies?.map((strategy: any) => ({
    name: strategy.strategy.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    successRate: strategy.successRate,
    cases: strategy.caseCount
  })) || [];

  const issueTypeData = analytics.topIssueTypes?.map((issue: any) => ({
    name: issue.issueType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
    successRate: issue.successRate,
    cases: issue.caseCount
  })) || [];

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRateBg = (rate: number) => {
    if (rate >= 80) return 'bg-green-100';
    if (rate >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-dark">Success Metrics</h2>
          <p className="text-neutral-medium">Track your case outcomes and performance trends</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedView} onValueChange={setSelectedView}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="trends">Trends</SelectItem>
              <SelectItem value="strategies">Strategies</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-medium">Success Rate</p>
                <p className={`text-2xl font-bold ${getSuccessRateColor(successRate)}`}>
                  {successRate.toFixed(1)}%
                </p>
              </div>
              <div className={`p-2 rounded-lg ${getSuccessRateBg(successRate)}`}>
                <Target className={`h-6 w-6 ${getSuccessRateColor(successRate)}`} />
              </div>
            </div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-medium">Recovery Rate</p>
                <p className="text-2xl font-bold text-green-600">{recoveryRate.toFixed(1)}%</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <Progress value={recoveryRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-medium">Avg. Resolution Time</p>
                <p className="text-2xl font-bold text-blue-600">{Math.round(avgResolutionTime)} days</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-medium">Client Satisfaction</p>
                <p className="text-2xl font-bold text-yellow-600">{clientSatisfaction.toFixed(1)}/10</p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <Progress value={clientSatisfaction * 10} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="h-5 w-5 text-neutral-medium" />
              <h3 className="font-medium">Total Claimed</h3>
            </div>
            <p className="text-2xl font-bold text-neutral-dark">
              {formatCurrency(analytics.totalAmountClaimed)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h3 className="font-medium">Total Recovered</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(analytics.totalAmountRecovered)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <Award className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium">Recommendation Rate</h3>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {analytics.recommendationRate?.toFixed(1) || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {selectedView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Case Outcomes Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Case Outcomes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {outcomeData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={outcomeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {outcomeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-neutral-medium">
                  No outcome data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Case Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Case Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-medium">Total Cases</span>
                  <Badge variant="outline">{analytics.totalCases}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-medium">Successful Cases</span>
                  <Badge className="bg-green-100 text-green-800">{analytics.successfulCases}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-medium">Partial Success</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{analytics.partialSuccessCases}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-medium">Unsuccessful</span>
                  <Badge className="bg-red-100 text-red-800">{analytics.unsuccessfulCases}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-medium">Settled</span>
                  <Badge className="bg-blue-100 text-blue-800">{analytics.settledCases}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-medium">Ongoing</span>
                  <Badge className="bg-gray-100 text-gray-800">{analytics.ongoingCases}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedView === 'trends' && monthlyTrendData.length > 0 && (
        <div className="space-y-6">
          {/* Monthly Success Rate Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Success Rate Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Success Rate']} />
                    <Line 
                      type="monotone" 
                      dataKey="successRate" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={{ fill: '#10B981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Cases and Recovery */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Cases Resolved per Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="casesResolved" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Average Recovery Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Recovery Rate']} />
                      <Area 
                        type="monotone" 
                        dataKey="averageRecovery" 
                        stroke="#10B981" 
                        fill="#10B981" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {selectedView === 'strategies' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Strategies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Top Performing Strategies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {strategyData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={strategyData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(value, name) => [`${value}%`, 'Success Rate']} />
                      <Bar dataKey="successRate" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-neutral-medium">
                  No strategy data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Issue Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Top Issue Types by Success
              </CardTitle>
            </CardHeader>
            <CardContent>
              {issueTypeData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={issueTypeData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(value, name) => [`${value}%`, 'Success Rate']} />
                      <Bar dataKey="successRate" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-neutral-medium">
                  No issue type data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}