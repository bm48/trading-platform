import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  FileText, 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Send,
  Edit,
  Eye,
  Calendar,
  DollarSign
} from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";

interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  totalCases: number;
  activeCases: number;
  pendingApplications: number;
  pendingDocuments: number;
  totalRevenue: number;
  activeSubscriptions: number;
}

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: string;
  relatedId?: number;
  relatedType?: string;
}

interface PendingDocument {
  id: number;
  caseId: number;
  caseTitle: string;
  clientName: string;
  type: string;
  status: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

interface UserActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status: string;
  relatedId: number;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDocument, setSelectedDocument] = useState<PendingDocument | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      window.location.href = '/';
    }
  }, [user, authLoading]);

  // Fetch admin statistics
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
    enabled: user?.role === 'admin',
  });

  // Fetch admin notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<AdminNotification[]>({
    queryKey: ['/api/admin/notifications'],
    enabled: user?.role === 'admin',
  });

  // Fetch pending documents
  const { data: pendingDocuments = [], isLoading: documentsLoading } = useQuery<PendingDocument[]>({
    queryKey: ['/api/admin/pending-documents'],
    enabled: user?.role === 'admin',
  });

  // Fetch user activity
  const { data: userActivity = [], isLoading: activityLoading } = useQuery<UserActivity[]>({
    queryKey: ['/api/admin/activity'],
    enabled: user?.role === 'admin',
  });

  // Document update mutation
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
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update document",
        variant: "destructive",
      });
    },
  });

  // Document send mutation
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
    },
    onError: () => {
      toast({
        title: "Send Failed",
        description: "Failed to send document",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'destructive';
      case 'reviewed': return 'default';
      case 'sent': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor and manage platform activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Admin Access
          </Badge>
        </div>
      </div>

      {/* Statistics Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New Today</p>
                  <p className="text-2xl font-bold">{stats?.newUsersToday || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Cases</p>
                  <p className="text-2xl font-bold">{stats?.activeCases || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold">{stats?.pendingDocuments || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Applications</p>
                  <p className="text-2xl font-bold">{stats?.pendingApplications || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Subscriptions</p>
                  <p className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</p>
                </div>
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
                  <p className="text-2xl font-bold">${stats?.totalRevenue || 0}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cases</p>
                  <p className="text-2xl font-bold">{stats?.totalCases || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents">
            <FileText className="w-4 h-4 mr-2" />
            Documents ({pendingDocuments.length})
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <AlertCircle className="w-4 h-4 mr-2" />
            Notifications ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Calendar className="w-4 h-4 mr-2" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="overview">
            <TrendingUp className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Document Reviews</CardTitle>
              <CardDescription>
                Documents that require admin review before sending to clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documentsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : pendingDocuments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No pending documents to review</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {pendingDocuments.map((doc) => (
                      <div key={doc.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{doc.caseTitle}</h4>
                              <Badge variant={getStatusColor(doc.status)}>
                                {doc.status}
                              </Badge>
                              <Badge variant="outline">
                                {doc.type.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              Client: {doc.clientName}
                            </p>
                            <p className="text-xs text-gray-500">
                              Created: {format(new Date(doc.createdAt), 'PPp')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedDocument(doc)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                            {doc.status === 'reviewed' && (
                              <Button
                                size="sm"
                                onClick={() => sendDocumentMutation.mutate(doc.id)}
                                disabled={sendDocumentMutation.isPending}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Send
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Notifications</CardTitle>
              <CardDescription>
                Recent system notifications requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notificationsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="p-4 border rounded-lg animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications at this time</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <Alert key={notification.id} className="hover:bg-gray-50 transition-colors">
                        <AlertCircle className="h-4 w-4" />
                        <div className="flex items-start justify-between w-full">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{notification.title}</h4>
                              <Badge variant={getPriorityColor(notification.priority)}>
                                {notification.priority}
                              </Badge>
                            </div>
                            <AlertDescription>{notification.message}</AlertDescription>
                            <p className="text-xs text-gray-500 mt-2">
                              {format(new Date(notification.createdAt), 'PPp')}
                            </p>
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Timeline of recent user and system activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : userActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent activity</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {userActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          {activity.type === 'application' && <FileText className="w-5 h-5 text-blue-600" />}
                          {activity.type === 'case' && <Users className="w-5 h-5 text-green-600" />}
                          {activity.type === 'document' && <Edit className="w-5 h-5 text-purple-600" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{activity.title}</h4>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(activity.timestamp), 'PPp')}
                          </p>
                        </div>
                        <Badge variant="outline">{activity.status}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Overall platform status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Database</span>
                  <Badge variant="default" className="bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Healthy
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Authentication</span>
                  <Badge variant="default" className="bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Operational
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>File Storage</span>
                  <Badge variant="default" className="bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Available
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Email Service</span>
                  <Badge variant="default" className="bg-green-100 text-green-700">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Users
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Review Documents
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  System Logs
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}