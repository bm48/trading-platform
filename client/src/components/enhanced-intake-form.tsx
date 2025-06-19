import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Save, FileText, Clock, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';

const intakeSchema = z.object({
  // Client Information
  clientName: z.string().min(2, "Client name must be at least 2 characters"),
  clientEmail: z.string().email("Please enter a valid email address"),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  
  // Case Details
  caseTitle: z.string().min(5, "Case title must be at least 5 characters"),
  issueType: z.enum([
    'payment_dispute',
    'contract_breach',
    'defective_work',
    'delay_claims',
    'variation_disputes',
    'retention_release',
    'adjudication_response',
    'other'
  ]),
  description: z.string().min(50, "Please provide a detailed description (at least 50 characters)"),
  amount: z.coerce.number().positive().optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  
  // Timeline
  incidentDate: z.string().optional(),
  discoveryDate: z.string().optional(),
  deadlineDate: z.string().optional(),
  
  // Additional Details
  previousActions: z.string().optional(),
  desiredOutcome: z.string().optional(),
  documentsProvided: z.array(z.string()).optional()
});

type IntakeFormData = z.infer<typeof intakeSchema>;

interface EnhancedIntakeFormProps {
  onSubmit?: (data: IntakeFormData & { aiContent?: any }) => void;
  autoSaveInterval?: number;
  showProgress?: boolean;
}

