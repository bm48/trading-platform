import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import DashboardLayout from '@/components/dashboard-layout';
import { 
  User, 
  CreditCard, 
  Bell, 
  Shield, 
  Trash2,
  Edit,
  Save,
  X,
  Mail,
  Calendar,
  Link,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Integration states
  const [integrations, setIntegrations] = useState({
    email: {
      connected: false,
      provider: null,
      email: '',
    },
    calendar: {
      connected: false,
      provider: null,
      syncEnabled: false,
    }
  });

  // Fetch subscription status
  const { data: subscription } = useQuery({
    queryKey: ['/api/subscription/status'],
    enabled: !!user,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', '/api/auth/profile', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  // Email integration mutation
  const connectEmailMutation = useMutation({
    mutationFn: async (provider: string) => {
      return await apiRequest('POST', '/api/integrations/email/connect', { provider });
    },
    onSuccess: (data) => {
      setIntegrations(prev => ({
        ...prev,
        email: {
          connected: true,
          provider: data.provider,
          email: data.email,
        }
      }));
      toast({
        title: "Email Connected",
        description: "Your email account has been successfully connected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect email account.",
        variant: "destructive",
      });
    },
  });

  // Calendar integration mutation
  const connectCalendarMutation = useMutation({
    mutationFn: async (provider: string) => {
      if (provider === 'google') {
        // Use the new Supabase Google OAuth integration
        return await apiRequest('POST', '/api/calendar/connect/google', {});
      }
      if (provider === 'microsoft') {
        // For Microsoft Calendar, show that it's not configured
        throw new Error('Microsoft Calendar integration is not configured. Please contact support for setup.');
      }
      return await apiRequest('POST', '/api/integrations/calendar/connect', { provider });
    },
    onSuccess: (data) => {
      setIntegrations(prev => ({
        ...prev,
        calendar: {
          connected: true,
          provider: data.provider,
          syncEnabled: true,
        }
      }));
      toast({
        title: "Calendar Connected",
        description: "Your calendar has been successfully connected for date synchronization.",
      });
    },
    onError: (error: any) => {
      let errorMessage = "This calendar integration is not currently available.";
      
      // Handle specific Google OAuth verification error
      if (error.message && (
        error.message.includes('verification process') ||
        error.message.includes('access_denied') ||
        error.message.includes('has not completed')
      )) {
        errorMessage = "Google Calendar integration requires domain verification. This feature is temporarily unavailable during development. Please contact support for assistance.";
      } else if (error.message && error.message.includes('Microsoft Calendar')) {
        errorMessage = "Microsoft Calendar integration is not configured. Please contact support for setup.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Calendar Integration Not Available",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Disconnect integration mutation
  const disconnectIntegrationMutation = useMutation({
    mutationFn: async ({ type, provider }: { type: string; provider: string }) => {
      return await apiRequest('POST', `/api/integrations/${type}/disconnect`, { provider });
    },
    onSuccess: (_, variables) => {
      if (variables.type === 'email') {
        setIntegrations(prev => ({
          ...prev,
          email: { connected: false, provider: null, email: '' }
        }));
      } else if (variables.type === 'calendar') {
        setIntegrations(prev => ({
          ...prev,
          calendar: { connected: false, provider: null, syncEnabled: false }
        }));
      }
      toast({
        title: "Integration Disconnected",
        description: `Your ${variables.type} integration has been disconnected.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect integration.",
        variant: "destructive",
      });
    },
  });

  // Initialize profile data when user loads
  useState(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  };

  const getSubscriptionBadge = () => {
    if (!subscription) return null;
    
    const { planType, status } = subscription;
    
    if (planType === 'monthly_subscription') {
      return <Badge className="bg-green-100 text-green-800">Monthly Subscription</Badge>;
    } else if (planType === 'strategy_pack') {
      return <Badge className="bg-blue-100 text-blue-800">Strategy Pack</Badge>;
    } else {
      return <Badge variant="secondary">No Active Plan</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">Settings</h1>
          <p className="text-neutral-medium">Manage your account settings and preferences</p>
        </div>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Profile Information</CardTitle>
              </div>
              {!isEditingProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingProfile(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                {isEditingProfile ? (
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    placeholder="Enter first name"
                  />
                ) : (
                  <p className="mt-1 text-neutral-dark">{user?.firstName || 'Not set'}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                {isEditingProfile ? (
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    placeholder="Enter last name"
                  />
                ) : (
                  <p className="mt-1 text-neutral-dark">{user?.lastName || 'Not set'}</p>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email Address</Label>
              {isEditingProfile ? (
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              ) : (
                <p className="mt-1 text-neutral-dark">{user?.email || 'Not set'}</p>
              )}
            </div>

            {isEditingProfile && (
              <div className="flex items-center space-x-2 pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Subscription & Billing</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-neutral-dark">Current Plan</h3>
                <p className="text-sm text-neutral-medium">
                  {subscription?.planType === 'monthly_subscription' 
                    ? 'Unlimited case creation with monthly billing'
                    : subscription?.planType === 'strategy_pack'
                    ? `Strategy pack with ${subscription.strategyPacksRemaining || 0} cases remaining`
                    : 'No active subscription'
                  }
                </p>
              </div>
              {getSubscriptionBadge()}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-neutral-medium">Account Status</span>
                <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
                  {subscription?.status || 'Inactive'}
                </Badge>
              </div>
              
              {subscription?.planType === 'strategy_pack' && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-medium">Strategy Packs Remaining</span>
                  <span className="font-medium">{subscription.strategyPacksRemaining || 0}</span>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-4">
              {/* Show pricing structure clearly */}
              <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                <h4 className="font-medium text-blue-900">How Our Pricing Works</h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <div className="font-medium">Step 1: Required Initial Sign-Up Fee</div>
                  <div className="pl-4">• Pay $299 Strategy Pack to get started</div>
                  <div className="pl-4">• This gives you access to our platform and case creation</div>
                  
                  <div className="font-medium pt-2">Step 2: Optional Monthly Subscription</div>
                  <div className="pl-4">• Only available AFTER paying the $299 initial fee</div>
                  <div className="pl-4">• Upgrade to $49/month for unlimited cases</div>
                </div>
                <div className="bg-blue-100 p-2 rounded text-xs text-blue-900 font-medium">
                  Monthly subscription access requires payment of the $299 initial sign-up fee first
                </div>
              </div>

              <div className="flex space-x-2">
                {/* Strategy Pack Button - Always available for new users */}
                {!subscription?.hasInitialStrategyPack && (
                  <Button variant="default" asChild>
                    <a href="/checkout?plan=strategy">Get Started - $299 Strategy Pack</a>
                  </Button>
                )}

                {/* Monthly Subscription - Only available after strategy pack purchase */}
                {subscription?.hasInitialStrategyPack && subscription?.planType !== 'monthly_subscription' && (
                  <Button variant="outline" asChild>
                    <a href="/checkout?plan=subscription">Upgrade to $49/month</a>
                  </Button>
                )}

                {/* Additional Strategy Packs for existing customers */}
                {subscription?.hasInitialStrategyPack && subscription?.planType === 'strategy_pack' && (
                  <Button variant="outline" asChild>
                    <a href="/checkout?plan=strategy">Buy More Strategy Packs</a>
                  </Button>
                )}
              </div>

              {/* Show restriction message for monthly subscription */}
              {!subscription?.hasInitialStrategyPack && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    🔒 Monthly Subscription Access Locked
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    You must pay the $299 initial sign-up fee before you can access the monthly subscription option.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Email Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Email Integration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-neutral-dark">Connect Your Email</h3>
                <p className="text-sm text-neutral-medium">
                  Sync your email to receive case updates and automated legal correspondence
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {integrations.email.connected ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {integrations.email.connected ? (
              <div className="space-y-3">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-900">Email Connected</h4>
                      <p className="text-sm text-green-700">
                        {integrations.email.email} via {integrations.email.provider}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => disconnectIntegrationMutation.mutate({ 
                        type: 'email', 
                        provider: integrations.email.provider 
                      })}
                      disabled={disconnectIntegrationMutation.isPending}
                    >
                      {disconnectIntegrationMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-neutral-medium">
                  <div className="space-y-1">
                    <div>✓ Receive case status updates</div>
                    <div>✓ Get notified of legal deadlines</div>
                    <div>✓ Automated correspondence delivery</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => connectEmailMutation.mutate('gmail')}
                    disabled={connectEmailMutation.isPending}
                  >
                    <Mail className="h-6 w-6 text-red-500" />
                    <span className="font-medium">Gmail</span>
                    <span className="text-xs text-neutral-medium">Connect with Google</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => connectEmailMutation.mutate('outlook')}
                    disabled={connectEmailMutation.isPending}
                  >
                    <Mail className="h-6 w-6 text-blue-500" />
                    <span className="font-medium">Outlook</span>
                    <span className="text-xs text-neutral-medium">Connect with Microsoft</span>
                  </Button>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Why Connect Your Email?</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>• Automatic case update notifications</div>
                    <div>• Legal deadline reminders</div>
                    <div>• Seamless document delivery</div>
                    <div>• Professional correspondence tracking</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar Integration */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle>Calendar Integration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-neutral-dark">Sync Your Calendar</h3>
                <p className="text-sm text-neutral-medium">
                  Automatically sync legal deadlines and case milestones to your calendar
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {integrations.calendar.connected ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Syncing
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Syncing
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {integrations.calendar.connected ? (
              <div className="space-y-3">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-900">Calendar Connected</h4>
                      <p className="text-sm text-green-700">
                        Syncing with {integrations.calendar.provider} Calendar
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => disconnectIntegrationMutation.mutate({ 
                        type: 'calendar', 
                        provider: integrations.calendar.provider 
                      })}
                      disabled={disconnectIntegrationMutation.isPending}
                    >
                      {disconnectIntegrationMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-neutral-medium">
                  <div className="space-y-1">
                    <div>✓ Legal deadline reminders</div>
                    <div>✓ Court date notifications</div>
                    <div>✓ Payment due date alerts</div>
                    <div>✓ Case milestone tracking</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => connectCalendarMutation.mutate('google')}
                    disabled={connectCalendarMutation.isPending}
                  >
                    <Calendar className="h-6 w-6 text-blue-500" />
                    <span className="font-medium">Google Calendar</span>
                    <span className="text-xs text-neutral-medium">Sync with Google</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => connectCalendarMutation.mutate('microsoft')}
                    disabled={connectCalendarMutation.isPending}
                  >
                    <Calendar className="h-6 w-6 text-orange-500" />
                    <span className="font-medium">Outlook Calendar</span>
                    <span className="text-xs text-neutral-medium">Sync with Microsoft</span>
                  </Button>
                </div>
                
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-900 mb-2">Calendar Sync Benefits</h4>
                  <div className="text-sm text-purple-800 space-y-1">
                    <div>• Never miss a legal deadline</div>
                    <div>• Automatic court date reminders</div>
                    <div>• Payment due date notifications</div>
                    <div>• Case milestone tracking</div>
                    <div>• Cross-device synchronization</div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-neutral-dark">Account Security</h3>
                <p className="text-sm text-neutral-medium">
                  Your account is secured with session-based authentication
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-neutral-dark">Sign Out</h3>
                <p className="text-sm text-neutral-medium">
                  Sign out of your account on this device
                </p>
              </div>
              <Button variant="outline" onClick={logout}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-neutral-dark">Email Notifications</h3>
                  <p className="text-sm text-neutral-medium">
                    Receive updates about your cases and account
                  </p>
                </div>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}