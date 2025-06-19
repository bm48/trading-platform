import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Download, 
  Upload, 
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';

interface CalendarIntegration {
  id: number;
  provider: 'google' | 'microsoft';
  is_active: boolean;
  updated_at: string;
  calendar_id?: string;
}

interface SyncStatus {
  integrations: number;
  activeIntegrations: number;
  totalEvents: number;
  syncedEvents: number;
  lastSyncTimes: Array<{
    provider: string;
    lastSync: string;
  }>;
}

export default function CalendarSyncDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIntegration, setSelectedIntegration] = useState<number | null>(null);

  // Fetch integrations and sync status
  const { data: integrations = [], isLoading: integrationsLoading } = useQuery<CalendarIntegration[]>({
    queryKey: ['/api/calendar/integrations'],
  });

  const { data: syncStatus, isLoading: statusLoading } = useQuery<SyncStatus>({
    queryKey: ['/api/calendar/sync-status'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Sync mutations
  const syncAllCasesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/calendar/sync/all-cases');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "All Cases Synced",
        description: `Successfully synced ${data.synced} cases with ${data.errors.length} errors`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/sync-status'] });
    },
    onError: () => {
      toast({
        title: "Sync Failed",
        description: "Failed to sync all cases to calendars",
        variant: "destructive",
      });
    },
  });

  const syncFromExternalMutation = useMutation({
    mutationFn: async (integrationId: number) => {
      const response = await apiRequest('POST', `/api/calendar/sync/from-external/${integrationId}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import Complete",
        description: `Imported ${data.events.length} events from external calendar`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/sync-status'] });
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "Failed to import events from external calendar",
        variant: "destructive",
      });
    },
  });

  const syncUpdatesMutation = useMutation({
    mutationFn: async (integrationId: number) => {
      const response = await apiRequest('POST', `/api/calendar/sync/updates/${integrationId}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Updates Synced",
        description: `Updated ${data.updated} events, created ${data.created} new events`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/sync-status'] });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to sync calendar updates",
        variant: "destructive",
      });
    },
  });

  const getSyncProgress = () => {
    if (!syncStatus) return 0;
    return syncStatus.totalEvents > 0 ? (syncStatus.syncedEvents / syncStatus.totalEvents) * 100 : 0;
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google': return '📅';
      case 'microsoft': return '📆';
      default: return '🗓️';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'google': return 'Google Calendar';
      case 'microsoft': return 'Outlook Calendar';
      default: return 'Calendar';
    }
  };

  if (integrationsLoading || statusLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sync Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Calendar Sync Status
          </CardTitle>
          <CardDescription>
            Monitor and manage your calendar synchronization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {syncStatus?.activeIntegrations || 0}
              </div>
              <div className="text-sm text-gray-600">Active Integrations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {syncStatus?.syncedEvents || 0}
              </div>
              <div className="text-sm text-gray-600">Synced Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {syncStatus?.totalEvents || 0}
              </div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {getSyncProgress().toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Sync Progress</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Synchronization Progress</span>
              <span>{getSyncProgress().toFixed(1)}%</span>
            </div>
            <Progress value={getSyncProgress()} className="h-2" />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => syncAllCasesMutation.mutate()}
              disabled={syncAllCasesMutation.isPending}
              className="gap-2"
            >
              {syncAllCasesMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              Sync All Cases
            </Button>
            
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/calendar/sync-status'] })}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendar Integrations
          </CardTitle>
          <CardDescription>
            Manage your connected calendar services
          </CardDescription>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">No Calendar Integrations</h3>
              <p className="text-sm">Connect your Google or Outlook calendar to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div 
                  key={integration.id} 
                  className={`p-4 border rounded-lg transition-colors ${
                    selectedIntegration === integration.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getProviderIcon(integration.provider)}</span>
                      <div>
                        <h4 className="font-semibold">{getProviderName(integration.provider)}</h4>
                        <p className="text-sm text-gray-600">
                          Last synced: {format(new Date(integration.updated_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={integration.is_active ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {integration.is_active ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {integration.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>

                  {integration.is_active && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncFromExternalMutation.mutate(integration.id)}
                        disabled={syncFromExternalMutation.isPending}
                        className="gap-2"
                      >
                        {syncFromExternalMutation.isPending ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        Import Events
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncUpdatesMutation.mutate(integration.id)}
                        disabled={syncUpdatesMutation.isPending}
                        className="gap-2"
                      >
                        {syncUpdatesMutation.isPending ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        Sync Updates
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedIntegration(
                          selectedIntegration === integration.id ? null : integration.id
                        )}
                        className="gap-2"
                      >
                        <Settings className="w-3 h-3" />
                        Settings
                      </Button>
                    </div>
                  )}

                  {selectedIntegration === integration.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="text-sm">
                        <strong>Integration Details:</strong>
                        <div className="mt-2 space-y-1 text-gray-600">
                          <div>ID: {integration.id}</div>
                          <div>Calendar ID: {integration.calendar_id || 'Primary'}</div>
                          <div>Provider: {integration.provider}</div>
                          <div>Status: {integration.is_active ? 'Active' : 'Inactive'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Sync Times */}
      {syncStatus?.lastSyncTimes && syncStatus.lastSyncTimes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Sync Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {syncStatus.lastSyncTimes.map((sync, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span>{getProviderIcon(sync.provider)}</span>
                    <span className="font-medium">{getProviderName(sync.provider)}</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {format(new Date(sync.lastSync), 'PPp')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}