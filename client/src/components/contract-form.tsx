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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { FileText, X, User, Building, Calendar, DollarSign, Settings, Shield, AlertTriangle, Camera, Scale, FileCheck } from 'lucide-react';

const contractFormSchema = z.object({
  // Section 1: Party Details - Trade (You)
  tradeName: z.string().min(2, 'Full name or company name is required'),
  tradeAbn: z.string().optional(),
  tradeAddress: z.string().min(5, 'Business address is required'),
  tradeContact: z.string().min(2, 'Contact name is required'),
  tradeEmail: z.string().email('Valid email is required'),
  tradePhone: z.string().min(10, 'Valid phone number is required'),
  tradeLicense: z.string().optional(),
  tradeGstRegistered: z.enum(['yes', 'no']),
  
  // Section 1: Party Details - Other Party (Client)
  clientName: z.string().min(2, 'Client name or company name is required'),
  clientAbn: z.string().optional(),
  clientAddress: z.string().min(5, 'Client address is required'),
  clientContact: z.string().min(2, 'Contact person is required'),
  clientEmail: z.string().email('Valid email is required'),
  clientPhone: z.string().min(10, 'Valid phone number is required'),
  clientType: z.enum(['builder', 'property_owner', 'business', 'supplier']),
  
  // Section 2: Project Details
  projectName: z.string().min(2, 'Project name is required'),
  projectAddress: z.string().min(5, 'Project address is required'),
  workType: z.string().min(10, 'Type of work description is required'),
  tradeServices: z.string().min(10, 'Trade services description is required'),
  materialSupplier: z.enum(['trade_supplies', 'client_supplies', 'shared_responsibility']),
  siteAccessRequired: z.enum(['yes', 'no']),
  siteAccessProvider: z.string().optional(),
  otherTrades: z.enum(['yes', 'no']),
  
  // Section 3: Dates & Timelines
  startDate: z.string().min(1, 'Start date is required'),
  completionDate: z.string().min(1, 'Completion date is required'),
  workSchedule: z.string().min(5, 'Work schedule is required'),
  delaysRestrictions: z.string().optional(),
  
  // Section 4: Price & Payments
  totalPrice: z.string().min(1, 'Total contract price is required'),
  priceType: z.enum(['fixed_price', 'hourly_rate', 'per_unit']),
  labourCost: z.string().optional(),
  materialsCost: z.string().optional(),
  travelCost: z.string().optional(),
  paymentStructure: z.enum(['deposit_final', 'progress_payments', 'lump_sum', 'retention_held']),
  depositAmount: z.string().optional(),
  depositDue: z.string().optional(),
  finalPaymentAmount: z.string().optional(),
  finalPaymentDue: z.string().optional(),
  progressSchedule: z.string().optional(),
  retentionAmount: z.string().optional(),
  retentionTerms: z.string().optional(),
  paymentMethod: z.enum(['bank_transfer', 'credit_card', 'other']),
  latePaymentTerms: z.string().optional(),
  
  // Section 5: Variations & Extra Work
  variationHandling: z.string().min(10, 'Variation handling process is required'),
  variationNotice: z.string().min(5, 'Variation notice period is required'),
  materialChanges: z.enum(['yes', 'no']),
  
  // Section 6: Defects & Warranties
  workmanshipWarranty: z.enum(['yes', 'no']),
  warrantyPeriod: z.string().optional(),
  materialDefectResponsibility: z.string().min(5, 'Material defect responsibility is required'),
  defectReporting: z.string().min(10, 'Defect reporting process is required'),
  defectLiabilityPeriod: z.string().optional(),
  
  // Section 7: Termination & Disputes
  clientTerminationConditions: z.string().min(10, 'Client termination conditions are required'),
  tradeTerminationConditions: z.string().min(10, 'Trade termination conditions are required'),
  clientDelayConsequences: z.string().min(10, 'Client delay consequences are required'),
  siteRemovalConsequences: z.string().min(10, 'Site removal consequences are required'),
  disputeResolution: z.enum(['attempt_resolution', 'mediation', 'tribunal']),
  
  // Section 8: Records & Documentation
  beforeAfterPhotos: z.enum(['yes', 'no']),
  marketingUse: z.enum(['yes', 'no']),
  safetyDocsRequired: z.enum(['yes', 'no']),
  insuranceRequired: z.enum(['yes', 'no']),
  licensesRequired: z.enum(['yes', 'no']),
  
  // Section 9: Site Safety & Insurance
  publicLiability: z.enum(['yes', 'no']),
  publicLiabilityDetails: z.string().optional(),
  workersCompensation: z.enum(['yes', 'no', 'not_applicable']),
  siteSecurityResponsibility: z.string().min(5, 'Site security responsibility is required'),
  whsComplianceResponsibility: z.string().min(5, 'WHS compliance responsibility is required'),
  cleanupResponsibility: z.string().min(5, 'Cleanup responsibility is required'),
  
  // Section 10: Special Terms
  specialTerms: z.string().optional(),
  confidentialityClause: z.enum(['yes', 'no']),
  antiPoachingClause: z.enum(['yes', 'no']),
  
  // Section 11: Signing Details
  tradeSignatoryName: z.string().min(2, 'Trade signatory name is required'),
  tradeSignatoryTitle: z.string().min(2, 'Trade signatory title is required'),
  clientSignatoryName: z.string().min(2, 'Client signatory name is required'),
  clientSignatoryTitle: z.string().min(2, 'Client signatory title is required'),
  signingMethod: z.enum(['electronic', 'manual']),
  witnessRequired: z.enum(['yes', 'no']),
});

