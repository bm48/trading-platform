import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  FileText, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Settings,
  Download,
  Eye
} from "lucide-react";

// Mock data for demonstration
const mockStats = {
  totalUsers: 247,
  activeSubscriptions: 156,
  totalRevenue: 78350,
  activeCases: 89,
  pendingApplications: 23,
  documentsGenerated: 342
};

const mockRecentCases = [
  {
    id: 1,
    caseNumber: "RC-2024-001",
    clientName: "Mike Thompson",
    trade: "Plumber",
    issueType: "Payment Dispute",
    amount: 12500,
    status: "In Progress",
    priority: "High",
    createdAt: "2024-01-15",
    lastUpdate: "2024-01-18"
  },
  {
    id: 2,
    caseNumber: "RC-2024-002", 
    clientName: "Sarah Wilson",
    trade: "Electrician",
    issueType: "Contract Dispute",
    amount: 8750,
    status: "Pending Review",
    priority: "Medium",
    createdAt: "2024-01-14",
    lastUpdate: "2024-01-17"
  },
  {
    id: 3,
    caseNumber: "RC-2024-003",
    clientName: "David Chen",
    trade: "Carpenter",
    issueType: "Scope Changes",
    amount: 15200,
    status: "Resolved",
    priority: "Low",
    createdAt: "2024-01-12",
    lastUpdate: "2024-01-16"
  }
];

const mockUsers = [
  {
    id: "1",
    name: "Mike Thompson",
    email: "mike@tradeworks.com.au",
    trade: "Plumber",
    planType: "monthly",
    status: "Active",
    joinDate: "2024-01-10",
    totalCases: 5,
    revenue: 348
  },
  {
    id: "2",
    name: "Sarah Wilson", 
    email: "sarah@electrics.com.au",
    trade: "Electrician",
    planType: "strategy",
    status: "Active",
    joinDate: "2024-01-08",
    totalCases: 2,
    revenue: 299
  },
  {
    id: "3",
    name: "David Chen",
    email: "david@carpentry.com.au", 
    trade: "Carpenter",
    planType: "monthly",
    status: "Active",
    joinDate: "2024-01-05",
    totalCases: 8,
    revenue: 695
  }
];

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "resolved": return "bg-green-100 text-green-800";
    case "in progress": return "bg-blue-100 text-blue-800";
    case "pending review": return "bg-yellow-100 text-yellow-800";
    case "active": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function getPriorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case "high": return "bg-red-100 text-red-800";
    case "medium": return "bg-yellow-100 text-yellow-800";
    case "low": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

export default function DemoDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Resolve AI Management</h1>
              <p className="text-gray-600">Backend Administration Dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">Demo Mode</Badge>
              <Button size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cases">Case Management</TabsTrigger>
            <TabsTrigger value="users">User Administration</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockStats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockStats.activeSubscriptions}</div>
                  <p className="text-xs text-muted-foreground">63% conversion rate</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${mockStats.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">+18% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockStats.activeCases}</div>
                  <p className="text-xs text-muted-foreground">23 pending review</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockStats.pendingApplications}</div>
                  <p className="text-xs text-muted-foreground">Require review</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Documents Generated</CardTitle>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockStats.documentsGenerated}</div>
                  <p className="text-xs text-muted-foreground">AI-powered documents</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Case Activity</CardTitle>
                <CardDescription>Latest case updates and status changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockRecentCases.slice(0, 5).map((case_) => (
                    <div key={case_.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium">{case_.caseNumber}</h4>
                          <Badge className={getPriorityColor(case_.priority)}>{case_.priority}</Badge>
                          <Badge className={getStatusColor(case_.status)}>{case_.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {case_.clientName} • {case_.trade} • {case_.issueType}
                        </p>
                        <p className="text-xs text-gray-500">
                          Amount: ${case_.amount.toLocaleString()} • Last updated: {case_.lastUpdate}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cases" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Case Management</CardTitle>
                <CardDescription>Monitor and manage all user cases</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockRecentCases.map((case_) => (
                    <div key={case_.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium">{case_.caseNumber}</h4>
                          <Badge className={getPriorityColor(case_.priority)}>{case_.priority}</Badge>
                          <Badge className={getStatusColor(case_.status)}>{case_.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Client:</strong> {case_.clientName}</p>
                            <p><strong>Trade:</strong> {case_.trade}</p>
                          </div>
                          <div>
                            <p><strong>Issue:</strong> {case_.issueType}</p>
                            <p><strong>Amount:</strong> ${case_.amount.toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Created: {case_.createdAt} • Last updated: {case_.lastUpdate}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">View Details</Button>
                        <Button variant="outline" size="sm">Generate Document</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Administration</CardTitle>
                <CardDescription>Manage user accounts and subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium">{user.name}</h4>
                          <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                          <Badge variant="outline">
                            {user.planType === "monthly" ? "$49/month" : "$299 Strategy Pack"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Email:</strong> {user.email}</p>
                            <p><strong>Trade:</strong> {user.trade}</p>
                          </div>
                          <div>
                            <p><strong>Total Cases:</strong> {user.totalCases}</p>
                            <p><strong>Revenue:</strong> ${user.revenue}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Joined: {user.joinDate}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">View Profile</Button>
                        <Button variant="outline" size="sm">Manage Subscription</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Document Management</CardTitle>
                <CardDescription>AI-generated legal documents and templates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Strategy Packs Generated</h4>
                    <p className="text-2xl font-bold text-blue-600">156</p>
                    <p className="text-sm text-gray-600">This month</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Legal Documents</h4>
                    <p className="text-2xl font-bold text-green-600">89</p>
                    <p className="text-sm text-gray-600">Letters of demand, contracts</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Template Usage</h4>
                    <p className="text-2xl font-bold text-purple-600">97</p>
                    <p className="text-sm text-gray-600">Custom templates</p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h4 className="font-medium mb-4">Recent Documents</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">Strategy Pack - RC-2024-001</p>
                        <p className="text-sm text-gray-600">Payment dispute analysis for Mike Thompson</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-medium">Letter of Demand - RC-2024-002</p>
                        <p className="text-sm text-gray-600">Contract dispute letter for Sarah Wilson</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}