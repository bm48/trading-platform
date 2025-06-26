import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Check if Stripe is configured
const STRIPE_ENABLED = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
import { formatCurrency } from '@/lib/utils';
import { 
  Shield, 
  Check, 
  CreditCard, 
  FileText, 
  Calendar, 
  Clock,
  DollarSign,
  Star,
  ArrowLeft
} from 'lucide-react';

const stripePromise = STRIPE_ENABLED ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) : null;

interface CheckoutFormProps {
  clientSecret: string;
  plan: 'strategy' | 'subscription';
  onSuccess: () => void;
}

function CheckoutForm({ clientSecret, plan, onSuccess }: CheckoutFormProps) {
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
        toast({
          title: "Payment Successful!",
          description: plan === 'subscription' 
            ? "You're now subscribed to monthly support!" 
            : "Your strategy pack will be ready in 24-48 hours.",
        });
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        className="w-full btn-accent text-lg py-4"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="h-5 w-5 mr-2" />
            {plan === 'subscription' 
              ? `Pay ${formatCurrency(299)} + Subscribe ${formatCurrency(49)}/month`
              : `Pay ${formatCurrency(299)} - Strategy Pack`
            }
          </>
        )}
      </Button>
    </form>
  );
}

export default function Checkout() {
  const { isAuthenticated, user } = useAuth();
  const params = useParams();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedPlan, setSelectedPlan] = useState<'strategy' | 'subscription'>('strategy');
  const [clientSecret, setClientSecret] = useState('');
  const [applicationData, setApplicationData] = useState<any>(null);

  // If Stripe is not configured, show configuration message
  if (!STRIPE_ENABLED) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payment Processing Not Configured</h2>
            <p className="text-gray-600 mb-4">
              Payment processing is not available yet. The platform administrator needs to configure Stripe payment processing.
            </p>
            <Button onClick={() => navigate('/dashboard')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check for plan in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    if (planParam === 'subscription') {
      setSelectedPlan('subscription');
    }
  }, [location]);

  // Fetch application data if this is a completion flow
  const { data: application } = useQuery({
    queryKey: ['/api/applications', params.id],
    queryFn: async () => {
      if (!params.id) return null;
      const response = await fetch(`/api/applications/${params.id}`);
      if (!response.ok) throw new Error('Application not found');
      return response.json();
    },
    enabled: !!params.id,
  });

  // Create payment intent
  const createPayment = useMutation({
    mutationFn: async (plan: 'strategy' | 'subscription') => {
      const endpoint = plan === 'subscription' ? '/api/create-subscription' : '/api/create-payment-intent';
      const response = await apiRequest('POST', endpoint, { amount: 29900 });
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isAuthenticated && selectedPlan) {
      createPayment.mutate(selectedPlan);
    }
  }, [isAuthenticated, selectedPlan]);

  const handlePaymentSuccess = () => {
    // Redirect to dashboard after successful payment
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-dark mb-4">Login Required</h2>
            <p className="text-neutral-medium mb-6">Please log in to proceed with payment</p>
            <Button onClick={() => window.location.href = '/api/login'} className="w-full">
              Login to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Shield className="h-6 w-6 text-primary mr-2" />
              <span className="text-lg font-semibold">TradeGuard AI</span>
            </div>
            <Badge variant="outline">Secure Checkout</Badge>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Application Context */}
        {application && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-dark">Application Approved!</h3>
                  <p className="text-neutral-medium">
                    Your case has been reviewed and approved. Complete payment to receive your strategy pack.
                  </p>
                </div>
                <Badge className="bg-success/10 text-success border-success/20">
                  Approved
                </Badge>
              </div>
              <div className="grid md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-sm text-neutral-medium">Issue Type</p>
                  <p className="font-medium">{application.issueType}</p>
                </div>
                <div>
                  <p className="text-sm text-neutral-medium">Amount</p>
                  <p className="font-medium">
                    {application.amount ? formatCurrency(application.amount) : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-medium">Trade</p>
                  <p className="font-medium">{application.trade}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Plan Selection */}
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-neutral-dark mb-2">Choose Your Plan</h1>
              <p className="text-neutral-medium">Select the option that best fits your needs</p>
            </div>

            <Tabs value={selectedPlan} onValueChange={(value) => setSelectedPlan(value as 'strategy' | 'subscription')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="strategy">Strategy Pack</TabsTrigger>
                <TabsTrigger value="subscription">
                  <div className="flex items-center gap-2">
                    Pack + Support
                    <Star className="h-3 w-3" />
                  </div>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="strategy">
                <Card className="border-2 border-primary/20">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">Strategy Pack</CardTitle>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{formatCurrency(299)}</div>
                        <div className="text-sm text-neutral-medium">One-time payment</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-success mr-3" />
                        <span className="text-sm">AI-powered legal analysis</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-success mr-3" />
                        <span className="text-sm">Custom strategy plan</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-success mr-3" />
                        <span className="text-sm">Legal documents generated</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-success mr-3" />
                        <span className="text-sm">Step-by-step action plan</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-success mr-3" />
                        <span className="text-sm">Portal access for 12 months</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-success mr-3" />
                        <span className="text-sm">Document storage</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="subscription">
                <Card className="border-2 border-accent">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl">Strategy Pack + Support</CardTitle>
                        <Badge className="bg-accent text-white mt-1">Most Popular</Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-accent">{formatCurrency(299)} + {formatCurrency(49)}</div>
                        <div className="text-sm text-neutral-medium">One-time + monthly</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-success mr-3" />
                        <span className="text-sm">Everything in Strategy Pack</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-success mr-3" />
                        <span className="text-sm">Monthly strategy reviews</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-success mr-3" />
                        <span className="text-sm">Additional document generation</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-success mr-3" />
                        <span className="text-sm">Email support (48hr response)</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-success mr-3" />
                        <span className="text-sm">New case support</span>
                      </li>
                      <li className="flex items-center">
                        <Check className="h-4 w-4 text-success mr-3" />
                        <span className="text-sm">Contract generation tools</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* What You Get */}
            <Card className="bg-blue-50">
              <CardContent className="p-6">
                <h3 className="font-semibold text-neutral-dark mb-4 flex items-center">
                  <Clock className="h-5 w-5 text-primary mr-2" />
                  What happens after payment?
                </h3>
                <div className="space-y-3 text-sm text-neutral-dark">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs mr-3">1</div>
                    <span>Payment confirmation and case creation</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs mr-3">2</div>
                    <span>AI analysis begins immediately</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs mr-3">3</div>
                    <span>Strategy pack ready in 24-48 hours</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs mr-3">4</div>
                    <span>Access your dashboard and documents</span>
                  </div>
                </div>
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
                {createPayment.isPending ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : clientSecret ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <CheckoutForm 
                      clientSecret={clientSecret} 
                      plan={selectedPlan}
                      onSuccess={handlePaymentSuccess}
                    />
                  </Elements>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-neutral-medium">Loading payment form...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="flex items-center text-sm text-neutral-medium">
                  <Shield className="h-4 w-4 mr-2" />
                  <span>Your payment is secured by Stripe. We never store your card details.</span>
                </div>
              </CardContent>
            </Card>

            {/* Money Back Guarantee */}
            <Card className="border-success/20 bg-success/5">
              <CardContent className="p-4">
                <div className="flex items-center text-sm text-success">
                  <Check className="h-4 w-4 mr-2" />
                  <span className="font-medium">100% Money-back guarantee if we can't help with your case</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
