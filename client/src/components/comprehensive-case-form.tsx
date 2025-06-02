import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FileText, X, User, Building, DollarSign, Scale, Target, AlertTriangle, CheckCircle } from 'lucide-react';

const comprehensiveCaseSchema = z.object({
  // Section 1: Personal & Business Details
  fullName: z.string().min(2, 'Full name is required'),
  businessName: z.string().optional(),
  abn: z.string().optional(),
  email: z.string().email('Valid email required'),
  mobile: z.string().min(10, 'Valid mobile number required'),
  state: z.string().min(1, 'State/Territory required'),
  tradeService: z.string().min(2, 'Trade or service required'),
  
  // Section 2: Project Details
  projectAddress: z.string().min(5, 'Project address required'),
  clientBuilderName: z.string().min(2, 'Client/Builder name required'),
  contractType: z.enum(['direct_owner', 'head_contractor']),
  workScope: z.string().min(10, 'Work scope description required'),
  projectType: z.enum(['domestic', 'commercial']),
  startDate: z.string().min(1, 'Start date required'),
  completionDate: z.string().optional(),
  workCompleted: z.enum(['yes', 'no', 'partial']),
  incompleteDetails: z.string().optional(),
  
  // Section 3: Contractual Agreement
  writtenContract: z.enum(['yes', 'no']),
  scopeAgreement: z.enum(['written', 'email', 'verbal']),
  quoteGiven: z.enum(['yes', 'no']),
  variations: z.enum(['yes', 'no']),
  variationsType: z.enum(['written', 'verbal']).optional(),
  
  // Section 4: Payment & Invoices
  totalValue: z.string().min(1, 'Total value required'),
  amountPaid: z.string().min(1, 'Amount paid required'),
  amountOwing: z.string().min(1, 'Amount owing required'),
  invoiceIssued: z.enum(['yes', 'no']),
  lastInvoiceDate: z.string().optional(),
  followUpSent: z.enum(['yes', 'no']),
  disputesRaised: z.enum(['yes', 'no']),
  
  // Section 6: Legal Action Preferences
  legalStepsTaken: z.enum(['none', 'letter_demand', 'ncat_vcat', 'other']),
  threatenedAction: z.enum(['yes', 'no']),
  preferredApproach: z.enum(['letter_demand', 'security_payment_act', 'negotiation']),
  willingToEscalate: z.enum(['yes', 'no']),
  
  // Section 7: Outcome Sought
  desiredOutcome: z.enum(['full_payment', 'partial_settlement', 'project_exit', 'other']),
  urgencyLevel: z.enum(['urgent_7days', 'medium_30days', 'low_no_deadline']),
  acceptableResolution: z.string().min(10, 'Please describe acceptable resolution'),
  
  // Section 8: Risks or Concerns
  safetyIssues: z.enum(['yes', 'no']),
  threatsReceived: z.enum(['yes', 'no']),
  reputationConcerns: z.enum(['yes', 'no']),
});

type ComprehensiveCaseData = z.infer<typeof comprehensiveCaseSchema>;

