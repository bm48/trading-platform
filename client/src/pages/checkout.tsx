import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Check if Stripe is configured
const STRIPE_ENABLED = !!import.meta.env.VITE_STRIPE_PUBLIC_KEY;
import { formatCurrency } from '@/lib/utils';
import { 
  Shield, 
  Check, 
  CreditCard, 
  ArrowLeft
} from 'lucide-react';

const stripePromise = STRIPE_ENABLED ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY) : null;

interface CheckoutFormProps {
  clientSecret: string;
  onSuccess: () => void;
}

function CheckoutForm({ clientSecret, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        onSuccess();
      }
    } catch (error) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CreditCard className="h-4 w-4" />
          <span>Payment Details</span>
        </div>
        <PaymentElement 
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            }
          }}
        />
      </div>
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
        size="lg"
      >
        {isProcessing ? "Processing..." : "Subscribe for $49/month"}
      </Button>
    </form>
  );
}

export default function Checkout() {
  const { user, session, loading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  // Create payment intent for monthly subscription
  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ 
          plan: 'subscription',
          amount: 4900, // $49.00 in cents
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
    },
  });

  const { data: paymentIntent, isLoading: isCreatingPayment } = useQuery({
    queryKey: ['payment-intent', 'subscription'],
    queryFn: () => createPaymentMutation.mutateAsync(),
    enabled: !!user && !paymentCompleted,
  });

  useEffect(() => {
    // Only redirect if we're not loading and user is definitely not authenticated
    if (!loading && !user) {
      setLocation('/');
    }
  }, [user, loading, setLocation]);

  // Auto-handle demo mode success
  useEffect(() => {
    if (paymentIntent?.demo_mode && paymentIntent?.status === 'succeeded') {
      handlePaymentSuccess();
    }
  }, [paymentIntent]);

  const handlePaymentSuccess = () => {
    setPaymentCompleted(true);
    toast({
      title: "Payment Successful!",
      description: "Welcome to Resolve AI. Your subscription is now active.",
    });
    setTimeout(() => {
      setLocation('/dashboard');
    }, 2000);
  };

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Only return null if user is definitely not authenticated after loading
  if (!user) {
    return null;
  }

  if (paymentCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600">Welcome to Resolve AI. Redirecting to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => setLocation('/')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Subscribe to Resolve AI</h1>
          <p className="text-gray-600 mt-2">Comprehensive legal support for Australian tradies</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Plan Details */}
          <div className="space-y-6">
            <Card className="border-2 border-blue-200 bg-blue-50/50">
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle className="text-2xl text-blue-900">$49/month</CardTitle>
                <p className="text-blue-700">Everything you need to resolve legal issues</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-600 mr-3" />
                    <span className="text-sm">Unlimited case creation & management</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-600 mr-3" />
                    <span className="text-sm">AI-powered legal analysis & strategy</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-600 mr-3" />
                    <span className="text-sm">Custom PDF document generation</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-600 mr-3" />
                    <span className="text-sm">Timeline tracking & deadlines</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-600 mr-3" />
                    <span className="text-sm">Document & photo storage</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-600 mr-3" />
                    <span className="text-sm">Calendar integration (Gmail/Outlook)</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-600 mr-3" />
                    <span className="text-sm">Email logging & tracking</span>
                  </li>
                  <li className="flex items-center">
                    <Check className="h-4 w-4 text-green-600 mr-3" />
                    <span className="text-sm">AI message assistant support</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!STRIPE_ENABLED ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">Payment processing is currently unavailable.</p>
                    <p className="text-sm text-gray-500">Stripe integration is not configured.</p>
                  </div>
                ) : isCreatingPayment ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                    <p className="text-gray-600">Setting up payment...</p>
                  </div>
                ) : paymentIntent?.demo_mode ? (
                  <div className="text-center py-8">
                    <h3 className="text-lg font-semibold mb-4">Demo Mode</h3>
                    <p className="text-gray-600 mb-6">Payment processing is in demo mode. Click below to simulate a successful subscription.</p>
                    <Button 
                      onClick={handlePaymentSuccess}
                      className="w-full"
                      size="lg"
                    >
                      Complete Demo Subscription
                    </Button>
                  </div>
                ) : paymentIntent?.client_secret ? (
                  <Elements stripe={stripePromise} options={{ clientSecret: paymentIntent.client_secret }}>
                    <CheckoutForm 
                      clientSecret={paymentIntent.client_secret}
                      onSuccess={handlePaymentSuccess}
                    />
                  </Elements>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-red-600 mb-4">Unable to initialize payment.</p>
                    <Button onClick={() => window.location.reload()}>
                      Try Again
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security & Trust */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-1" />
                    Secure Payment
                  </div>
                  <div>• SSL Encrypted</div>
                  <div>• Cancel Anytime</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}