import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, Mail, Save } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [firstName, setFirstName] = useState(() => {
    if (user && typeof user === 'object' && 'firstName' in user && typeof user.firstName === 'string') {
      return user.firstName;
    }
    return '';
  });
  const [lastName, setLastName] = useState(() => {
    if (user && typeof user === 'object' && 'lastName' in user && typeof user.lastName === 'string') {
      return user.lastName;
    }
    return '';
  });
  const [email, setEmail] = useState(() => {
    if (user && typeof user === 'object' && 'email' in user && typeof user.email === 'string') {
      return user.email;
    }
    return '';
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; email: string }) => {
      const response = await apiRequest("PUT", "/api/auth/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({ firstName, lastName, email });
  };

  const getUserInitials = () => {
    if (firstName && typeof firstName === 'string' && lastName && typeof lastName === 'string') {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    if (firstName && typeof firstName === 'string') {
      return firstName.charAt(0).toUpperCase();
    }
    if (email && typeof email === 'string') {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Button 
              variant="ghost" 
              onClick={() => setLocation('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <h1 className="text-xl font-semibold">Profile Settings</h1>
            <div></div>
          </div>
        </div>
      </nav>

      {/* Profile Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary text-white text-xl">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="flex items-center justify-center space-x-2">
              <User className="h-5 w-5" />
              <span>Profile Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email" className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Email Address</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full md:w-auto flex items-center space-x-2"
                  disabled={updateProfileMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  <span>
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Account ID:</span> {(user && typeof user === 'object' && 'id' in user && typeof user.id === 'string' ? user.id : 'N/A')}
              </div>
              <div>
                <span className="font-medium">Member since:</span> {(user && typeof user === 'object' && 'createdAt' in user && user.createdAt) ? new Date(user.createdAt as string).toLocaleDateString() : 'N/A'}
              </div>
              <div>
                <span className="font-medium">Last updated:</span> {(user && typeof user === 'object' && 'updatedAt' in user && user.updatedAt) ? new Date(user.updatedAt as string).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}