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
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { FileText, X, Building } from 'lucide-react';
import EnhancedFileUpload from '@/components/enhanced-file-upload';

const contractFormSchema = z.object({
  title: z.string().min(1, 'Contract title is required').max(200, 'Title must be less than 200 characters'),
  clientName: z.string().min(1, 'Client name is required').max(100, 'Client name must be less than 100 characters'),
  projectDescription: z.string().min(10, 'Project description must be at least 10 characters').max(2000, 'Description too long'),
  value: z.string().min(1, 'Contract value is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
  contractType: z.string().min(1, 'Contract type is required'),
  paymentTerms: z.string().min(1, 'Payment terms are required'),
  scope: z.string().min(10, 'Scope must be at least 10 characters').max(1000, 'Scope too long'),
  specialConditions: z.string().optional(),
});

type ContractFormData = z.infer<typeof contractFormSchema>;

interface ValidatedContractFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ValidatedContractForm({ onClose, onSuccess }: ValidatedContractFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [createdContractId, setCreatedContractId] = useState<number | null>(null);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      title: '',
      clientName: '',
      projectDescription: '',
      value: '',
      startDate: '',
      endDate: '',
      status: 'draft',
      contractType: '',
      paymentTerms: '',
      scope: '',
      specialConditions: '',
    },
  });

  const createContractMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create contract');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      const newContract = typeof data === 'object' && data !== null ? data : {};
      toast({
        title: "Contract Created Successfully",
        description: "Your contract has been created. You can now upload related documents.",
      });
      setCreatedContractId((newContract as any).id);
      setShowFileUpload(true);
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Contract",
        description: error.message || "There was an error creating your contract.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: ContractFormData) => {
    createContractMutation.mutate(data);
  };

  const handleFileUploadComplete = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-primary" />
              <CardTitle>Create New Contract</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {!showFileUpload ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Contract Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contract Details</h3>
                  
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Kitchen Renovation Contract" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Client or company name" {...field} />
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
                          <FormLabel>Contract Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select contract type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="residential">Residential Work</SelectItem>
                              <SelectItem value="commercial">Commercial Work</SelectItem>
                              <SelectItem value="renovation">Renovation</SelectItem>
                              <SelectItem value="new_construction">New Construction</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="repair">Repair Work</SelectItem>
                              <SelectItem value="subcontract">Subcontract</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="projectDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Description *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the work to be performed, materials, timeline, and key requirements..."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Financial and Timeline Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Financial & Timeline</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract Value *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. $25,000" {...field} />
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
                          <FormLabel>Start Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date (Optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select payment terms" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="net_30">Net 30 days</SelectItem>
                              <SelectItem value="net_15">Net 15 days</SelectItem>
                              <SelectItem value="net_7">Net 7 days</SelectItem>
                              <SelectItem value="on_completion">On completion</SelectItem>
                              <SelectItem value="50_50_split">50% upfront, 50% completion</SelectItem>
                              <SelectItem value="milestone_based">Milestone based</SelectItem>
                              <SelectItem value="weekly">Weekly payments</SelectItem>
                              <SelectItem value="monthly">Monthly payments</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="pending_review">Pending Review</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Scope and Conditions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Scope & Conditions</h3>
                  
                  <FormField
                    control={form.control}
                    name="scope"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Scope of Work *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Define the specific scope of work, deliverables, and boundaries..."
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specialConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Conditions (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any special conditions, warranties, or additional terms..."
                            className="min-h-[60px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                    disabled={createContractMutation.isPending}
                  >
                    {createContractMutation.isPending ? 'Creating Contract...' : 'Create Contract'}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Upload Contract Documents</h3>
                <p className="text-neutral-medium">
                  Upload the signed contract, specifications, drawings, or any other relevant documents
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Contract Documents</h4>
                  <EnhancedFileUpload
                    contractId={createdContractId!}
                    accept=".pdf,.doc,.docx,.txt"
                    category="contract_docs"
                    multiple={true}
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-2">Specifications & Drawings</h4>
                  <EnhancedFileUpload
                    contractId={createdContractId!}
                    accept=".pdf,.dwg,.jpg,.jpeg,.png,.gif"
                    category="specifications"
                    multiple={true}
                  />
                </div>

                <div>
                  <h4 className="font-medium mb-2">Photos & Reference Materials</h4>
                  <EnhancedFileUpload
                    contractId={createdContractId!}
                    accept=".jpg,.jpeg,.png,.gif,.webp"
                    category="reference_photos"
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