import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function TestLogin() {
  const [, setLocation] = useLocation();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signIn(email, password);
      toast({
        title: 'Login successful!',
        description: 'Redirecting to checkout...',
      });
      setLocation('/checkout');
    } catch (error: any) {
      // If login fails, try to sign up
      try {
        await signUp(email, password, 'Test User');
        toast({
          title: 'Account created!',
          description: 'Please check your email for confirmation, then come back to login.',
        });
      } catch (signUpError: any) {
        toast({
          title: 'Authentication failed',
          description: signUpError.message || 'Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Quick Test Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button 
            onClick={handleLogin} 
            className="w-full" 
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login / Sign Up'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setLocation('/auth')} 
            className="w-full"
          >
            Go to Full Auth Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}