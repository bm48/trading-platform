import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Info, Send } from 'lucide-react';
import { getIssueTypeLabel } from '@/lib/utils';

interface ApplicationFormData {
  fullName: string;
  phone: string;
  email: string;
  trade: string;
  state: string;
  issueType: string;
  amount: string;
  startDate: string;
  description: string;
}

const initialFormData: ApplicationFormData = {
  fullName: '',
  phone: '',
  email: '',
  trade: '',
  state: '',
  issueType: '',
  amount: '',
  startDate: '',
  description: '',
};

const trades = [
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'painting', label: 'Painting' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'concreting', label: 'Concreting' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'other', label: 'Other' },
];

const states = [
  { value: 'nsw', label: 'NSW' },
  { value: 'vic', label: 'VIC' },
  { value: 'qld', label: 'QLD' },
  { value: 'wa', label: 'WA' },
  { value: 'sa', label: 'SA' },
  { value: 'tas', label: 'TAS' },
  { value: 'act', label: 'ACT' },
  { value: 'nt', label: 'NT' },
];

const issueTypes = [
  {
    value: 'unpaid',
    title: 'Unpaid Work',
    description: 'Outstanding invoices or payment claims',
  },
  {
    value: 'variations',
    title: 'Variation Disputes',
    description: 'Extra work or scope changes',
  },
  {
    value: 'termination',
    title: 'Termination/Removal',
    description: 'Kicked off site or contract ended',
  },
  {
    value: 'defects',
    title: 'Defect Claims',
    description: 'Quality or workmanship disputes',
  },
  {
    value: 'contract',
    title: 'Contract Issues',
    description: 'Contract terms or interpretation',
  },
  {
    value: 'other',
    title: 'Other Issue',
    description: 'Not sure or something else',
  },
];

export default function ApplicationForm() {
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormData);
  const { toast } = useToast();

  const submitApplication = useMutation({
    mutationFn: async (data: ApplicationFormData) => {
      return await apiRequest('POST', '/api/applications', data);
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted Successfully!",
        description: "Check your email for confirmation and next steps.",
      });
      setFormData(initialFormData);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const requiredFields = ['fullName', 'phone', 'email', 'trade', 'state', 'issueType', 'description'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof ApplicationFormData]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Please fill in all required fields",
        description: "All fields marked with * are required.",
        variant: "destructive",
      });
      return;
    }

    submitApplication.mutate(formData);
  };

  const updateFormData = (field: keyof ApplicationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <section id="application" className="py-20 bg-neutral-light">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-neutral-dark mb-4">Get Your Strategy Pack in 24-48 Hours</h2>
          <p className="text-lg text-neutral-medium">Tell us about your situation and we'll generate a custom action plan</p>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Step 1: Basic Information */}
              <div className="space-y-6">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="text-lg font-semibold text-neutral-dark mb-2">Step 1: Your Details</h3>
                  <p className="text-sm text-neutral-medium">Basic information to get started</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => updateFormData('fullName', e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      placeholder="04XX XXX XXX"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    placeholder="your.email@example.com"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="trade">Your Trade *</Label>
                    <Select value={formData.trade} onValueChange={(value) => updateFormData('trade', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your trade" />
                      </SelectTrigger>
                      <SelectContent>
                        {trades.map((trade) => (
                          <SelectItem key={trade.value} value={trade.value}>
                            {trade.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="state">State/Territory *</Label>
                    <Select value={formData.state} onValueChange={(value) => updateFormData('state', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Step 2: Issue Details */}
              <div className="space-y-6 pt-8 border-t border-gray-200">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="text-lg font-semibold text-neutral-dark mb-2">Step 2: Your Issue</h3>
                  <p className="text-sm text-neutral-medium">Help us understand what you're dealing with</p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-neutral-dark mb-3 block">What's your main issue? *</Label>
                  <RadioGroup
                    value={formData.issueType}
                    onValueChange={(value) => updateFormData('issueType', value)}
                    className="grid md:grid-cols-2 gap-3"
                  >
                    {issueTypes.map((issue) => (
                      <div key={issue.value}>
                        <Label
                          htmlFor={issue.value}
                          className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:border-primary transition-colors has-[:checked]:border-primary has-[:checked]:bg-blue-50"
                        >
                          <RadioGroupItem
                            value={issue.value}
                            id={issue.value}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-medium text-neutral-dark">{issue.title}</div>
                            <div className="text-sm text-neutral-medium">{issue.description}</div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="amount">Amount Involved (if applicable)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => updateFormData('amount', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="startDate">When did this start?</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => updateFormData('startDate', e.target.value)}
                      className="[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:top-1/2 [&::-webkit-calendar-picker-indicator]:-translate-y-1/2 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:w-5 [&::-webkit-calendar-picker-indicator]:h-5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Describe Your Situation *</Label>
                  <Textarea
                    id="description"
                    rows={4}
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Tell us what happened, who's involved, and what you've tried so far..."
                    required
                  />
                </div>
              </div>

              {/* Submit Section */}
              <div className="pt-8 border-t border-gray-200">
                <div className="bg-neutral-light rounded-lg p-6 mb-6">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-primary mr-3 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-neutral-dark mb-2">What happens next?</h4>
                      <ul className="text-sm text-neutral-medium space-y-1">
                        <li>• You'll receive an instant confirmation email</li>
                        <li>• Case approval notification within 2 hours</li>
                        <li>• Complete your detailed application and payment ($299)</li>
                        <li>• Receive your custom strategy pack in 24-48 hours</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full btn-accent text-lg py-4"
                  disabled={submitApplication.isPending}
                >
                  {submitApplication.isPending ? (
                    <>
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      Submit Application - Free Assessment
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-neutral-medium mt-4">
                  No payment required at this stage. You'll only pay after case approval and when proceeding to the detailed application.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
