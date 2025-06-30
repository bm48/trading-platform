import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mail, User, Calendar, MessageSquare, ExternalLink, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ContactSubmission } from "@shared/schema";

export function AdminContactManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [responseText, setResponseText] = useState("");

  const { data: submissions, isLoading } = useQuery<ContactSubmission[]>({
    queryKey: ["/api/admin/contact-submissions"],
    staleTime: 30000,
  });

  const updateSubmissionMutation = useMutation({
    mutationFn: async ({ id, status, admin_response }: { id: number; status: string; admin_response?: string }) => {
      const response = await apiRequest("PUT", `/api/admin/contact-submissions/${id}`, {
        status,
        admin_response,
      });
      if (!response.ok) {
        throw new Error("Failed to update submission");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contact-submissions"] });
      toast({
        title: "Submission Updated",
        description: "Contact submission has been updated successfully.",
      });
      setSelectedSubmission(null);
      setResponseText("");
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update submission.",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "unread":
        return "bg-red-100 text-red-800";
      case "read":
        return "bg-yellow-100 text-yellow-800";
      case "responded":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const markAsRead = (submission: ContactSubmission) => {
    if (submission.status === "unread") {
      updateSubmissionMutation.mutate({
        id: submission.id,
        status: "read",
      });
    }
  };

  const handleRespond = () => {
    if (!selectedSubmission || !responseText.trim()) return;
    
    updateSubmissionMutation.mutate({
      id: selectedSubmission.id,
      status: "responded",
      admin_response: responseText.trim(),
    });
  };

  const unreadCount = submissions?.filter(s => s.status === "unread").length || 0;
  const respondedCount = submissions?.filter(s => s.status === "responded").length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contact Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Contact Submissions
        </CardTitle>
        <CardDescription>
          Manage contact form submissions from users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All ({submissions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="responded">
              Responded ({respondedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {submissions?.map((submission) => (
              <SubmissionCard 
                key={submission.id} 
                submission={submission} 
                onMarkAsRead={markAsRead}
                onSelectForResponse={setSelectedSubmission}
              />
            ))}
          </TabsContent>

          <TabsContent value="unread" className="space-y-4">
            {submissions?.filter(s => s.status === "unread").map((submission) => (
              <SubmissionCard 
                key={submission.id} 
                submission={submission} 
                onMarkAsRead={markAsRead}
                onSelectForResponse={setSelectedSubmission}
              />
            ))}
          </TabsContent>

          <TabsContent value="responded" className="space-y-4">
            {submissions?.filter(s => s.status === "responded").map((submission) => (
              <SubmissionCard 
                key={submission.id} 
                submission={submission} 
                onMarkAsRead={markAsRead}
                onSelectForResponse={setSelectedSubmission}
              />
            ))}
          </TabsContent>
        </Tabs>

        {/* Response Dialog */}
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Respond to Contact Submission</DialogTitle>
              <DialogDescription>
                Send a response to {selectedSubmission?.name} ({selectedSubmission?.email})
              </DialogDescription>
            </DialogHeader>
            
            {selectedSubmission && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Original Message:</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Subject:</strong> {selectedSubmission.subject}
                  </p>
                  <p className="text-sm">{selectedSubmission.message}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Your Response:</label>
                  <Textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Type your response here..."
                    className="min-h-[100px]"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleRespond}
                    disabled={!responseText.trim() || updateSubmissionMutation.isPending}
                  >
                    {updateSubmissionMutation.isPending ? "Sending..." : "Send Response"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface SubmissionCardProps {
  submission: ContactSubmission;
  onMarkAsRead: (submission: ContactSubmission) => void;
  onSelectForResponse: (submission: ContactSubmission) => void;
}

function SubmissionCard({ submission, onMarkAsRead, onSelectForResponse }: SubmissionCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "unread":
        return "bg-red-100 text-red-800";
      case "read":
        return "bg-yellow-100 text-yellow-800";
      case "responded":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className={`transition-all hover:shadow-md ${submission.status === "unread" ? "border-blue-200 bg-blue-50/30" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{submission.name}</span>
              <Badge className={`text-xs ${getStatusColor(submission.status)}`}>
                {submission.status}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <a href={`mailto:${submission.email}`} className="text-blue-600 hover:underline">
                {submission.email}
              </a>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              {formatDate(submission.created_at)}
            </div>
            
            <div>
              <p className="font-medium text-sm mb-1">{submission.subject}</p>
              <p className="text-sm text-gray-600 line-clamp-2">{submission.message}</p>
            </div>
            
            {submission.admin_response && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Admin Response</span>
                </div>
                <p className="text-sm text-green-700">{submission.admin_response}</p>
                {submission.responded_at && (
                  <p className="text-xs text-green-600 mt-1">
                    Responded on {formatDate(submission.responded_at)}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-2 ml-4">
            {submission.status === "unread" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkAsRead(submission)}
              >
                Mark as Read
              </Button>
            )}
            
            {submission.status !== "responded" && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onSelectForResponse(submission)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Respond
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`mailto:${submission.email}?subject=Re: ${submission.subject}`, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Email
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}