import { ReactNode, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  FolderOpen, 
  FileText, 
  Settings, 
  LogOut,
  Home,
  User
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const currentTab = urlParams.get('tab');
  
  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      current: (location === '/dashboard' || location === '/') && !currentTab,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      current: location === '/settings',
    },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    console.log('Starting logout process...');
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name[0]}${user.user_metadata.last_name[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Plus className="h-8 w-8 text-primary mr-3" />
              <span className="text-xl font-bold text-neutral-dark">Project Resolve AI</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-neutral-medium hover:text-neutral-dark"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                {/* User Profile */}
                <div className="flex items-center mb-6">
                  <Link href="/dashboard">
                    <Avatar className="h-10 w-10 mr-3 cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all">
                      <AvatarImage src={user?.profileImageUrl} />
                      <AvatarFallback className="bg-primary text-white">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div>
                    <div className="font-semibold text-neutral-dark">
                      {user?.firstName && user?.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user?.email?.split('@')[0] || 'User'
                      }
                    </div>
                    <div className="text-sm text-neutral-medium">Tradesperson</div>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="space-y-2">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.name} href={item.href}>
                        <div
                          className={cn(
                            'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                            item.current
                              ? 'bg-primary text-white'
                              : 'text-neutral-medium hover:bg-gray-100 hover:text-neutral-dark'
                          )}
                        >
                          <Icon className="h-4 w-4 mr-3" />
                          {item.name}
                        </div>
                      </Link>
                    );
                  })}
                </nav>

                {/* Subscription Status */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm">
                    <div className="text-neutral-medium mb-1">Plan</div>
                    <div className="font-semibold text-neutral-dark">
                      {user?.stripeSubscriptionId ? 'Monthly Support' : 'Strategy Pack'}
                    </div>
                  </div>
                  {!user?.stripeSubscriptionId && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-3"
                      onClick={() => window.location.href = '/checkout?plan=subscription'}
                    >
                      Upgrade Plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
