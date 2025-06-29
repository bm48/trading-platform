import { useState } from 'react';
import {useParams} from 'wouter';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarPicker } from '@/components/ui/calendar-picker';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FileText, X, Scale, AlertTriangle, Lock } from 'lucide-react';
import EnhancedFileUpload from '@/components/enhanced-file-upload';

const caseFormSchema = z.object({
  title: z.string().min(1, 'Case title is required').max(200, 'Title must be less than 200 characters'),
  issueType: z.string().min(1, 'Issue type is required'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description too long'),
  amount: z.string().min(1, 'Amount is required'),
  nextActionDue: z.string().optional(),
});

type CaseFormData = z.infer<typeof caseFormSchema>;

interface ValidatedCaseFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ValidatedCaseForm({ onClose, onSuccess }: ValidatedCaseFormProps) {
  const { toast } = useToast();
  const { id }=useParams();
  const queryClient = useQueryClient();
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<number | null>(null);

  // Check subscription status
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/subscription/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/subscription/status');
      return response.json();
    },
  });

  const form = useForm<CaseFormData>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      title: '',
      issueType: '',
      description: '',
      amount: '',
      nextActionDue: '',
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data: CaseFormData) => {
      const response = await apiRequest('POST', '/api/cases', data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Case Created Successfully",
        description: "Your case has been created. You can now upload supporting documents.",
      });
      setCreatedCaseId(data.id);
      setShowFileUpload(true);
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Case",
        description: error.message || "There was an error creating your case.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: CaseFormData) => {
    createCaseMutation.mutate(data);
  };

  const handleFileUploadComplete = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Scale className="h-5 w-5 text-primary" />
              <CardTitle>Create New Legal Case</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Subscription Gate */}
          {!subscriptionLoading && subscriptionStatus && !subscriptionStatus.canCreateCases && (
            <Alert className="mb-6 border-amber-200 bg-amber-50">
              <Lock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>To create, first you have to subscribe</strong>
                <br />
                {subscriptionStatus.message || 'You need an active subscription to create new cases.'}
              </AlertDescription>
            </Alert>
          )}

          {!showFileUpload ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Case Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Brief title for your case" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <SelectItem value="quality_issues">Quality Issues</SelectItem>
                            <SelectItem value="scope_changes">Scope Changes</SelectItem>
                            <SelectItem value="delay_claims">Delay Claims</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount in Dispute *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. $15,000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Case Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Provide a detailed description of your situation, including key facts and timeline..."
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nextActionDue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Action Due Date (Optional)</FormLabel>
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

                <div className="flex justify-end space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCaseMutation.isPending || (!subscriptionLoading && subscriptionStatus && !subscriptionStatus.canCreateCases)}
                  >
                    {createCaseMutation.isPending ? 'Creating Case...' : 'Create Case'}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Upload Supporting Documents</h3>
                <p className="text-neutral-medium">
                  Upload contracts, invoices, photos, emails, or any other relevant documents
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Documents & Contracts</h4>
                  <EnhancedFileUpload
                    caseId={createdCaseId!}
                    accept=".pdf,.doc,.docx,.txt"
                    category="evidence"
                    multiple={true}
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-2">Photos & Images</h4>
                  <EnhancedFileUpload
                    caseId={createdCaseId!}
                    accept=".jpg,.jpeg,.png,.gif,.webp"
                    category="photos"
                    multiple={true}
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-2">Email Communications</h4>
                  <EnhancedFileUpload
                    caseId={createdCaseId!}
                    accept=".eml,.msg"
                    category="correspondence"
                    multiple={true}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  variant="outline"
                  onClick={handleFileUploadComplete}
                >
                  Skip File Upload
                </Button>
                <Button
                  onClick={handleFileUploadComplete}
                >
                  Continue to Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}