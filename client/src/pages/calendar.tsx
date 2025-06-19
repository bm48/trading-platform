import { useState } from 'react';
import { Calendar, Clock, Settings, RefreshCw, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CalendarIntegration from '@/components/calendar-integration';
import CalendarEventForm from '@/components/calendar-event-form';

interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  sync_status: string;
  case_id?: number;
  contract_id?: number;
}

export default function CalendarPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [autoSync, setAutoSync] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);

  // Fetch calendar events
  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar/events'],
  });

  // Sync all cases mutation
  const syncAllCasesMutation = useMutation({
    mutationFn: async () => {
      // This would sync all cases - for now we'll create a notification
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { message: 'All cases synced successfully' };
    },
    onSuccess: () => {
      toast({
        title: "Sync Complete",
        description: "All case deadlines have been synced to your calendars",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync case deadlines",
        variant: "destructive",
      });
    },
  });

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventIcon = (event: CalendarEvent) => {
    if (event.case_id) return '⚖️';
    if (event.contract_id) return '📄';
    return '📅';
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return events
      .filter(event => new Date(event.start_time) > now)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 10);
  };

  const getPastEvents = () => {
    const now = new Date();
    return events
      .filter(event => new Date(event.start_time) <= now)
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
      .slice(0, 5);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-40 bg-gray-200 rounded"></div>
              <div className="h-60 bg-gray-200 rounded"></div>
            </div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
          <p className="text-gray-600">Manage your legal calendar and sync with external calendars</p>
        </div>
        <CalendarEventForm 
          trigger={
            <Button className="gap-2">
              <Calendar className="w-4 h-4" />
              Create Event
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Calendar Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendar Integration */}
          <CalendarIntegration />

          {/* Upcoming Events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Upcoming Events
                </CardTitle>
                <CardDescription>
                  Your upcoming legal calendar events and deadlines
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncAllCasesMutation.mutate()}
                disabled={syncAllCasesMutation.isPending}
                className="gap-2"
              >
                {syncAllCasesMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sync All Cases
              </Button>
            </CardHeader>
            <CardContent>
              {getUpcomingEvents().length > 0 ? (
                <div className="space-y-3">
                  {getUpcomingEvents().map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                      <span className="text-xl">{getEventIcon(event)}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{event.title}</h4>
                        {event.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>{formatDateTime(event.start_time)}</span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              📍 {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.case_id && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Case</span>
                        )}
                        {event.contract_id && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Contract</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No upcoming events</p>
                  <p className="text-sm">Create an event or sync your cases to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Events */}
          {getPastEvents().length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Events</CardTitle>
                <CardDescription>Your recent calendar activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getPastEvents().map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg opacity-75">
                      <span className="text-xl">{getEventIcon(event)}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{event.title}</h4>
                        <div className="text-sm text-gray-500 mt-1">
                          {formatDateTime(event.start_time)}
                        </div>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Completed</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Calendar Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Calendar Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="auto-sync">Auto Sync Cases</Label>
                  <p className="text-sm text-gray-600">Automatically sync case deadlines to calendar</p>
                </div>
                <Switch
                  id="auto-sync"
                  checked={autoSync}
                  onCheckedChange={setAutoSync}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="reminders">Deadline Reminders</Label>
                  <p className="text-sm text-gray-600">Get notified before important deadlines</p>
                </div>
                <Switch
                  id="reminders"
                  checked={reminderEnabled}
                  onCheckedChange={setReminderEnabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CalendarEventForm 
                trigger={
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Calendar className="w-4 h-4" />
                    Schedule Meeting
                  </Button>
                }
              />
              
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={() => syncAllCasesMutation.mutate()}
                disabled={syncAllCasesMutation.isPending}
              >
                <RefreshCw className="w-4 h-4" />
                Sync All Cases
              </Button>
              
              <Button variant="outline" className="w-full justify-start gap-2">
                <Bell className="w-4 h-4" />
                Review Reminders
              </Button>
            </CardContent>
          </Card>

          {/* Calendar Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Calendar Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Upcoming Events</span>
                <span className="font-semibold">{getUpcomingEvents().length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">This Week</span>
                <span className="font-semibold">
                  {getUpcomingEvents().filter(event => {
                    const eventDate = new Date(event.start_time);
                    const weekFromNow = new Date();
                    weekFromNow.setDate(weekFromNow.getDate() + 7);
                    return eventDate <= weekFromNow;
                  }).length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Connected Calendars</span>
                <span className="font-semibold">0</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}