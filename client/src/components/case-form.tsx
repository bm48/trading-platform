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
import { CalendarPicker } from '@/components/ui/calendar-picker';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FileText, X, AlertCircle, CheckCircle, User, Building, DollarSign, Scale, Target, AlertTriangle, Upload, FileIcon } from 'lucide-react';
import FileUpload from '@/components/file-upload';

const caseFormSchema = z.object({
  // Basic case info
  title: z.string().min(5, 'Case title is required'),
  issueType: z.string().min(1, 'Issue type is required'),
  description: z.string().min(20, 'Detailed description is required'),
  amount: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  urgency: z.string().min(1, 'Urgency level is required'),
  clientContact: z.string().optional(),
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
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-blue-50 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Scale className="h-6 w-6 text-blue-100" />
              <CardTitle className="text-xl text-white">Create New Legal Case</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-blue-600">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-blue-100 text-sm mt-2">Submit your case details for AI-powered legal analysis and strategy development</p>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              {/* Case Overview Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 mb-4">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-800">Case Overview</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-700">Case Title</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Brief description of your case"
                            className="border-blue-200 focus:border-blue-400"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="issueType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-700">Issue Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-blue-200 focus:border-blue-400">
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
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel className="text-blue-700">Detailed Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide detailed information about your case, including timeline, parties involved, and specific issues..."
                          className="min-h-[120px] border-blue-200 focus:border-blue-400"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>

              {/* Financial Details Section */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                <div className="flex items-center space-x-2 mb-4">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800">Financial Details</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-green-700">Amount in Dispute (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 15000"
                            type="number"
                            className="border-green-200 focus:border-green-400"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-green-700">Issue Start Date</FormLabel>
                        <FormControl>
                          <CalendarPicker
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select issue start date"
                            className="border-green-200 focus:border-green-400"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Urgency Section */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-lg border border-orange-200">
                <div className="flex items-center space-x-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-orange-800">Urgency & Priority</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="urgency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-orange-700">Urgency Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="border-orange-200 focus:border-orange-400">
                            <SelectValue placeholder="Select urgency level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">🟢 Low - No immediate deadline</SelectItem>
                          <SelectItem value="medium">🟡 Medium - Within 30 days</SelectItem>
                          <SelectItem value="high">🔴 High - Urgent, within 7 days</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact Information Section */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
                <div className="flex items-center space-x-2 mb-4">
                  <User className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-purple-800">Contact Information</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="clientContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-purple-700">Additional Contact Details (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Other parties involved, their contact information, legal representatives, etc."
                          className="border-purple-200 focus:border-purple-400"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Submit Section */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createCaseMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                >
                  {createCaseMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Creating Case...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Create Case File
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