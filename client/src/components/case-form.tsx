import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FileText, X, AlertCircle, CheckCircle, User, Building, DollarSign, Scale, Target, AlertTriangle } from 'lucide-react';

const caseFormSchema = z.object({
  // Section 1: Personal & Business Details
  fullName: z.string().min(2, 'Full name is required'),
  businessName: z.string().optional(),
  abn: z.string().optional(),
  email: z.string().email('Valid email is required'),
  mobile: z.string().min(10, 'Valid mobile number is required'),
  state: z.string().min(1, 'State/Territory is required'),
  tradeService: z.string().min(2, 'Trade or service is required'),
  
  // Section 2: Project Details
  projectAddress: z.string().min(5, 'Project address is required'),
  clientName: z.string().min(2, 'Client/Builder name is required'),
  contractType: z.enum(['direct_owner', 'head_contractor']),
  workScope: z.string().min(10, 'Work scope description is required'),
  projectType: z.enum(['domestic', 'commercial']),
  startDate: z.string().min(1, 'Start date is required'),
  completionDate: z.string().optional(),
  workCompleted: z.enum(['yes', 'no', 'partial']),
  incompleteDetails: z.string().optional(),
  
  // Section 3: Contractual Agreement
  writtenContract: z.enum(['yes', 'no']),
  scopeAgreement: z.enum(['written', 'email', 'verbal']),
  quoteGiven: z.enum(['yes', 'no']),
  variations: z.enum(['yes', 'no']),
  variationsWritten: z.enum(['written', 'verbal']).optional(),
  
  // Section 4: Payment & Invoices
  totalValue: z.string().min(1, 'Total value is required'),
  amountPaid: z.string().min(1, 'Amount paid is required'),
  amountOwing: z.string().min(1, 'Amount owing is required'),
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

type CaseFormData = z.infer<typeof caseFormSchema>;

interface CaseFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CaseForm({ onClose, onSuccess }: CaseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CaseFormData>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      // Section 1: Personal & Business Details
      fullName: '',
      businessName: '',
      abn: '',
      email: '',
      mobile: '',
      state: '',
      tradeService: '',
      
      // Section 2: Project Details
      projectAddress: '',
      clientName: '',
      contractType: 'direct_owner',
      workScope: '',
      projectType: 'domestic',
      startDate: '',
      completionDate: '',
      workCompleted: 'yes',
      incompleteDetails: '',
      
      // Section 3: Contractual Agreement
      writtenContract: 'no',
      scopeAgreement: 'written',
      quoteGiven: 'no',
      variations: 'no',
      variationsWritten: 'written',
      
      // Section 4: Payment & Invoices
      totalValue: '',
      amountPaid: '',
      amountOwing: '',
      invoiceIssued: 'no',
      lastInvoiceDate: '',
      followUpSent: 'no',
      disputesRaised: 'no',
      
      // Section 6: Legal Action Preferences
      legalStepsTaken: 'none',
      threatenedAction: 'no',
      preferredApproach: 'letter_demand',
      willingToEscalate: 'no',
      
      // Section 7: Outcome Sought
      desiredOutcome: 'full_payment',
      urgencyLevel: 'medium_30days',
      acceptableResolution: '',
      
      // Section 8: Risks or Concerns
      safetyIssues: 'no',
      threatsReceived: 'no',
      reputationConcerns: 'no',
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data: CaseFormData) => {
      return await apiRequest('POST', '/api/cases', data);
    },
    onSuccess: () => {
      toast({
        title: "Case Created Successfully",
        description: "Your case has been created and AI analysis is being generated.",
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

  const onSubmit = (data: CaseFormData) => {
    createCaseMutation.mutate(data);
  };

  const issueTypes = [
    { value: 'payment_dispute', label: 'Payment Dispute' },
    { value: 'contract_breach', label: 'Contract Breach' },
    { value: 'defective_work', label: 'Defective Work Claims' },
    { value: 'scope_change', label: 'Scope Change Disputes' },
    { value: 'delay_claims', label: 'Delay Claims' },
    { value: 'warranty_issues', label: 'Warranty Issues' },
    { value: 'licensing_compliance', label: 'Licensing & Compliance' },
    { value: 'workplace_safety', label: 'Workplace Safety' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Create New Case</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Case Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Case Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Brief description of your case"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Issue Type */}
              <FormField
                control={form.control}
                name="issueType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select the type of issue" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {issueTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide detailed information about your case, including timeline, parties involved, and specific issues..."
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Amount */}
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount in Dispute (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., 15000"
                          type="number"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Start Date */}
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Start Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Urgency */}
              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Urgency Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low - No immediate deadline</SelectItem>
                        <SelectItem value="medium">Medium - Within 30 days</SelectItem>
                        <SelectItem value="high">High - Urgent, within 7 days</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client Name */}
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client/Company Name (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Name of other party"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Client Contact */}
                <FormField
                  control={form.control}
                  name="clientContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Contact (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Phone or email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">What happens next:</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• AI analysis will be generated for your case</li>
                      <li>• You'll receive a custom strategy pack</li>
                      <li>• Document templates will be prepared</li>
                      <li>• You can upload supporting documents</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={createCaseMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCaseMutation.isPending}
                >
                  {createCaseMutation.isPending ? (
                    <>Creating Case...</>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Create Case
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}