export default function EnhancedIntakeForm({ 
  onSubmit, 
  autoSaveInterval = 30000, // 30 seconds
  showProgress = true 
}: EnhancedIntakeFormProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const form = useForm<IntakeFormData>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientAddress: '',
      caseTitle: '',
      issueType: 'payment_dispute',
      description: '',
      amount: undefined,
      urgency: 'medium',
      incidentDate: '',
      discoveryDate: '',
      deadlineDate: '',
      previousActions: '',
      desiredOutcome: '',
      documentsProvided: []
    },
    mode: 'onChange'
  });

  // Calculate form completion progress
  const calculateProgress = () => {
    const values = form.getValues();
    const requiredFields = ['clientName', 'clientEmail', 'caseTitle', 'issueType', 'description', 'urgency'];
    const completedRequired = requiredFields.filter(field => values[field as keyof IntakeFormData]).length;
    const optionalFields = ['clientPhone', 'amount', 'incidentDate', 'previousActions', 'desiredOutcome'];
    const completedOptional = optionalFields.filter(field => values[field as keyof IntakeFormData]).length;
    
    const requiredProgress = (completedRequired / requiredFields.length) * 70; // 70% for required fields
    const optionalProgress = (completedOptional / optionalFields.length) * 30; // 30% for optional fields
    
    return Math.round(requiredProgress + optionalProgress);
  };

  // Auto-save functionality
  const autoSaveMutation = useMutation({
    mutationFn: async (data: IntakeFormData) => {
      const savedData = localStorage.getItem('intake_form_draft');
      const currentData = JSON.stringify(data);
      
      if (savedData !== currentData) {
        localStorage.setItem('intake_form_draft', currentData);
        localStorage.setItem('intake_form_timestamp', new Date().toISOString());
        return { success: true };
      }
      return { success: false };
    },
    onSuccess: (result) => {
      if (result.success) {
        setLastSaved(new Date());
        setIsDirty(false);
        toast({
          title: "Draft Saved",
          description: "Your progress has been automatically saved",
          duration: 2000,
        });
      }
    }
  });

  // AI generation mutation
  const generateAIMutation = useMutation({
    mutationFn: async (data: IntakeFormData) => {
      return await apiRequest('POST', '/api/ai/generate-strategy', data);
    },
    onSuccess: (aiContent) => {
      toast({
        title: "AI Analysis Complete",
        description: "Legal strategy pack generated successfully",
      });
      onSubmit?.({ ...form.getValues(), aiContent });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Could not generate AI strategy pack. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Load saved draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('intake_form_draft');
    const savedTimestamp = localStorage.getItem('intake_form_timestamp');
    
    if (savedDraft && savedTimestamp) {
      try {
        const draftData = JSON.parse(savedDraft);
        const timestamp = new Date(savedTimestamp);
        
        // Only load if draft is less than 24 hours old
        if (Date.now() - timestamp.getTime() < 24 * 60 * 60 * 1000) {
          form.reset(draftData);
          setLastSaved(timestamp);
          toast({
            title: "Draft Restored",
            description: "Your previous work has been restored",
          });
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, [form]);

  // Auto-save interval
  useEffect(() => {
    if (!autoSaveInterval) return;
    
    const interval = setInterval(() => {
      if (isDirty && form.formState.isValid) {
        autoSaveMutation.mutate(form.getValues());
      }
    }, autoSaveInterval);

    return () => clearInterval(interval);
  }, [isDirty, form.formState.isValid, autoSaveInterval]);

  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => {
      setIsDirty(true);
      setProgress(calculateProgress());
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  const onFormSubmit = async (data: IntakeFormData) => {
    setIsGenerating(true);
    try {
      await generateAIMutation.mutateAsync(data);
      // Clear draft after successful submission
      localStorage.removeItem('intake_form_draft');
      localStorage.removeItem('intake_form_timestamp');
    } finally {
      setIsGenerating(false);
    }
  };

  const manualSave = () => {
    autoSaveMutation.mutate(form.getValues());
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getIssueTypeLabel = (type: string) => {
    const labels = {
      'payment_dispute': 'Payment Dispute',
      'contract_breach': 'Contract Breach',
      'defective_work': 'Defective Work',
      'delay_claims': 'Delay Claims',
      'variation_disputes': 'Variation Disputes',
      'retention_release': 'Retention Release',
      'adjudication_response': 'Adjudication Response',
      'other': 'Other'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      {showProgress && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Case Intake Form</CardTitle>
                <CardDescription>
                  Complete this form to generate your AI-powered legal strategy pack
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {lastSaved && (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Saved {lastSaved.toLocaleTimeString()}</span>
                    </>
                  )}
                  {isDirty && (
                    <Badge variant="outline" className="text-orange-600">
                      <Clock className="w-3 h-3 mr-1" />
                      Unsaved changes
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Completion Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="clientEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="clientPhone"
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
              
              <FormField
                control={form.control}
                name="clientAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, Sydney NSW 2000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Case Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Case Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="caseTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Payment dispute for bathroom renovation project" {...field} />
                    </FormControl>
                    <FormDescription>
                      Provide a clear, descriptive title for your legal matter
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="issueType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select issue type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="payment_dispute">Payment Dispute</SelectItem>
                          <SelectItem value="contract_breach">Contract Breach</SelectItem>
                          <SelectItem value="defective_work">Defective Work</SelectItem>
                          <SelectItem value="delay_claims">Delay Claims</SelectItem>
                          <SelectItem value="variation_disputes">Variation Disputes</SelectItem>
                          <SelectItem value="retention_release">Retention Release</SelectItem>
                          <SelectItem value="adjudication_response">Adjudication Response</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Urgency Level *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select urgency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low - No immediate deadline</SelectItem>
                          <SelectItem value="medium">Medium - Within 30 days</SelectItem>
                          <SelectItem value="high">High - Within 10 days</SelectItem>
                          <SelectItem value="critical">Critical - Urgent action required</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount in Dispute (AUD)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="50000" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the monetary value of your dispute (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Description *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide a comprehensive description of your legal issue, including key facts, dates, and circumstances..."
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include all relevant details - the more information you provide, the better our AI can assist you
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Important Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="incidentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Incident Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>When did the issue occur?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discoveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discovery Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>When did you become aware?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadlineDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Response Deadline</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>Any known deadlines?</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Additional Details */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="previousActions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Previous Actions Taken</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe any steps you've already taken to resolve this matter..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="desiredOutcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desired Outcome</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="What would you like to achieve from this legal matter?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={manualSave}
                    disabled={autoSaveMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </Button>
                  
                  {form.getValues().issueType && form.getValues().urgency && (
                    <Badge variant={getUrgencyColor(form.getValues().urgency)}>
                      {getIssueTypeLabel(form.getValues().issueType)} - {form.getValues().urgency.toUpperCase()}
                    </Badge>
                  )}
                </div>

                <Button 
                  type="submit" 
                  disabled={isGenerating || !form.formState.isValid || progress < 70}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Generating AI Strategy...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Strategy Pack
                    </>
                  )}
                </Button>
              </div>
              
              {progress < 70 && (
                <p className="text-sm text-gray-600 mt-3">
                  Complete at least 70% of the form to generate your AI strategy pack
                </p>
              )}
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}