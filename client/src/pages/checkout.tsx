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

import { formatCurrency } from '@/lib/utils';
import { formatDate } from '@/lib/date-utils';
import { 
  Shield, 
  Check, 
  CreditCard, 
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';

// Check if Stripe is configured
const STRIPE_ENABLED = !!import.meta.env.VITE_STRIPE_PUBLIC_KEY;

interface SubscriptionStatus {
  planType: string;
  status: string;
  canCreateCases: boolean;
  subscriptionExpiresAt?: string;
  message?: string;
}

const stripePromise = STRIPE_ENABLED ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY) : null;

interface DemoPaymentFormProps {
  onComplete: () => void;
}

function DemoPaymentForm({ onComplete }: DemoPaymentFormProps) {
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiry: '',
    cvc: '',
    name: ''
  });
  const [isFormValid, setIsFormValid] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Check if form is valid
  useEffect(() => {
    const isValid = formData.cardNumber.replace(/\s/g, '').length >= 16 && 
                   formData.expiry.length >= 5 && 
                   formData.cvc.length >= 3 && 
                   formData.name.length >= 2;
    setIsFormValid(isValid);
  }, [formData]);

  const formatCardNumber = (value: string) => {
    return value.replace(/\s+/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').trim().slice(0, 19);
  };

  const formatExpiry = (value: string) => {
    return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5);
  };

  const formatCVC = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 4);
  };

  return (
    <div className="py-8">
      <h3 className="text-lg font-semibold mb-4 text-center">Payment Details</h3>
      <p className="text-gray-600 mb-6 text-center">Enter your payment information to complete your $49/month subscription.</p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
          <input 
            type="text" 
            placeholder="1234 5678 9012 3456" 
            value={formData.cardNumber}
            onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
            <input 
              type="text" 
              placeholder="MM/YY" 
              value={formData.expiry}
              onChange={(e) => handleInputChange('expiry', formatExpiry(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
            <input 
              type="text" 
              placeholder="123" 
              value={formData.cvc}
              onChange={(e) => handleInputChange('cvc', formatCVC(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>
          <input 
            type="text" 
            placeholder="Full name as shown on card" 
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <Button 
        onClick={onComplete}
        disabled={!isFormValid}
        className="w-full mt-6"
        size="lg"
      >
        Subscribe for $49/month
      </Button>
      
      {!isFormValid && (
        <p className="text-sm text-gray-500 text-center mt-2">
          Please fill out all fields to continue
        </p>
      )}
    </div>
  );
}

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

  // Check if user already has an active subscription
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
    enabled: !!user,
  });

  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

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
    onSuccess: (data) => {
      setPaymentIntent(data);
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Payment Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartPayment = async () => {
    setIsCreatingPayment(true);
    try {
      await createPaymentMutation.mutateAsync();
    } finally {
      setIsCreatingPayment(false);
    }
  };

  useEffect(() => {
    // Only redirect if we're not loading and user is definitely not authenticated
    if (!loading && !user) {
      setLocation('/');
    }
  }, [user, loading, setLocation]);

  // Don't auto-handle demo mode - require user action

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
  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user already has an active monthly subscription
  if (subscriptionStatus?.planType === 'monthly_subscription' && subscriptionStatus?.status === 'active') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-amber-200 bg-amber-50">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-amber-800 mb-2">You Already Subscribed for Monthly Plan</h2>
            <p className="text-amber-700 mb-4">
              You already have an active monthly subscription to Resolve AI. 
            </p>
            <p className="text-sm text-amber-600 mb-6">
              Your subscription {subscriptionStatus.subscriptionExpiresAt ? 
                `expires on ${formatDate(subscriptionStatus.subscriptionExpiresAt)}` : 
                'is currently active'}.
            </p>
            <div className="space-y-3">
              <Button onClick={() => setLocation('/dashboard')} className="w-full bg-blue-600 hover:bg-blue-700">
                Go to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/')} 
                className="w-full"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
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
                ) : !paymentIntent ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">Ready to start your subscription?</p>
                    <Button 
                      onClick={handleStartPayment} 
                      disabled={isCreatingPayment}
                      className="w-full"
                    >
                      {isCreatingPayment ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Setting up payment...
                        </>
                      ) : (
                        'Start Subscription'
                      )}
                    </Button>
                  </div>
                ) : paymentIntent?.demo_mode ? (
                  <DemoPaymentForm onComplete={handlePaymentSuccess} />
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
                    <Button onClick={handleStartPayment}>
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