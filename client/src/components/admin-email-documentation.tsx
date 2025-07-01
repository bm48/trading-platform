import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, FileText, Users, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";

const emailDocumentationSchema = z.object({
  recipientEmail: z.string().email("Please enter a valid email address"),
  recipientName: z.string().min(1, "Recipient name is required"),
  documentTitle: z.string().min(1, "Document title is required"),
  documentUrl: z.string().url().optional(),
  customMessage: z.string().optional(),
  caseId: z.number().optional(),
});

type EmailDocumentationForm = z.infer<typeof emailDocumentationSchema>;

export function AdminEmailDocumentation() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<EmailDocumentationForm>({
    resolver: zodResolver(emailDocumentationSchema),
    defaultValues: {
      recipientEmail: "",
      recipientName: "",
      documentTitle: "",
      documentUrl: "",
      customMessage: "",
    },
  });

  // Fetch cases for case selection
  const { data: cases } = useQuery({
    queryKey: ['/api/admin/cases'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/cases");
      return response.json();
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: EmailDocumentationForm) => {
      const response = await apiRequest("POST", "/api/admin/send-documentation", data);
      if (!response.ok) {
        throw new Error("Failed to send documentation email");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent Successfully",
        description: "Documentation email has been sent to the recipient.",
      });
      form.reset();
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send documentation email",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmailDocumentationForm) => {
    sendEmailMutation.mutate(data);
  };

  const fillFromCase = (caseId: string) => {
    const selectedCase = cases?.find((c: any) => c.id === parseInt(caseId));
    if (selectedCase) {
      form.setValue("recipientEmail", selectedCase.client_email || "");
      form.setValue("recipientName", selectedCase.client_name || "");
      form.setValue("caseId", selectedCase.id);
      form.setValue("documentTitle", `Legal Strategy Pack - ${selectedCase.title || 'Case Documentation'}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Documentation Service
        </CardTitle>
        <CardDescription>
          Send legal documents and strategy packs directly to clients via email
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Single Email Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Send className="w-4 h-4" />
              Send Single Document
            </h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                
                {/* Case Selection Helper */}
                {cases && cases.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quick Fill from Case</label>
                    <Select onValueChange={fillFromCase}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a case to auto-fill details" />
                      </SelectTrigger>
                      <SelectContent>
                        {cases.map((case_: any) => (
                          <SelectItem key={case_.id} value={case_.id.toString()}>
                            {case_.title} - {case_.client_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="recipientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Client full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="recipientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recipient Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="client@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="documentTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Legal Strategy Pack, Demand Letter, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="documentUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document URL (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="url" 
                          placeholder="https://example.com/document.pdf" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="customMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add a personal message to the client..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={sendEmailMutation.isPending}
                >
                  {sendEmailMutation.isPending ? "Sending..." : "Send Documentation Email"}
                </Button>
              </form>
            </Form>
          </div>
          
          {/* Email Configuration Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Email Configuration
            </h3>
            
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Current Setup</h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Supabase Email</Badge>
                    <span>Primary service (active)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Gmail SMTP</Badge>
                    <span>Backup option</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">SendGrid</Badge>
                    <span>Premium option</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-amber-50 rounded-lg">
                <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Setup Requirements
                </h4>
                <div className="space-y-2 text-sm text-amber-800">
                  <div><strong>Gmail SMTP:</strong> Requires GMAIL_USER and GMAIL_APP_PASSWORD environment variables</div>
                  <div><strong>SendGrid:</strong> Requires SENDGRID_API_KEY environment variable</div>
                  <div><strong>Supabase:</strong> Already configured and active</div>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Email Features</h4>
                <div className="space-y-1 text-sm text-green-800">
                  <div>✓ Professional HTML templates</div>
                  <div>✓ Document attachment support</div>
                  <div>✓ Case-specific information</div>
                  <div>✓ Custom messaging</div>
                  <div>✓ Delivery tracking</div>
                  <div>✓ Bulk email support</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}