interface ComprehensiveCaseFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ComprehensiveCaseForm({ onClose, onSuccess }: ComprehensiveCaseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSection, setCurrentSection] = useState(1);

  const form = useForm<ComprehensiveCaseData>({
    resolver: zodResolver(comprehensiveCaseSchema),
    defaultValues: {
      fullName: '',
      businessName: '',
      abn: '',
      email: '',
      mobile: '',
      state: '',
      tradeService: '',
      projectAddress: '',
      clientBuilderName: '',
      contractType: 'direct_owner',
      workScope: '',
      projectType: 'domestic',
      startDate: '',
      completionDate: '',
      workCompleted: 'yes',
      incompleteDetails: '',
      writtenContract: 'no',
      scopeAgreement: 'written',
      quoteGiven: 'no',
      variations: 'no',
      variationsType: 'written',
      totalValue: '',
      amountPaid: '',
      amountOwing: '',
      invoiceIssued: 'no',
      lastInvoiceDate: '',
      followUpSent: 'no',
      disputesRaised: 'no',
      legalStepsTaken: 'none',
      threatenedAction: 'no',
      preferredApproach: 'letter_demand',
      willingToEscalate: 'no',
      desiredOutcome: 'full_payment',
      urgencyLevel: 'medium_30days',
      acceptableResolution: '',
      safetyIssues: 'no',
      threatsReceived: 'no',
      reputationConcerns: 'no',
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data: ComprehensiveCaseData) => {
      return await apiRequest('POST', '/api/cases', data);
    },
    onSuccess: () => {
      toast({
        title: "Case Created Successfully",
        description: "Your comprehensive case details have been submitted and AI analysis is being generated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Case",
        description: error.message || "Failed to create case. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ComprehensiveCaseData) => {
    createCaseMutation.mutate(data);
  };

  const sections = [
    { id: 1, title: 'Personal & Business Details', icon: User },
    { id: 2, title: 'Project Details', icon: Building },
    { id: 3, title: 'Contractual Agreement', icon: FileText },
    { id: 4, title: 'Payment & Invoices', icon: DollarSign },
    { id: 5, title: 'Legal Action Preferences', icon: Scale },
    { id: 6, title: 'Outcome Sought', icon: Target },
    { id: 7, title: 'Risks or Concerns', icon: AlertTriangle },
  ];

  const nextSection = () => {
    if (currentSection < sections.length) {
      setCurrentSection(currentSection + 1);
    }
  };

  const prevSection = () => {
    if (currentSection > 1) {
      setCurrentSection(currentSection - 1);
    }
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal & Business Details
            </h3>
            
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name (if any)</FormLabel>
                    <FormControl>
                      <Input placeholder="Business name" {...field} />
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
                    <FormLabel>ABN</FormLabel>
                    <FormControl>
                      <Input placeholder="12 345 678 901" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Phone Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="0412 345 678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State or Territory *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NSW">NSW</SelectItem>
                        <SelectItem value="VIC">VIC</SelectItem>
                        <SelectItem value="QLD">QLD</SelectItem>
                        <SelectItem value="WA">WA</SelectItem>
                        <SelectItem value="SA">SA</SelectItem>
                        <SelectItem value="TAS">TAS</SelectItem>
                        <SelectItem value="ACT">ACT</SelectItem>
                        <SelectItem value="NT">NT</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tradeService"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trade or Service Provided *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Roof Plumbing, Bricklaying" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Project Details
            </h3>
            
            <FormField
              control={form.control}
              name="projectAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project / Site Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="Full project address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientBuilderName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client or Builder Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Who engaged you for this work" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contractType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Were you contracted directly by the owner or through a head contractor? *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="direct_owner">Directly by the owner</SelectItem>
                      <SelectItem value="head_contractor">Through a head contractor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="workScope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What was the scope of your work on this job? *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g. supply/install, labour only, specific tasks performed"
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projectType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Did the project involve domestic/residential or commercial work? *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="domestic">Domestic/Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Approximate Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="completionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion Date (if finished)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="workCompleted"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Was the work fully completed? *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="yes">Yes - fully completed</SelectItem>
                      <SelectItem value="no">No - not completed</SelectItem>
                      <SelectItem value="partial">Partially completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(form.watch('workCompleted') === 'no' || form.watch('workCompleted') === 'partial') && (
              <FormField
                control={form.control}
                name="incompleteDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Explain what's incomplete</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what work remains unfinished"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        );

      // Continue with other sections...
      default:
        return (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Ready to Submit</h3>
            <p className="text-neutral-medium">Review your information and submit your case.</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Create New Legal Case</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center space-x-2 mt-4">
            {sections.map((section) => (
              <div
                key={section.id}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-sm ${
                  section.id === currentSection 
                    ? 'bg-primary text-white' 
                    : section.id < currentSection 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                <section.icon className="h-3 w-3" />
                <span className="hidden md:inline">{section.title}</span>
                <span className="md:hidden">{section.id}</span>
              </div>
            ))}
          </div>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {renderCurrentSection()}
              
              <Separator />
              
              <div className="flex items-center justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevSection}
                  disabled={currentSection === 1}
                >
                  Previous
                </Button>
                
                <span className="text-sm text-neutral-medium">
                  Section {currentSection} of {sections.length}
                </span>
                
                {currentSection < sections.length ? (
                  <Button
                    type="button"
                    onClick={nextSection}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createCaseMutation.isPending}
                  >
                    {createCaseMutation.isPending ? 'Creating Case...' : 'Submit Case'}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}