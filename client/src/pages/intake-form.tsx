import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import DashboardLayout from '@/components/dashboard-layout';
import { FileText, Calendar, Users, DollarSign, AlertTriangle, ChevronRight } from 'lucide-react';

const intakeFormSchema = z.object({
  // Project/Contract Details
  projectType: z.string().min(1, 'Project type is required'),
  projectValue: z.string().min(1, 'Project value is required'),
  contractType: z.string().min(1, 'Contract type is required'),
  workDescription: z.string().min(1, 'Work description is required'),
  
  // Timeline Information
  contractDate: z.string().optional(),
  workStartDate: z.string().optional(),
  workCompletionDate: z.string().optional(),
  paymentTerms: z.string().min(1, 'Payment terms are required'),
  
  // Other Parties
  clientName: z.string().min(1, 'Client name is required'),
  clientContact: z.string().min(1, 'Client contact is required'),
  otherContractors: z.string().optional(),
  
  // Issue Details
  issueDescription: z.string().min(1, 'Issue description is required'),
  impactDescription: z.string().min(1, 'Impact description is required'),
  attemptedResolutions: z.string().optional(),
  documentsAvailable: z.array(z.string()).optional(),
  
  // Legal Preferences
  desiredOutcome: z.string().min(1, 'Desired outcome is required'),
  urgencyLevel: z.string().min(1, 'Urgency level is required'),
  budgetConcerns: z.string().optional(),
  timeConstraints: z.string().optional(),
});

type IntakeFormData = z.infer<typeof intakeFormSchema>;

export default function IntakeForm() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<IntakeFormData>({
    resolver: zodResolver(intakeFormSchema),
    defaultValues: {
      documentsAvailable: [],
    },
  });

  const { data: application, isLoading } = useQuery({
    queryKey: ['/api/applications', id],
    enabled: !!id,
  });

  const submitIntakeMutation = useMutation({
    mutationFn: async (data: IntakeFormData) => {
      return apiRequest('POST', `/api/applications/${id}/intake`, data);
    },
    onSuccess: () => {
      toast({
        title: 'Intake form submitted',
        description: 'Your detailed information has been submitted. AI strategy generation will begin shortly.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/applications', id] });
      setLocation(`/application-status/${id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Submission failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: IntakeFormData) => {
    submitIntakeMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!application || application.workflow_stage !== 'intake_pending') {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-neutral-medium mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-dark mb-2">Intake Form Not Available</h3>
              <p className="text-neutral-medium">
                This intake form is not available or you haven't completed the required payment step.
              </p>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-dark">Detailed Intake Form</h1>
          <p className="text-neutral-medium">
            Complete this detailed questionnaire to generate your custom strategy pack and legal documents
          </p>
        </div>

        {/* Progress Indicator */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h3 className="font-medium text-blue-800">Step 3 of 4: Detailed Information</h3>
                <p className="text-sm text-blue-600">Help us create your custom strategy pack</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Intake Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Project/Contract Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Project & Contract Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projectType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type of Project/Work</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select project type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="residential_construction">Residential Construction</SelectItem>
                            <SelectItem value="commercial_construction">Commercial Construction</SelectItem>
                            <SelectItem value="renovation">Renovation/Refurbishment</SelectItem>
                            <SelectItem value="plumbing">Plumbing Work</SelectItem>
                            <SelectItem value="electrical">Electrical Work</SelectItem>
                            <SelectItem value="carpentry">Carpentry</SelectItem>
                            <SelectItem value="painting">Painting</SelectItem>
                            <SelectItem value="landscaping">Landscaping</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="projectValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Value (AUD)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. $50,000" {...field} />
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
                        <FormLabel>Contract Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select contract type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="written_formal">Written Formal Contract</SelectItem>
                            <SelectItem value="written_informal">Written Informal Agreement</SelectItem>
                            <SelectItem value="verbal">Verbal Agreement</SelectItem>
                            <SelectItem value="quote_acceptance">Quote/Estimate Acceptance</SelectItem>
                            <SelectItem value="subcontract">Subcontractor Agreement</SelectItem>
                            <SelectItem value="no_contract">No Formal Contract</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 30 days, progress payments" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="workDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Work Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the work performed in detail..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Timeline Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Timeline Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="contractDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract/Agreement Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workCompletionDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Completion Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Other Parties */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Other Parties Involved
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client/Principal Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Client or company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Contact Details</FormLabel>
                        <FormControl>
                          <Input placeholder="Phone, email, address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="otherContractors"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Contractors/Subcontractors Involved</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="List any other contractors, their roles, and contact details if known..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Issue Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Issue Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="issueDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Detailed Issue Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the issue in detail - what happened, when, circumstances..."
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
                  name="impactDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impact on Your Business</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="How has this issue affected your business, finances, reputation, future work..."
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
                  name="attemptedResolutions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attempted Resolutions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What have you tried to resolve this? Phone calls, emails, meetings, demands..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Legal Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Legal Strategy Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="desiredOutcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desired Outcome</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What outcome are you seeking? Payment, completion of work, damages, etc..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="urgencyLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Urgency Level</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select urgency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low - Can wait weeks/months</SelectItem>
                            <SelectItem value="medium">Medium - Need resolution soon</SelectItem>
                            <SelectItem value="high">High - Urgent, affecting business</SelectItem>
                            <SelectItem value="critical">Critical - Immediate action required</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timeConstraints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Constraints</FormLabel>
                        <FormControl>
                          <Input placeholder="Any deadlines or time pressures?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="budgetConcerns"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget/Cost Concerns</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any concerns about legal costs, preferred approach (negotiation vs formal action)..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Card>
              <CardContent className="pt-6">
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full"
                  disabled={submitIntakeMutation.isPending}
                >
                  {submitIntakeMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Intake Form
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
                <p className="text-sm text-neutral-medium text-center mt-3">
                  After submission, our AI will generate your custom strategy pack for review
                </p>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}