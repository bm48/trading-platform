import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, ExternalLink, Trash2, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CalendarIntegration {
  id: number;
  provider: string;
  is_active: boolean;
  calendar_id?: string;
  created_at: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  sync_status: string;
  provider?: string;
}

export default function CalendarIntegration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch calendar integrations
  const { data: integrations = [], isLoading } = useQuery<CalendarIntegration[]>({
    queryKey: ['/api/calendar/integrations'],
  });

  // Fetch calendar events
  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar/events'],
  });

  // Connect Google Calendar
  const connectGoogleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/calendar/auth/google');
      const data = await response.json();
      window.open(data.authUrl, '_blank', 'width=500,height=600');
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Google Calendar",
        description: "Please complete the authorization in the new window",
      });
      // Refresh integrations after a delay to allow for OAuth completion
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/calendar/integrations'] });
      }, 5000);
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Failed to connect Google Calendar",
        variant: "destructive",
      });
    },
  });

  // Connect Outlook Calendar
  const connectOutlookMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/calendar/auth/microsoft');
      const data = await response.json();
      window.open(data.authUrl, '_blank', 'width=500,height=600');
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Outlook Calendar",
        description: "Please complete the authorization in the new window",
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/calendar/integrations'] });
      }, 5000);
    },
    onError: () => {
      toast({
        title: "Connection Failed",
        description: "Failed to connect Outlook Calendar",
        variant: "destructive",
      });
    },
  });

  // Disconnect integration
  const disconnectMutation = useMutation({
    mutationFn: async (integrationId: number) => {
      await apiRequest('DELETE', `/api/calendar/integrations/${integrationId}`);
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Calendar integration removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/integrations'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to disconnect calendar integration",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return '🗓️';
      case 'outlook':
        return '📅';
      default:
        return '📆';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'google':
        return 'Google Calendar';
      case 'outlook':
        return 'Outlook Calendar';
      default:
        return 'Calendar';
    }
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Synced</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendar Integrations
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar or Outlook to automatically sync case deadlines and appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connected Integrations */}
          {integrations.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-600">Connected Calendars</h4>
              {integrations.map((integration) => (
                <div 
                  key={integration.id} 
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getProviderIcon(integration.provider)}</span>
                    <div>
                      <p className="font-medium">{getProviderName(integration.provider)}</p>
                      <p className="text-sm text-gray-600">
                        Connected on {formatDate(integration.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {integration.is_active ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => disconnectMutation.mutate(integration.id)}
                      disabled={disconnectMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Connect New Calendar */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-600">Connect New Calendar</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => connectGoogleMutation.mutate()}
                disabled={connectGoogleMutation.isPending || integrations.some(i => i.provider === 'google' && i.is_active)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🗓️</span>
                  <div className="text-left">
                    <p className="font-medium">Google Calendar</p>
                    <p className="text-sm text-gray-600">Sync with Google Calendar</p>
                  </div>
                  {!integrations.some(i => i.provider === 'google' && i.is_active) && (
                    <Plus className="w-4 h-4 ml-auto" />
                  )}
                </div>
              </Button>

              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => connectOutlookMutation.mutate()}
                disabled={connectOutlookMutation.isPending || integrations.some(i => i.provider === 'outlook' && i.is_active)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  <div className="text-left">
                    <p className="font-medium">Outlook Calendar</p>
                    <p className="text-sm text-gray-600">Sync with Microsoft Outlook</p>
                  </div>
                  {!integrations.some(i => i.provider === 'outlook' && i.is_active) && (
                    <Plus className="w-4 h-4 ml-auto" />
                  )}
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Calendar Events */}
      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Calendar Events
            </CardTitle>
            <CardDescription>
              Events synced from your connected calendars
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {events.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-medium">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-gray-600 line-clamp-1">{event.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>{formatDate(event.start_time)}</span>
                      {event.location && (
                        <span className="flex items-center gap-1">
                          📍 {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSyncStatusBadge(event.sync_status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integration Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Benefits of Calendar Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-700">Automatic Sync</h4>
              <p className="text-gray-600">Case deadlines and appointments automatically appear in your calendar</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-700">Smart Reminders</h4>
              <p className="text-gray-600">Get notified before important legal deadlines and meetings</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-700">Better Organization</h4>
              <p className="text-gray-600">Keep all your legal work organized alongside your other commitments</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-700">Cross-Platform</h4>
              <p className="text-gray-600">Access your schedule from any device with calendar sync</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}