type ContractFormData = z.infer<typeof contractFormSchema>;

interface ContractFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ContractForm({ onClose, onSuccess }: ContractFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSection, setCurrentSection] = useState(1);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      // Default values for all fields
      tradeName: '',
      tradeAbn: '',
      tradeAddress: '',
      tradeContact: '',
      tradeEmail: '',
      tradePhone: '',
      tradeLicense: '',
      tradeGstRegistered: 'no',
      clientName: '',
      clientAbn: '',
      clientAddress: '',
      clientContact: '',
      clientEmail: '',
      clientPhone: '',
      clientType: 'property_owner',
      projectName: '',
      projectAddress: '',
      workType: '',
      tradeServices: '',
      materialSupplier: 'trade_supplies',
      siteAccessRequired: 'yes',
      siteAccessProvider: '',
      otherTrades: 'no',
      startDate: '',
      completionDate: '',
      workSchedule: '',
      delaysRestrictions: '',
      totalPrice: '',
      priceType: 'fixed_price',
      labourCost: '',
      materialsCost: '',
      travelCost: '',
      paymentStructure: 'deposit_final',
      depositAmount: '',
      depositDue: '',
      finalPaymentAmount: '',
      finalPaymentDue: '',
      progressSchedule: '',
      retentionAmount: '',
      retentionTerms: '',
      paymentMethod: 'bank_transfer',
      latePaymentTerms: '',
      variationHandling: '',
      variationNotice: '',
      materialChanges: 'no',
      workmanshipWarranty: 'yes',
      warrantyPeriod: '',
      materialDefectResponsibility: '',
      defectReporting: '',
      defectLiabilityPeriod: '',
      clientTerminationConditions: '',
      tradeTerminationConditions: '',
      clientDelayConsequences: '',
      siteRemovalConsequences: '',
      disputeResolution: 'attempt_resolution',
      beforeAfterPhotos: 'yes',
      marketingUse: 'no',
      safetyDocsRequired: 'no',
      insuranceRequired: 'yes',
      licensesRequired: 'no',
      publicLiability: 'yes',
      publicLiabilityDetails: '',
      workersCompensation: 'not_applicable',
      siteSecurityResponsibility: '',
      whsComplianceResponsibility: '',
      cleanupResponsibility: '',
      specialTerms: '',
      confidentialityClause: 'no',
      antiPoachingClause: 'no',
      tradeSignatoryName: '',
      tradeSignatoryTitle: '',
      clientSignatoryName: '',
      clientSignatoryTitle: '',
      signingMethod: 'electronic',
      witnessRequired: 'no',
    },
  });

  const createContractMutation = useMutation({
    mutationFn: async (data: ContractFormData) => {
      return await apiRequest('POST', '/api/contracts', data);
    },
    onSuccess: () => {
      toast({
        title: "Contract Created Successfully",
        description: "Your comprehensive contract has been created and is ready for review.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Contract",
        description: error.message || "Failed to create contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContractFormData) => {
    createContractMutation.mutate(data);
  };

  const sections = [
    { id: 1, title: 'Party Details', icon: User },
    { id: 2, title: 'Project Details', icon: Building },
    { id: 3, title: 'Dates & Timelines', icon: Calendar },
    { id: 4, title: 'Price & Payments', icon: DollarSign },
    { id: 5, title: 'Variations & Warranties', icon: Settings },
    { id: 6, title: 'Termination & Disputes', icon: Scale },
    { id: 7, title: 'Documentation & Safety', icon: Shield },
    { id: 8, title: 'Special Terms & Signing', icon: FileCheck },
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
          <div className="space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Party Details
            </h3>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3">For the Trade (You)</h4>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="tradeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name or Company Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your business name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tradeAbn"
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

                  <FormField
                    control={form.control}
                    name="tradeLicense"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trade License Number (if applicable)</FormLabel>
                        <FormControl>
                          <Input placeholder="License number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tradeAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="Full business address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="tradeContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Contact person" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tradeEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="business@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tradePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="0412 345 678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tradeGstRegistered"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Are you registered for GST? *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="yes">Yes - GST registered</SelectItem>
                          <SelectItem value="no">No - not GST registered</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-3">For the Other Party (Client/Builder/Supplier)</h4>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name or Company Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Client business name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientAbn"
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

                <FormField
                  control={form.control}
                  name="clientAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="Client business address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="clientContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person *</FormLabel>
                        <FormControl>
                          <Input placeholder="Contact person" {...field} />
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
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="client@email.com" {...field} />
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
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="0412 345 678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="clientType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Is this client a: *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="builder">Builder</SelectItem>
                          <SelectItem value="property_owner">Property owner</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                          <SelectItem value="supplier">Supplier</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Project name or description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Address / Site Location *</FormLabel>
                    <FormControl>
                      <Input placeholder="Full project address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="workType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of Work (describe clearly) *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detailed description of the work to be performed"
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
              name="tradeServices"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What trade services are being provided? *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g. 'supply and install Colorbond roofing'"
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
              name="materialSupplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Will materials be supplied by you or the client? *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="trade_supplies">Trade supplies all</SelectItem>
                      <SelectItem value="client_supplies">Client supplies materials</SelectItem>
                      <SelectItem value="shared_responsibility">Shared responsibility</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="siteAccessRequired"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Does the job require site access? *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('siteAccessRequired') === 'yes' && (
                <FormField
                  control={form.control}
                  name="siteAccessProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Who provides site access?</FormLabel>
                      <FormControl>
                        <Input placeholder="Who will provide access" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="otherTrades"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Are there other trades working on-site at the same time? *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      // Continue with other sections...
      default:
        return (
          <div className="text-center py-8">
            <FileCheck className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Ready to Create Contract</h3>
            <p className="text-neutral-medium">Review your contract details and submit.</p>
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
              <CardTitle>Create New Contract</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center space-x-2 mt-4 overflow-x-auto">
            {sections.map((section) => (
              <div
                key={section.id}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-sm whitespace-nowrap ${
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
                    disabled={createContractMutation.isPending}
                  >
                    {createContractMutation.isPending ? 'Creating Contract...' : 'Create Contract'}
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