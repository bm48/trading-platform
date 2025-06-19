import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Bell, 
  AlertCircle, 
  FileText, 
  Users, 
  CheckCircle2,
  Clock,
  X
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface AdminNotification {
  id: string;
  type: 'document_review' | 'new_application' | 'subscription_change' | 'case_update';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: string;
  relatedId?: number;
  relatedType?: 'application' | 'case' | 'document' | 'user';
}

interface UserNotification {
  id: string;
  type: 'case_update' | 'document_ready' | 'payment_due' | 'general';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export default function NotificationBar() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch admin notifications for admin users
  const { data: adminNotifications = [] } = useQuery<AdminNotification[]>({
    queryKey: ['/api/admin/notifications'],
    enabled: user?.role === 'admin',
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch user notifications (would be implemented for regular users)
  const { data: userNotifications = [] } = useQuery<UserNotification[]>({
    queryKey: ['/api/notifications'],
    enabled: user?.role !== 'admin',
    refetchInterval: 60000, // Refresh every minute
  });

  const notifications = user?.role === 'admin' ? adminNotifications : userNotifications;
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'document_review':
      case 'document_ready':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'new_application':
        return <Users className="w-4 h-4 text-green-600" />;
      case 'case_update':
        return <AlertCircle className="w-4 h-4 text-purple-600" />;
      case 'payment_due':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'subscription_change':
        return <CheckCircle2 className="w-4 h-4 text-indigo-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 border-red-200';
      case 'medium': return 'bg-yellow-100 border-yellow-200';
      case 'low': return 'bg-blue-100 border-blue-200';
      default: return 'bg-gray-100 border-gray-200';
    }
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative hover:bg-gray-100 transition-colors"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {user.role === 'admin' ? 'Admin Notifications' : 'Notifications'}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-600 mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.isRead ? 'ring-2 ring-blue-200' : ''
                  } ${user.role === 'admin' && 'priority' in notification 
                    ? getPriorityColor(notification.priority) 
                    : ''}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm leading-tight">
                            {notification.title}
                          </h4>
                          {user.role === 'admin' && 'priority' in notification && (
                            <Badge 
                              variant={
                                notification.priority === 'high' ? 'destructive' :
                                notification.priority === 'medium' ? 'default' : 'secondary'
                              }
                              className="text-xs px-1 py-0 h-4"
                            >
                              {notification.priority}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full absolute top-2 right-2"></div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-sm"
              onClick={() => {
                if (user.role === 'admin') {
                  window.location.href = '/admin';
                }
                setIsOpen(false);
              }}
            >
              {user.role === 'admin' ? 'View Admin Dashboard' : 'View All Notifications'}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}