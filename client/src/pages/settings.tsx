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
  X
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  // Fetch subscription status
  const { data: subscription } = useQuery({
    queryKey: ['/api/subscription/status'],
    enabled: !!user,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('PUT', '/api/auth/profile', data);
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
              <Button variant="outline" asChild>
                <a href="/api/auth/logout">Sign Out</a>
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