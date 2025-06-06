import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CheckCircle, XCircle, Eye, Clock, DollarSign, FileText, AlertTriangle } from "lucide-react";

interface ApplicationWithAnalysis {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  trade: string;
  state: string;
  issueType: string;
  amount: string;
  startDate: string;
  description: string;
  status: string;
  createdAt: string;
  aiAnalysis?: {
    riskLevel: 'low' | 'medium' | 'high';
    confidence: number;
    recommendation: 'approve' | 'review' | 'reject';
    reasoning: string;
    keyFactors: string[];
    potentialValue: number;
  };
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("pending");

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["/api/admin/applications"],
  });

  const { data: stats = {} } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const approveApplication = useMutation({
    mutationFn: async (applicationId: number) => {
      return apiRequest("POST", `/api/admin/applications/${applicationId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Application Approved",
        description: "Approval email with payment link has been sent to the applicant.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectApplication = useMutation({
    mutationFn: async (data: { applicationId: number; reason: string }) => {
      return apiRequest("POST", `/api/admin/applications/${data.applicationId}/reject`, {
        reason: data.reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Application Rejected",
        description: "Rejection email has been sent to the applicant.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateAnalysis = useMutation({
    mutationFn: async (applicationId: number) => {
      return apiRequest("POST", `/api/admin/applications/${applicationId}/analyze`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/applications"] });
      toast({
        title: "Analysis Complete",
        description: "AI analysis has been generated for this application.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "bg-green-100 text-green-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredApplications = applications.filter((app: ApplicationWithAnalysis) => {
    if (selectedTab === "all") return true;
    return app.status === selectedTab;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mr-4">
            +
          </div>
          <div>
            <h1 className="text-3xl font-bold">Project Resolve AI - Admin</h1>
            <p className="text-muted-foreground">Review and manage applications</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats.pending || 0}</p>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats.approved || 0}</p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <XCircle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{stats.rejected || 0}</p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-2xl font-bold">{formatCurrency(stats.totalValue || 0)}</p>
              <p className="text-sm text-muted-foreground">Total Case Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>Review and process incoming applications</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="pending">Pending ({stats.pending || 0})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({stats.approved || 0})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({stats.rejected || 0})</TabsTrigger>
              <TabsTrigger value="all">All Applications</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="space-y-4">
              {filteredApplications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No applications found
                </div>
              ) : (
                filteredApplications.map((application: ApplicationWithAnalysis) => (
                  <Card key={application.id} className="border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{application.fullName}</h3>
                            <Badge className={getStatusColor(application.status)}>
                              {application.status}
                            </Badge>
                            {application.aiAnalysis && (
                              <Badge className={getRiskColor(application.aiAnalysis.riskLevel)}>
                                {application.aiAnalysis.riskLevel} risk
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                            <div>
                              <strong>Email:</strong> {application.email}
                            </div>
                            <div>
                              <strong>Phone:</strong> {application.phone}
                            </div>
                            <div>
                              <strong>Trade:</strong> {application.trade}
                            </div>
                            <div>
                              <strong>State:</strong> {application.state}
                            </div>
                            <div>
                              <strong>Issue:</strong> {application.issueType}
                            </div>
                            <div>
                              <strong>Amount:</strong> {formatCurrency(parseFloat(application.amount) || 0)}
                            </div>
                            <div>
                              <strong>Start Date:</strong> {formatDate(application.startDate)}
                            </div>
                            <div>
                              <strong>Applied:</strong> {formatDate(application.createdAt)}
                            </div>
                          </div>

                          <div className="mt-4">
                            <strong className="text-sm">Description:</strong>
                            <p className="text-sm text-muted-foreground mt-1">{application.description}</p>
                          </div>

                          {application.aiAnalysis && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                AI Analysis
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <strong>Recommendation:</strong> {application.aiAnalysis.recommendation}
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({Math.round(application.aiAnalysis.confidence * 100)}% confidence)
                                  </span>
                                </div>
                                <div>
                                  <strong>Reasoning:</strong> {application.aiAnalysis.reasoning}
                                </div>
                                <div>
                                  <strong>Key Factors:</strong>
                                  <ul className="list-disc list-inside ml-2">
                                    {application.aiAnalysis.keyFactors.map((factor, index) => (
                                      <li key={index}>{factor}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <strong>Potential Value:</strong> {formatCurrency(application.aiAnalysis.potentialValue)}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          {!application.aiAnalysis && application.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateAnalysis.mutate(application.id)}
                              disabled={generateAnalysis.isPending}
                            >
                              {generateAnalysis.isPending ? "Analyzing..." : "AI Analysis"}
                            </Button>
                          )}
                          
                          {application.status === "pending" && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => approveApplication.mutate(application.id)}
                                disabled={approveApplication.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => rejectApplication.mutate({
                                  applicationId: application.id,
                                  reason: "Application did not meet our criteria"
                                })}
                                disabled={rejectApplication.isPending}
                                className="border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}