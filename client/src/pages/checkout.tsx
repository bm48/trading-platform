import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Shield, 
  Check, 
  CreditCard, 
  ArrowLeft,
  Building,
  User,
  MapPin,
  Briefcase
} from 'lucide-react';

// Form validation schema
const checkoutFormSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  businessName: z.string().optional(),
  abn: z.string().optional(),
  address: z.string().min(5, 'Please provide a valid address'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postcode: z.string().min(4, 'Postcode must be at least 4 digits'),
  tradeType: z.string().min(1, 'Please select your trade type'),
  experience: z.string().min(1, 'Please select your experience level'),
  specialization: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutFormSchema>;

const AUSTRALIAN_STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
];

const TRADE_TYPES = [
  'Plumber',
  'Electrician',
  'Carpenter',
  'Painter',
  'Tiler',
  'Roofer',
  'Landscaper',
  'Builder',
  'Concreter',
  'Glazier',
  'HVAC Technician',
  'Other'
];

const EXPERIENCE_LEVELS = [
  'Less than 1 year',
  '1-3 years',
  '3-5 years',
  '5-10 years',
  '10+ years'
];

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'details' | 'payment'>('details');

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: user?.email || '',
      phone: '',
      businessName: '',
      abn: '',
      address: '',
      city: '',
      state: '',
      postcode: '',
      tradeType: '',
      experience: '',
      specialization: '',
    },
  });

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/auth');
    }
  }, [isAuthenticated, setLocation]);

  const subscriptionMutation = useMutation({
    mutationFn: async (formData: CheckoutFormData) => {
      const response = await fetch('/api/subscription/create-monthly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('sb-access-token')}`
        },
        body: JSON.stringify({
          userDetails: formData,
          planType: 'monthly'
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create subscription');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Subscription Successful!',
        description: 'Your monthly subscription has been activated.',
      });
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Subscription Failed',
        description: error.message || 'There was an error processing your subscription.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: CheckoutFormData) => {
    if (step === 'details') {
      setStep('payment');
    } else {
      subscriptionMutation.mutate(data);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => step === 'payment' ? setStep('details') : setLocation('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step === 'payment' ? 'Back to Details' : 'Back to Home'}
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Subscribe to Resolve AI
          </h1>
          <p className="text-gray-600">
            Complete your subscription to access AI-powered legal support for your trade business
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {step === 'details' ? (
                    <>
                      <User className="w-5 h-5" />
                      Your Details
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Payment Information
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {step === 'details' ? (
                      <>
                        {/* Personal Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Personal Information
                          </h3>
                          <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="firstName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>First Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="John" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="lastName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Last Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Smith" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                    <Input placeholder="john@example.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="phone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Phone Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="0412 345 678" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Business Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            Business Information
                          </h3>
                          <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="businessName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Business Name (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Smith Plumbing Services" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="abn"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>ABN (Optional)</FormLabel>
                                  <FormControl>
                                    <Input placeholder="12 345 678 901" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Address Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Address
                          </h3>
                          <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Street Address</FormLabel>
                                <FormControl>
                                  <Input placeholder="123 Main Street" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid md:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="city"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Sydney" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="state"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select state" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {AUSTRALIAN_STATES.map((state) => (
                                        <SelectItem key={state.value} value={state.value}>
                                          {state.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="postcode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Postcode</FormLabel>
                                  <FormControl>
                                    <Input placeholder="2000" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {/* Trade Information */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Trade Information
                          </h3>
                          <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="tradeType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Trade Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select your trade" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {TRADE_TYPES.map((trade) => (
                                        <SelectItem key={trade} value={trade}>
                                          {trade}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="experience"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Experience Level</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select experience" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {EXPERIENCE_LEVELS.map((level) => (
                                        <SelectItem key={level} value={level}>
                                          {level}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="specialization"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Specialization (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Commercial plumbing, Residential electrical work" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    ) : (
                      /* Payment Step */
                      <div className="space-y-4">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold mb-2">Demo Mode Active</h3>
                          <p className="text-gray-600 mb-4">
                            Click below to activate your subscription in demo mode
                          </p>
                        </div>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={subscriptionMutation.isPending}
                    >
                      {subscriptionMutation.isPending ? (
                        'Processing...'
                      ) : step === 'details' ? (
                        'Continue to Payment'
                      ) : (
                        'Activate Subscription'
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Plan Details */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Monthly Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">$49</div>
                  <div className="text-gray-600">per month</div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Unlimited AI Strategy Packs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Case Management System</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Document Generation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Legal Insights Dashboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Priority Support</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-600">
                    Cancel anytime. No hidden fees. Australian legal content only.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}