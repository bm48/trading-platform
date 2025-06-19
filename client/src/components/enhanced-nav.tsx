import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Home, 
  FileText, 
  Calendar, 
  Settings, 
  User, 
  LogOut,
  Shield,
  PlusCircle
} from "lucide-react";
import NotificationBar from "./notification-bar";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: <Home className="w-4 h-4" /> },
  { path: "/case/new", label: "New Case", icon: <PlusCircle className="w-4 h-4" /> },
  { path: "/calendar", label: "Calendar", icon: <Calendar className="w-4 h-4" /> },
  { path: "/admin", label: "Admin", icon: <Shield className="w-4 h-4" />, adminOnly: true },
];

export default function EnhancedNav() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const handleLogout = async () => {
    // Clear auth state and redirect
    localStorage.removeItem('auth-token');
    window.location.href = '/';
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  const isActivePath = (path: string) => {
    if (path === '/dashboard') {
      return location === '/' || location === '/dashboard';
    }
    return location.startsWith(path);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-8">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">R+</span>
                </div>
                <span className="font-bold text-xl text-gray-900">Project Resolve AI</span>
              </div>
            </Link>

            {/* Navigation Items */}
            <div className="hidden md:flex items-center gap-1">
              {navItems
                .filter(item => !item.adminOnly || user.role === 'admin')
                .map((item) => (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActivePath(item.path) ? "default" : "ghost"}
                    size="sm"
                    className={`gap-2 ${
                      isActivePath(item.path) 
                        ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                    {item.adminOnly && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                        Admin
                      </Badge>
                    )}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            {/* Notification Bar */}
            <NotificationBar />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(user.firstName, user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">
                    {user.firstName || user.email?.split('@')[0] || 'User'}
                  </span>
                  {user.role === 'admin' && (
                    <Badge variant="outline" className="hidden sm:inline h-5 px-1 text-xs">
                      Admin
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm text-gray-500">
                  Signed in as {user.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                {user.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="flex items-center justify-around py-2 px-4">
          {navItems
            .filter(item => !item.adminOnly || user.role === 'admin')
            .slice(0, 4)
            .map((item) => (
            <Link key={item.path} href={item.path}>
              <Button
                variant="ghost"
                size="sm"
                className={`flex flex-col gap-1 h-auto py-2 px-3 ${
                  isActivePath(item.path) 
                    ? "text-blue-600" 
                    : "text-gray-600"
                }`}
              >
                {item.icon}
                <span className="text-xs">{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}