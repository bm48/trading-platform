import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Tags, Brain, Plus, X, Sparkles, Check, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface DocumentTag {
  id: number;
  name: string;
  category: string;
  color: string;
  description?: string;
  is_system: boolean;
  usage_count: number;
}

interface TagAssignment {
  id: number;
  document_id: number;
  tag_id: number;
  assigned_by: string;
  confidence_score?: number;
  is_ai_suggested: boolean;
  tag: DocumentTag;
}

interface TagSuggestion {
  tag: string;
  confidence: number;
  reasoning: string;
  category: string;
}

interface AIAnalysis {
  summary: string;
  documentType: string;
  legalRelevance: string;
  suggestedTags: TagSuggestion[];
}

interface DocumentTaggingProps {
  documentId: number;
  documentName: string;
}

export function DocumentTagging({ documentId, documentName }: DocumentTaggingProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagCategory, setNewTagCategory] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all available tags
  const { data: allTags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ['/api/tags'],
    queryFn: () => apiRequest('GET', '/api/tags'),
  });

  // Fetch current document tags
  const { data: currentTags = [], isLoading: currentTagsLoading } = useQuery({
    queryKey: ['/api/documents', documentId, 'tags'],
    queryFn: () => apiRequest('GET', `/api/documents/${documentId}/tags`),
  });

  // Fetch AI suggestions
  const { data: aiSuggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['/api/documents', documentId, 'tag-suggestions'],
    queryFn: () => apiRequest('GET', `/api/documents/${documentId}/tag-suggestions`),
  });

  // AI analysis mutation
  const analyzeDocumentMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/documents/${documentId}/analyze-tags`),
    onSuccess: (data: AIAnalysis) => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents', documentId, 'tag-suggestions'] });
      toast({
        title: "Analysis Complete",
        description: `Found ${data.suggestedTags.length} AI-suggested tags for ${documentName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.response?.data?.message || "Failed to analyze document",
        variant: "destructive",
      });
    }
  });

  // Apply tags mutation
  const applyTagsMutation = useMutation({
    mutationFn: (tagIds: number[]) => 
      apiRequest('POST', `/api/documents/${documentId}/tags`, { tagIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents', documentId, 'tags'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
      setSelectedTags([]);
      toast({
        title: "Tags Applied",
        description: "Document tags updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Apply Tags",
        description: error.response?.data?.message || "Failed to apply tags",
        variant: "destructive",
      });
    }
  });

  // Create custom tag mutation
  const createTagMutation = useMutation({
    mutationFn: () => 
      apiRequest('POST', '/api/tags', {
        name: newTagName,
        category: newTagCategory,
        description: newTagDescription
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
      setIsCreateTagOpen(false);
      setNewTagName('');
      setNewTagCategory('');
      setNewTagDescription('');
      toast({
        title: "Tag Created",
        description: `Custom tag "${newTagName}" created successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Tag",
        description: error.response?.data?.message || "Failed to create custom tag",
        variant: "destructive",
      });
    }
  });

  const handleAnalyzeDocument = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeDocumentMutation.mutateAsync();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyTags = () => {
    if (selectedTags.length === 0) {
      toast({
        title: "No Tags Selected",
        description: "Please select at least one tag to apply",
        variant: "destructive",
      });
      return;
    }
    applyTagsMutation.mutate(selectedTags);
  };

  const handleApplyAISuggestion = (suggestion: TagSuggestion) => {
    // Find the tag by name
    const tag = allTags.find((t: DocumentTag) => t.name === suggestion.tag);
    if (tag) {
      applyTagsMutation.mutate([tag.id]);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      legal: 'bg-red-100 text-red-800 border-red-200',
      financial: 'bg-green-100 text-green-800 border-green-200',
      evidence: 'bg-purple-100 text-purple-800 border-purple-200',
      communication: 'bg-blue-100 text-blue-800 border-blue-200',
      administrative: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const tagsByCategory = allTags.reduce((acc: Record<string, DocumentTag[]>, tag: DocumentTag) => {
    if (!acc[tag.category]) acc[tag.category] = [];
    acc[tag.category].push(tag);
    return acc;
  }, {});

  if (tagsLoading || currentTagsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            Document Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="h-5 w-5" />
          Smart Document Tagging
        </CardTitle>
        <CardDescription>
          Organize your legal documents with AI-powered tag suggestions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Current Tags</TabsTrigger>
            <TabsTrigger value="add">Add Tags</TabsTrigger>
            <TabsTrigger value="ai">AI Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            <div className="space-y-2">
              <Label>Tags applied to: {documentName}</Label>
              <div className="flex flex-wrap gap-2 min-h-[60px] p-3 border rounded-lg bg-gray-50">
                {currentTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tags applied yet</p>
                ) : (
                  currentTags.map((assignment: TagAssignment) => (
                    <Badge
                      key={assignment.id}
                      variant="secondary"
                      className={getCategoryColor(assignment.tag.category)}
                    >
                      {assignment.tag.name}
                      {assignment.is_ai_suggested && (
                        <Sparkles className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <div className="space-y-4">
              {Object.entries(tagsByCategory).map(([category, tags]) => (
                <div key={category} className="space-y-2">
                  <Label className="capitalize font-medium">{category} Tags</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-gray-50">
                    {tags.map((tag) => {
                      const isSelected = selectedTags.includes(tag.id);
                      const isAlreadyApplied = currentTags.some(
                        (assignment: TagAssignment) => assignment.tag.id === tag.id
                      );
                      
                      return (
                        <Badge
                          key={tag.id}
                          variant={isSelected ? "default" : "outline"}
                          className={`cursor-pointer transition-colors ${
                            isAlreadyApplied 
                              ? 'opacity-50 cursor-not-allowed' 
                              : isSelected 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-secondary'
                          }`}
                          onClick={() => {
                            if (isAlreadyApplied) return;
                            setSelectedTags(prev => 
                              isSelected 
                                ? prev.filter(id => id !== tag.id)
                                : [...prev, tag.id]
                            );
                          }}
                        >
                          {tag.name}
                          {isAlreadyApplied && <Check className="h-3 w-3 ml-1" />}
                          {tag.is_system && <Sparkles className="h-3 w-3 ml-1" />}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))}
              
              <div className="flex gap-2">
                <Button
                  onClick={handleApplyTags}
                  disabled={selectedTags.length === 0 || applyTagsMutation.isPending}
                >
                  {applyTagsMutation.isPending ? 'Applying...' : `Apply ${selectedTags.length} Tags`}
                </Button>

                <Dialog open={isCreateTagOpen} onOpenChange={setIsCreateTagOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Custom Tag
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Custom Tag</DialogTitle>
                      <DialogDescription>
                        Create a custom tag for your specific needs
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="tagName">Tag Name</Label>
                        <Input
                          id="tagName"
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          placeholder="Enter tag name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tagCategory">Category</Label>
                        <Select value={newTagCategory} onValueChange={setNewTagCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="legal">Legal</SelectItem>
                            <SelectItem value="financial">Financial</SelectItem>
                            <SelectItem value="evidence">Evidence</SelectItem>
                            <SelectItem value="communication">Communication</SelectItem>
                            <SelectItem value="administrative">Administrative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="tagDescription">Description (Optional)</Label>
                        <Textarea
                          id="tagDescription"
                          value={newTagDescription}
                          onChange={(e) => setNewTagDescription(e.target.value)}
                          placeholder="Describe when this tag should be used"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => createTagMutation.mutate()}
                          disabled={!newTagName || !newTagCategory || createTagMutation.isPending}
                        >
                          {createTagMutation.isPending ? 'Creating...' : 'Create Tag'}
                        </Button>
                        <Button variant="outline" onClick={() => setIsCreateTagOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>AI-Powered Analysis</Label>
                  <p className="text-sm text-muted-foreground">
                    Get intelligent tag suggestions based on document content
                  </p>
                </div>
                <Button
                  onClick={handleAnalyzeDocument}
                  disabled={isAnalyzing || analyzeDocumentMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Brain className="h-4 w-4" />
                  {isAnalyzing || analyzeDocumentMutation.isPending ? 'Analyzing...' : 'Analyze Document'}
                </Button>
              </div>

              {suggestionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : aiSuggestions ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <h4 className="font-medium text-blue-900 mb-2">Document Analysis</h4>
                    <p className="text-sm text-blue-800 mb-2">{aiSuggestions.document_analysis}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>AI Suggested Tags</Label>
                    {aiSuggestions.suggested_tags?.map((suggestion: TagSuggestion, index: number) => {
                      const isAlreadyApplied = currentTags.some(
                        (assignment: TagAssignment) => assignment.tag.name === suggestion.tag
                      );
                      
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getCategoryColor(suggestion.category)}>
                                {suggestion.tag}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {Math.round(suggestion.confidence * 100)}% confidence
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleApplyAISuggestion(suggestion)}
                            disabled={isAlreadyApplied || applyTagsMutation.isPending}
                          >
                            {isAlreadyApplied ? 'Applied' : 'Apply'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Click "Analyze Document" to get AI-powered tag suggestions
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}