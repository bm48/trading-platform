import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import FileUpload, { FileList } from '@/components/file-upload';
import { 
  Upload, 
  FileText, 
  Image, 
  FileType, 
  Camera, 
  Calendar,
  Shield,
  Cloud,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function FileUploadDemo() {
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const { toast } = useToast();

  const handleUploadComplete = (file: any) => {
    setUploadedFiles(prev => [...prev, file]);
    toast({
      title: "File Upload Complete",
      description: `${file.name} has been securely stored`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-primary text-primary-foreground p-3 rounded-full">
              <Cloud className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Project Resolve AI<sup className="text-lg">+</sup>
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Secure File Storage & Document Management System
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Bank-level Security</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-500" />
              <span>Instant Upload</span>
            </div>
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-purple-500" />
              <span>Cloud Storage</span>
            </div>
          </div>
        </div>

        {/* File Upload Sections */}
        <Tabs defaultValue="case-files" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="case-files" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Case Files
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <FileType className="h-4 w-4" />
              Contracts
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Photos
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Case Files Tab */}
          <TabsContent value="case-files" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      PDF Case Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FileUpload
                      category="pdf"
                      accept=".pdf"
                      maxSize={25}
                      caseId={1}
                      onUploadComplete={handleUploadComplete}
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Status & Guidelines</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>PDF files up to 25MB</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Automatic virus scanning</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Encrypted storage</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span>Files linked to Case #1</span>
                      </div>
                    </div>
                    
                    {uploadedFiles.length > 0 && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          {uploadedFiles.length} file(s) uploaded successfully
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileContract className="h-5 w-5 text-purple-500" />
                      Contract Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FileUpload
                      category="contract"
                      accept=".pdf,.doc,.docx"
                      maxSize={50}
                      contractId={1}
                      onUploadComplete={handleUploadComplete}
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Contract Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Version control enabled</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Digital signatures supported</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Change tracking</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span>Linked to Contract #1</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-green-500" />
                      Evidence Photos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FileUpload
                      category="photo"
                      accept=".jpg,.jpeg,.png,.gif,.webp"
                      maxSize={20}
                      caseId={1}
                      onUploadComplete={handleUploadComplete}
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Photo Guidelines</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>High-resolution images</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Metadata preservation</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Thumbnail generation</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span>20MB max per image</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-orange-500" />
                      General Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FileUpload
                      category="document"
                      accept=".pdf,.doc,.docx,.txt,.rtf"
                      maxSize={50}
                      onUploadComplete={handleUploadComplete}
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Document Features</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Full-text search</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>OCR processing</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Auto-categorization</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span>Multiple formats supported</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-red-500" />
                      Timeline Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FileUpload
                      category="timeline"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      maxSize={30}
                      onUploadComplete={handleUploadComplete}
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Timeline Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Chronological ordering</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Event correlation</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>Date extraction</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        <span>Evidence chain tracking</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Storage Statistics */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Storage Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-blue-600">50GB</div>
                <div className="text-sm text-gray-500">Storage Limit</div>
                <Badge variant="outline">Professional Plan</Badge>
              </div>
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-green-600">99.9%</div>
                <div className="text-sm text-gray-500">Uptime</div>
                <Badge variant="outline">SLA Guaranteed</Badge>
              </div>
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-purple-600">256-bit</div>
                <div className="text-sm text-gray-500">Encryption</div>
                <Badge variant="outline">Military Grade</Badge>
              </div>
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-orange-600">24/7</div>
                <div className="text-sm text-gray-500">Support</div>
                <Badge variant="outline">Enterprise</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="w-full bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400 mt-1" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Enterprise Security & Compliance
                </h3>
                <p className="text-blue-700 dark:text-blue-200 text-sm leading-relaxed">
                  All files are encrypted in transit and at rest using AES-256 encryption. 
                  Our system complies with Australian Privacy Principles (APPs) and maintains 
                  ISO 27001 certification for information security management.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary">SOC 2 Compliant</Badge>
                  <Badge variant="secondary">GDPR Ready</Badge>
                  <Badge variant="secondary">Australian Hosted</Badge>
                  <Badge variant="secondary">Legal Industry Standard</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}