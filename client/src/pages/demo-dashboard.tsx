import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
  Eye,
  Mail,
  Bell,
  Shield,
  Database
} from "lucide-react";

// Mock data for demonstration
const mockStats = {
  totalUsers: 247,
  activeSubscriptions: 156,
  totalRevenue: 78350,
  activeCases: 89,
  pendingApplications: 23,
  documentsGenerated: 342,
  pendingStrategyPacks: 7
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

const mockPendingStrategyPacks = [
  {
    id: 1,
    caseNumber: "RC-2024-001",
    clientName: "Mike Thompson",
    trade: "Plumber",
    issueType: "Payment Dispute",
    amount: 12500,
    generatedAt: "2024-01-19 09:30",
    aiConfidence: 94,
    summary: "Client defaulted on $12,500 payment for bathroom renovation. Contract clearly outlines payment terms. Strong case for debt recovery.",
    keyPoints: [
      "Valid contract with clear payment terms",
      "Work completed to satisfaction (photos available)",
      "Previous communication attempts documented",
      "No legitimate disputes raised by client"
    ],
    recommendedActions: [
      "Send formal letter of demand (draft attached)",
      "File with relevant trade licensing board",
      "Consider small claims court if under $10k threshold",
      "Engage debt collection agency as final option"
    ],
    documents: ["Contract Agreement", "Progress Photos", "Email Communications", "Invoice History"]
  },
  {
    id: 2,
    caseNumber: "RC-2024-004",
    clientName: "Jennifer Walsh",
    trade: "Electrician",
    issueType: "Scope Dispute",
    amount: 8750,
    generatedAt: "2024-01-19 14:15",
    aiConfidence: 87,
    summary: "Client demanding additional work outside original scope without compensation. Clear documentation supports tradesperson position.",
    keyPoints: [
      "Original scope clearly defined in signed contract",
      "Additional work requests documented via email",
      "Standard industry practices support billing for extras",
      "Client acknowledged scope changes verbally"
    ],
    recommendedActions: [
      "Provide detailed breakdown of additional work",
      "Reference industry standards for variation pricing",
      "Offer compromise payment plan if needed",
      "Consider mediation through industry body"
    ],
    documents: ["Original Contract", "Variation Requests", "Time Sheets", "Industry Rate Guide"]
  },
  {
    id: 3,
    caseNumber: "RC-2024-005",
    clientName: "Robert Kim",
    trade: "Carpenter",
    issueType: "Defect Claims",
    amount: 15200,
    generatedAt: "2024-01-19 16:45",
    aiConfidence: 91,
    summary: "Client claiming defects in kitchen renovation, requesting full refund. Investigation shows claims are largely unfounded.",
    keyPoints: [
      "Work completed to Australian Standards",
      "Independent inspection supports quality",
      "Minor issues already addressed at no cost",
      "Client's expectations exceed contract specifications"
    ],
    recommendedActions: [
      "Provide independent inspection report",
      "Offer warranty repair for any legitimate issues",
      "Stand firm on completed work quality",
      "Document all future interactions carefully"
    ],
    documents: ["Quality Inspection Report", "Warranty Documents", "Before/After Photos", "Standards Compliance"]
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const [editingPack, setEditingPack] = useState(null);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    systemAlerts: true,
    maintenanceMode: false,
    autoBackup: true,
    dataRetention: "12",
    apiRateLimit: "1000",
    platformName: "Resolve AI",
    supportEmail: "support@resolveai.com.au",
    maxCasesPerUser: "50",
    adminEmail: "admin@resolveai.com.au"
  });

  const handlePreview = (pack) => {
    setSelectedPack(pack);
    setPreviewOpen(true);
  };

  const handleEdit = (pack) => {
    setEditingPack({...pack});
    setEditOpen(true);
  };

  const handleSaveEdit = () => {
    // In a real app, this would save to the database
    setEditOpen(false);
    setEditingPack(null);
  };

  const handleGeneratePDF = async (pack: any) => {
    try {
      // Convert the strategy pack data to case format for the API
      const caseData = {
        title: `${pack.trade} Dispute - ${pack.clientName}`,
        issueType: pack.issueType,
        amount: pack.amount.toString(),
        description: `Strategy pack case for ${pack.clientName}`,
        caseNumber: pack.caseNumber
      };

      const response = await fetch('/api/generate-ai-strategy-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ caseData }),
      });

      if (response.ok) {
        const result = await response.json();
        // Open the download link
        window.open(result.downloadUrl, '_blank');
        alert('AI Strategy Pack PDF generated successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to generate PDF: ${error.message}`);
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

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
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Platform Settings</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* General Settings */}
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center">
                        <Shield className="w-5 h-5 mr-2" />
                        General Settings
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="platformName">Platform Name</Label>
                            <Input 
                              id="platformName"
                              value={settings.platformName}
                              onChange={(e) => setSettings({...settings, platformName: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="supportEmail">Support Email</Label>
                            <Input 
                              id="supportEmail"
                              type="email"
                              value={settings.supportEmail}
                              onChange={(e) => setSettings({...settings, supportEmail: e.target.value})}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="maxCases">Max Cases Per User</Label>
                            <Input 
                              id="maxCases"
                              type="number"
                              value={settings.maxCasesPerUser}
                              onChange={(e) => setSettings({...settings, maxCasesPerUser: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="adminEmail">Admin Email</Label>
                            <Input 
                              id="adminEmail"
                              type="email"
                              value={settings.adminEmail}
                              onChange={(e) => setSettings({...settings, adminEmail: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Notification Settings */}
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center">
                        <Bell className="w-5 h-5 mr-2" />
                        Notification Settings
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="emailNotifications">Email Notifications</Label>
                            <p className="text-sm text-gray-600">Send email alerts for important events</p>
                          </div>
                          <Switch 
                            id="emailNotifications"
                            checked={settings.emailNotifications}
                            onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="smsNotifications">SMS Notifications</Label>
                            <p className="text-sm text-gray-600">Send SMS alerts for urgent issues</p>
                          </div>
                          <Switch 
                            id="smsNotifications"
                            checked={settings.smsNotifications}
                            onCheckedChange={(checked) => setSettings({...settings, smsNotifications: checked})}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="systemAlerts">System Alerts</Label>
                            <p className="text-sm text-gray-600">Receive alerts about system issues</p>
                          </div>
                          <Switch 
                            id="systemAlerts"
                            checked={settings.systemAlerts}
                            onCheckedChange={(checked) => setSettings({...settings, systemAlerts: checked})}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* System Settings */}
                    <div>
                      <h3 className="text-lg font-medium mb-4 flex items-center">
                        <Database className="w-5 h-5 mr-2" />
                        System Settings
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                            <p className="text-sm text-gray-600">Put platform in maintenance mode</p>
                          </div>
                          <Switch 
                            id="maintenanceMode"
                            checked={settings.maintenanceMode}
                            onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="autoBackup">Auto Backup</Label>
                            <p className="text-sm text-gray-600">Automatically backup data daily</p>
                          </div>
                          <Switch 
                            id="autoBackup"
                            checked={settings.autoBackup}
                            onCheckedChange={(checked) => setSettings({...settings, autoBackup: checked})}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="dataRetention">Data Retention (months)</Label>
                            <Input 
                              id="dataRetention"
                              type="number"
                              value={settings.dataRetention}
                              onChange={(e) => setSettings({...settings, dataRetention: e.target.value})}
                            />
                          </div>
                          <div>
                            <Label htmlFor="apiRateLimit">API Rate Limit (requests/hour)</Label>
                            <Input 
                              id="apiRateLimit"
                              type="number"
                              value={settings.apiRateLimit}
                              onChange={(e) => setSettings({...settings, apiRateLimit: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                        Cancel
                      </Button>
                      <div className="space-x-2">
                        <Button variant="outline">
                          Export Settings
                        </Button>
                        <Button onClick={() => {
                          // Save settings logic would go here
                          setSettingsOpen(false);
                        }}>
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cases">Case Management</TabsTrigger>
            <TabsTrigger value="strategy-review">Strategy Review</TabsTrigger>
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

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("strategy-review")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Strategy Packs</CardTitle>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{mockStats.pendingStrategyPacks}</div>
                  <p className="text-xs text-muted-foreground">Awaiting review</p>
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

          <TabsContent value="strategy-review" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Pack Review Queue</CardTitle>
                <CardDescription>Review AI-generated strategy packs before sending to users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {mockPendingStrategyPacks.map((pack) => (
                    <div key={pack.id} className="border rounded-lg p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">{pack.caseNumber} - {pack.clientName}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{pack.trade}</span>
                            <span>•</span>
                            <span>{pack.issueType}</span>
                            <span>•</span>
                            <span>${pack.amount.toLocaleString()}</span>
                            <span>•</span>
                            <span>Generated: {pack.generatedAt}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            AI Confidence: {pack.aiConfidence}%
                          </Badge>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handlePreview(pack)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(pack)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleGeneratePDF(pack)}>
                              <FileText className="w-4 h-4 mr-2" />
                              Generate PDF
                            </Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve & Send
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">AI Analysis Summary</h4>
                        <p className="text-sm text-gray-700">{pack.summary}</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-2 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                            Key Strengths
                          </h4>
                          <ul className="text-sm space-y-1">
                            {pack.keyPoints.map((point, index) => (
                              <li key={index} className="flex items-start">
                                <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
                            Recommended Actions
                          </h4>
                          <ul className="text-sm space-y-1">
                            {pack.recommendedActions.map((action, index) => (
                              <li key={index} className="flex items-start">
                                <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-purple-600" />
                          Supporting Documents
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {pack.documents.map((doc, index) => (
                            <Badge key={index} variant="outline" className="bg-purple-50 text-purple-700">
                              {doc}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-gray-600">
                          Quality check: High confidence analysis with comprehensive documentation
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                            Reject
                          </Button>
                          <Button variant="outline" size="sm">
                            Request Revision
                          </Button>
                        </div>
                      </div>
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

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Strategy Pack Preview - {selectedPack?.caseNumber}</DialogTitle>
          </DialogHeader>
          {selectedPack && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">Case Overview</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Client:</strong> {selectedPack.clientName}</div>
                  <div><strong>Trade:</strong> {selectedPack.trade}</div>
                  <div><strong>Issue Type:</strong> {selectedPack.issueType}</div>
                  <div><strong>Amount:</strong> ${selectedPack.amount.toLocaleString()}</div>
                  <div><strong>AI Confidence:</strong> {selectedPack.aiConfidence}%</div>
                  <div><strong>Generated:</strong> {selectedPack.generatedAt}</div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Executive Summary</h3>
                <p className="text-gray-700 leading-relaxed">{selectedPack.summary}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    Case Strengths
                  </h3>
                  <ul className="space-y-2">
                    {selectedPack.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start">
                        <span className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                        <span className="text-sm">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                    Recommended Strategy
                  </h3>
                  <ol className="space-y-2">
                    {selectedPack.recommendedActions.map((action, index) => (
                      <li key={index} className="flex items-start">
                        <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <span className="text-sm">{action}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-purple-600" />
                  Supporting Documentation
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {selectedPack.documents.map((doc, index) => (
                    <div key={index} className="flex items-center p-3 border rounded-lg bg-gray-50">
                      <FileText className="w-4 h-4 mr-2 text-gray-600" />
                      <span className="text-sm font-medium">{doc}</span>
                      <Button variant="ghost" size="sm" className="ml-auto">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Next Steps</h3>
                <p className="text-sm text-gray-700">
                  This strategy pack provides a comprehensive analysis and action plan. Review the recommended steps and supporting documents before approving for delivery to the client.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  Close Preview
                </Button>
                <Button onClick={() => {
                  setPreviewOpen(false);
                  handleEdit(selectedPack);
                }}>
                  Edit Strategy Pack
                </Button>
                <Button className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve & Send
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Strategy Pack - {editingPack?.caseNumber}</DialogTitle>
          </DialogHeader>
          {editingPack && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="summary">Executive Summary</Label>
                <Textarea 
                  id="summary"
                  value={editingPack.summary}
                  onChange={(e) => setEditingPack({...editingPack, summary: e.target.value})}
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Case Strengths</Label>
                <div className="space-y-2 mt-2">
                  {editingPack.keyPoints.map((point, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={point}
                        onChange={(e) => {
                          const newPoints = [...editingPack.keyPoints];
                          newPoints[index] = e.target.value;
                          setEditingPack({...editingPack, keyPoints: newPoints});
                        }}
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const newPoints = editingPack.keyPoints.filter((_, i) => i !== index);
                          setEditingPack({...editingPack, keyPoints: newPoints});
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingPack({
                        ...editingPack, 
                        keyPoints: [...editingPack.keyPoints, "New strength point"]
                      });
                    }}
                  >
                    Add Strength
                  </Button>
                </div>
              </div>

              <div>
                <Label>Recommended Actions</Label>
                <div className="space-y-2 mt-2">
                  {editingPack.recommendedActions.map((action, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-medium flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <Input
                        value={action}
                        onChange={(e) => {
                          const newActions = [...editingPack.recommendedActions];
                          newActions[index] = e.target.value;
                          setEditingPack({...editingPack, recommendedActions: newActions});
                        }}
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const newActions = editingPack.recommendedActions.filter((_, i) => i !== index);
                          setEditingPack({...editingPack, recommendedActions: newActions});
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingPack({
                        ...editingPack, 
                        recommendedActions: [...editingPack.recommendedActions, "New recommended action"]
                      });
                    }}
                  >
                    Add Action
                  </Button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>
                  Save Changes
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => {
                  handleSaveEdit();
                  // In real app, this would also approve and send
                }}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save & Approve
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}