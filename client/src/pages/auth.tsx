import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const { user, isAuthenticated, signInWithGoogle, signUp, signIn } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode') || 'signup';
  const redirect = urlParams.get('redirect') || 'dashboard';
  const confirmed = urlParams.get('confirmed') === 'true';
  const isConfirmationPage = window.location.pathname === '/auth/confirm';

  useEffect(() => {
    if (isAuthenticated && user) {
      // User is already authenticated, redirect appropriately
      if (redirect === 'checkout') {
        setLocation('/checkout?subscription=monthly');
      } else {
        setLocation('/dashboard');
      }
    }
  }, [isAuthenticated, user, redirect, setLocation]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      // Redirect will be handled by useEffect after authentication
    } catch (error) {
      console.error('Authentication failed:', error);
      toast({
        title: "Authentication failed",
        description: "Please try again or contact support.",
        variant: "destructive"
      });
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signup' && !isConfirmationPage) {
        if (!fullName || !email || !password) {
          toast({
            title: "Missing information",
            description: "Please fill in all fields.",
            variant: "destructive"
          });
          return;
        }

        const result = await signUp(email, password, fullName);
        
        // Check if email confirmation is required
        if (result.user && !result.user.email_confirmed_at) {
          toast({
            title: "Check your email!",
            description: "We've sent you a confirmation link. Please check your email and click the link to continue.",
          });
          
          // Clear form but don't redirect - wait for email confirmation
          setEmail('');
          setPassword('');
          setFullName('');
          setLoading(false);
          return;
        }
        
        toast({
          title: "Account created!",
          description: "Welcome to Resolve AI. Redirecting to subscription...",
        });
      } else {
        if (!email || !password) {
          toast({
            title: "Missing information",
            description: "Please enter your email and password.",
            variant: "destructive"
          });
          return;
        }

        await signIn(email, password);
        toast({
          title: "Welcome back!",
          description: "Redirecting to your dashboard...",
        });
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      toast({
        title: "Authentication failed", 
        description: error instanceof Error ? error.message : "Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Redirecting...</h2>
            <p className="text-gray-600">Taking you to your dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isConfirmationPage 
                ? 'Email Confirmed!' 
                : mode === 'signup' 
                ? 'Create Your Account' 
                : 'Welcome Back'
              }
            </h1>
            <p className="text-gray-600">
              {isConfirmationPage 
                ? 'Your email has been confirmed. Please sign in to continue to your subscription.'
                : mode === 'signup' 
                ? 'Get started with your monthly subscription to Resolve AI' 
                : 'Sign in to access your legal dashboard'
              }
            </p>
          </div>

          <div className="space-y-6">
            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === 'signup' && !isConfirmationPage && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  'Processing...'
                ) : isConfirmationPage || mode === 'login' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <Button 
              onClick={handleGoogleSignIn}
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </Button>

            <div className="text-center text-sm text-gray-500">
              {isConfirmationPage ? (
                <>
                  Need to sign up instead? 
                  <button 
                    onClick={() => window.location.href = '/auth?mode=signup'}
                    className="text-blue-600 hover:underline ml-1"
                  >
                    Create account
                  </button>
                </>
              ) : mode === 'signup' ? (
                <>
                  By signing up, you agree to our Terms of Service and Privacy Policy.
                  <br />
                  Already have an account? 
                  <button 
                    onClick={() => window.location.href = '/auth?mode=login&redirect=' + redirect}
                    className="text-blue-600 hover:underline ml-1"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Don't have an account? 
                  <button 
                    onClick={() => window.location.href = '/auth?mode=signup&redirect=' + redirect}
                    className="text-blue-600 hover:underline ml-1"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}