import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, X, CheckCheck, Archive, Trash2, AlertTriangle, Info, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'unread' | 'read' | 'archived';
  category?: string;
  related_id?: number;
  related_type?: string;
  action_url?: string;
  action_label?: string;
  expires_at?: string;
  metadata?: any;
  created_at: string;
  read_at?: string;
  archived_at?: string;
}

interface NotificationSummary {
  total: number;
  unread: number;
  critical: number;
  high: number;
  byType: Record<string, number>;
}

const priorityIcons = {
  critical: <AlertTriangle className="h-4 w-4 text-red-500" />,
  high: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  medium: <Info className="h-4 w-4 text-blue-500" />,
  low: <Clock className="h-4 w-4 text-gray-500" />,
};

const priorityColors = {
  critical: 'border-l-red-500 bg-red-50 dark:bg-red-950',
  high: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950',
  medium: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950',
  low: 'border-l-gray-500 bg-gray-50 dark:bg-gray-950',
};

const typeEmojis = {
  deadline: '⏰',
  action_required: '⚠️',
  legal_tip: '💡',
  document_review: '📄',
  case_update: '📋',
  payment_reminder: '💰',
  calendar_sync: '📅',
  system: '🔧',
  welcome: '👋',
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch notification summary
  const { data: summary } = useQuery<NotificationSummary>({
    queryKey: ['/api/notifications/summary'],
    refetchInterval: 30000,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/notifications/${id}/read`, { method: 'PUT' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/summary'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => 
      fetch('/api/notifications/mark-all-read', { method: 'PUT' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/summary'] });
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/notifications/${id}/archive`, { method: 'PUT' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/summary'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/notifications/${id}`, { method: 'DELETE' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/summary'] });
    },
  });

  // Generate smart notifications mutation
  const generateSmartMutation = useMutation({
    mutationFn: () => 
      fetch('/api/notifications/generate-smart', { method: 'POST' }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/summary'] });
    },
  });

  // Filter notifications based on active tab
  const filteredNotifications = (notifications as Notification[]).filter((notif: Notification) => {
    if (activeTab === 'all') return notif.status !== 'archived';
    if (activeTab === 'unread') return notif.status === 'unread';
    if (activeTab === 'critical') return notif.priority === 'critical' && notif.status !== 'archived';
    if (activeTab === 'archived') return notif.status === 'archived';
    return true;
  });

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (notification.status === 'unread') {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to action URL if available
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {summary && summary.unread > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {summary.unread > 99 ? '99+' : summary.unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notifications</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => generateSmartMutation.mutate()}
                  disabled={generateSmartMutation.isPending}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
                {summary && summary.unread > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {summary && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{summary.total} total</span>
                {summary.unread > 0 && <span>{summary.unread} unread</span>}
                {summary.critical > 0 && (
                  <span className="text-red-500">{summary.critical} urgent</span>
                )}
              </div>
            )}
          </CardHeader>
          
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread">Unread</TabsTrigger>
                <TabsTrigger value="critical">Urgent</TabsTrigger>
                <TabsTrigger value="archived">Archive</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab} className="mt-0">
                <ScrollArea className="h-96">
                  {isLoading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Loading notifications...
                    </div>
                  ) : filteredNotifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      {activeTab === 'unread' && 'No unread notifications'}
                      {activeTab === 'critical' && 'No urgent notifications'}
                      {activeTab === 'archived' && 'No archived notifications'}
                      {activeTab === 'all' && 'No notifications'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredNotifications.map((notification: Notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 border-l-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                            priorityColors[notification.priority]
                          } ${notification.status === 'unread' ? 'font-medium' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {typeEmojis[notification.type as keyof typeof typeEmojis] || '📢'}
                                {priorityIcons[notification.priority]}
                                <span className="text-sm font-medium truncate">
                                  {notification.title}
                                </span>
                                {notification.status === 'unread' && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {formatTimeAgo(notification.created_at)}
                                </span>
                                {notification.action_label && (
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                    {notification.action_label}
                                  </Button>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 ml-2">
                              {notification.status !== 'archived' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    archiveMutation.mutate(notification.id);
                                  }}
                                >
                                  <Archive className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMutation.mutate(notification.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

// Dashboard widget version
export function NotificationWidget() {
  const { data: notifications = [] } = useQuery({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000,
  });

  const { data: summary } = useQuery<NotificationSummary>({
    queryKey: ['/api/notifications/summary'],
    refetchInterval: 30000,
  });

  const recentNotifications = (notifications as Notification[])
    .filter((n: Notification) => n.status !== 'archived')
    .slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Recent Notifications</CardTitle>
        <Bell className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {summary && (
          <div className="flex items-center gap-4 mb-4">
            <div className="text-2xl font-bold">{summary.unread}</div>
            <div className="text-xs text-muted-foreground">
              unread notifications
            </div>
            {summary.critical > 0 && (
              <Badge variant="destructive" className="text-xs">
                {summary.critical} urgent
              </Badge>
            )}
          </div>
        )}
        
        <div className="space-y-2">
          {recentNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent notifications</p>
          ) : (
            recentNotifications.map((notification: Notification) => (
              <div key={notification.id} className="flex items-start gap-2">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  notification.priority === 'critical' ? 'bg-red-500' :
                  notification.priority === 'high' ? 'bg-orange-500' :
                  notification.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{notification.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}