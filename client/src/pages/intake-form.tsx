import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, FileText, Download, Clock, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import EnhancedIntakeForm from '@/components/enhanced-intake-form';

interface AIGenerationResult {
  success: boolean;
  caseId: number;
  aiContent: any;
  documents: {
    wordDocId: number;
    pdfDocId: number;
  };
  generationId: number;
}

export default function IntakeFormPage() {
  const [currentStep, setCurrentStep] = useState<'form' | 'generating' | 'complete'>('form');
  const [generationResult, setGenerationResult] = useState<AIGenerationResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const generateStrategy = useMutation({
    mutationFn: async (intakeData: any): Promise<AIGenerationResult> => {
      const response = await apiRequest('POST', '/api/ai/generate-strategy', intakeData);
      return response.json();
    },
    onSuccess: (result: AIGenerationResult) => {
      setGenerationResult(result);
      setCurrentStep('complete');
      setProgress(100);
      toast({
        title: "Strategy Generated Successfully",
        description: "Your AI-powered legal strategy pack has been created and is ready for review.",
      });
    },
    onError: (error) => {
      console.error('Strategy generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate strategy pack. Please try again.",
        variant: "destructive",
      });
      setCurrentStep('form');
      setProgress(0);
    },
  });

  const handleFormSubmit = async (intakeData: any) => {
    setCurrentStep('generating');
    setProgress(10);

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 20;
      });
    }, 500);

    try {
      await generateStrategy.mutateAsync(intakeData);
      clearInterval(progressInterval);
    } catch (error) {
      clearInterval(progressInterval);
    }
  };

  const handleDownloadDocument = (type: 'word' | 'pdf', docId: number) => {
    const filename = type === 'word' ? `strategy-${docId}.docx` : `checklist-${docId}.pdf`;
    const endpoint = type === 'word' ? `/api/documents/word/${filename}` : `/api/documents/checklist/${filename}`;
    
    window.open(endpoint, '_blank');
  };

  const handleViewCase = () => {
    if (generationResult?.caseId) {
      setLocation(`/cases/${generationResult.caseId}`);
    }
  };

  if (currentStep === 'generating') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-2xl mx-auto pt-20">
          <Card className="shadow-2xl border-0">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Generating Your Strategy Pack
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Our AI is analyzing your case and creating a comprehensive legal strategy
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between text-sm font-medium">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Analyzing case details and legal requirements</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Generating strategic recommendations</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                  <span>Creating custom document templates</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                  <span>Finalizing strategy pack delivery</span>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800 text-center">
                  <Clock className="w-4 h-4 inline mr-2" />
                  This usually takes 2-3 minutes. Please don't close this page.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === 'complete' && generationResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="max-w-3xl mx-auto pt-20">
          <Card className="shadow-2xl border-0">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Strategy Pack Generated Successfully!
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Your comprehensive legal strategy is ready for download and review
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-8">
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors cursor-pointer"
                      onClick={() => handleDownloadDocument('word', generationResult.documents.wordDocId)}>
                  <CardContent className="p-6 text-center">
                    <FileText className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Strategy Document</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Comprehensive legal strategy with analysis and recommendations
                    </p>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      Word Document
                    </Badge>
                  </CardContent>
                </Card>
                
                <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors cursor-pointer"
                      onClick={() => handleDownloadDocument('pdf', generationResult.documents.pdfDocId)}>
                  <CardContent className="p-6 text-center">
                    <Download className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Action Checklist</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Step-by-step checklist with timelines and deadlines
                    </p>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      PDF Checklist
                    </Badge>
                  </CardContent>
                </Card>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">Admin Review Required</h4>
                    <p className="text-sm text-amber-700">
                      Your strategy pack will be reviewed by our legal experts before final delivery. 
                      You'll receive an email notification once it's approved and ready.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={handleViewCase}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  View Full Case Details
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/dashboard')}
                  className="flex-1"
                >
                  Return to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              AI-Powered Legal Strategy Generator
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Share your case details and let our AI create a comprehensive legal strategy 
              tailored specifically to your situation. Get expert guidance in minutes.
            </p>
          </div>
          
          <EnhancedIntakeForm 
            onSubmit={handleFormSubmit}
            autoSaveInterval={30000}
            showProgress={true}
          />
        </div>
      </div>
    </div>
  );
}