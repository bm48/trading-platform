import OpenAI from 'openai';
import { supabaseAdmin } from './supabase';
import { document_tags, document_tag_assignments, ai_tag_suggestions } from '../shared/schema';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TagSuggestion {
  tag: string;
  confidence: number;
  reasoning: string;
  category: string;
}

interface DocumentAnalysis {
  summary: string;
  documentType: string;
  legalRelevance: string;
  suggestedTags: TagSuggestion[];
}

export class AITaggingService {
  private readonly predefinedTags = [
    // Legal category
    { name: 'Contract', category: 'legal', description: 'Contract documents and agreements' },
    { name: 'Invoice', category: 'financial', description: 'Invoices and billing documents' },
    { name: 'Payment Claim', category: 'legal', description: 'SOPA payment claims' },
    { name: 'Demand Letter', category: 'legal', description: 'Legal demand correspondence' },
    { name: 'Evidence', category: 'evidence', description: 'Supporting evidence documents' },
    { name: 'Photos', category: 'evidence', description: 'Photographic evidence' },
    { name: 'Email', category: 'communication', description: 'Email correspondence' },
    { name: 'Letter', category: 'communication', description: 'Formal letters' },
    { name: 'Quote', category: 'financial', description: 'Project quotes and estimates' },
    { name: 'Receipt', category: 'financial', description: 'Payment receipts' },
    { name: 'Report', category: 'administrative', description: 'Reports and assessments' },
    { name: 'Notice', category: 'legal', description: 'Legal notices and formal notifications' },
    { name: 'Variation', category: 'legal', description: 'Contract variations and changes' },
    { name: 'Warranty', category: 'legal', description: 'Warranty documents' },
    { name: 'Insurance', category: 'administrative', description: 'Insurance related documents' },
    { name: 'Permit', category: 'administrative', description: 'Permits and approvals' },
    { name: 'Specification', category: 'administrative', description: 'Technical specifications' },
    { name: 'Progress Report', category: 'administrative', description: 'Project progress updates' },
    { name: 'Dispute', category: 'legal', description: 'Dispute related documents' },
    { name: 'Settlement', category: 'legal', description: 'Settlement agreements' }
  ];

  constructor() {
    this.initializePredefinedTags();
  }

  private async initializePredefinedTags() {
    try {
      // Check which tags already exist
      const { data: existingTags, error: fetchError } = await supabaseAdmin
        .from('document_tags')
        .select('name')
        .in('name', this.predefinedTags.map(t => t.name));

      if (fetchError) {
        console.error('Error fetching existing tags:', fetchError);
        return;
      }

      const existingTagNames = new Set(existingTags?.map(t => t.name) || []);

      // Insert only new tags
      const newTags = this.predefinedTags
        .filter(tag => !existingTagNames.has(tag.name))
        .map(tag => ({
          name: tag.name,
          category: tag.category,
          description: tag.description,
          is_system: true,
          color: this.getCategoryColor(tag.category)
        }));

      if (newTags.length > 0) {
        const { error } = await supabaseAdmin
          .from('document_tags')
          .insert(newTags);

        if (error) {
          console.error('Error inserting predefined tags:', error);
        } else {
          console.log(`Initialized ${newTags.length} predefined tags`);
        }
      }
    } catch (error) {
      console.error('Error initializing predefined tags:', error);
    }
  }

  private getCategoryColor(category: string): string {
    const colors = {
      legal: '#DC2626', // Red
      financial: '#059669', // Green
      evidence: '#7C3AED', // Purple
      communication: '#2563EB', // Blue
      administrative: '#D97706' // Orange
    };
    return colors[category as keyof typeof colors] || '#3B82F6';
  }

  async analyzeDocument(documentId: number, filename: string, fileContent?: string): Promise<DocumentAnalysis> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OpenAI API key not found, using fallback analysis');
        return this.getFallbackAnalysis(filename);
      }

      const prompt = `
Analyze this legal document and provide comprehensive tagging suggestions for an Australian construction law platform.

Document filename: ${filename}
${fileContent ? `Document content preview: ${fileContent.substring(0, 2000)}...` : ''}

Please provide:
1. A brief summary of the document
2. Document type classification
3. Legal relevance assessment
4. Suggested tags with confidence scores

Available tag categories:
- legal: Contracts, payment claims, demand letters, notices, disputes
- financial: Invoices, quotes, receipts, financial statements
- evidence: Photos, reports, witness statements, expert opinions
- communication: Emails, letters, meeting notes, correspondence
- administrative: Permits, insurance, specifications, progress reports

Return your analysis as JSON in this exact format:
{
  "summary": "Brief document summary",
  "documentType": "Primary document classification",
  "legalRelevance": "Assessment of legal importance",
  "suggestedTags": [
    {
      "tag": "Tag name",
      "confidence": 0.95,
      "reasoning": "Why this tag applies",
      "category": "legal/financial/evidence/communication/administrative"
    }
  ]
}

Focus on practical tags that help tradespeople organize and find their legal documents efficiently.
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant specialized in legal document analysis for Australian construction and trade industries. Provide accurate, practical document tagging suggestions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const analysis = JSON.parse(content) as DocumentAnalysis;
      
      // Store the analysis in database
      await this.storeTagSuggestions(documentId, analysis);
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing document:', error);
      return this.getFallbackAnalysis(filename);
    }
  }

  private getFallbackAnalysis(filename: string): DocumentAnalysis {
    const lowerFilename = filename.toLowerCase();
    const suggestions: TagSuggestion[] = [];

    // Basic filename-based tagging
    if (lowerFilename.includes('invoice') || lowerFilename.includes('bill')) {
      suggestions.push({
        tag: 'Invoice',
        confidence: 0.8,
        reasoning: 'Filename contains invoice-related terms',
        category: 'financial'
      });
    }
    
    if (lowerFilename.includes('contract') || lowerFilename.includes('agreement')) {
      suggestions.push({
        tag: 'Contract',
        confidence: 0.8,
        reasoning: 'Filename contains contract-related terms',
        category: 'legal'
      });
    }

    if (lowerFilename.includes('photo') || lowerFilename.includes('img') || 
        lowerFilename.match(/\.(jpg|jpeg|png|gif)$/i)) {
      suggestions.push({
        tag: 'Photos',
        confidence: 0.9,
        reasoning: 'Image file format detected',
        category: 'evidence'
      });
    }

    if (lowerFilename.includes('email') || lowerFilename.includes('correspondence')) {
      suggestions.push({
        tag: 'Email',
        confidence: 0.8,
        reasoning: 'Filename contains communication-related terms',
        category: 'communication'
      });
    }

    if (lowerFilename.includes('quote') || lowerFilename.includes('estimate')) {
      suggestions.push({
        tag: 'Quote',
        confidence: 0.8,
        reasoning: 'Filename contains quote-related terms',
        category: 'financial'
      });
    }

    return {
      summary: `Document: ${filename}`,
      documentType: 'General document',
      legalRelevance: 'Standard document - requires manual review for legal significance',
      suggestedTags: suggestions
    };
  }

  private async storeTagSuggestions(documentId: number, analysis: DocumentAnalysis) {
    try {
      const { error } = await supabaseAdmin
        .from('ai_tag_suggestions')
        .insert({
          document_id: documentId,
          suggested_tags: analysis.suggestedTags,
          document_analysis: `${analysis.summary}\n\nType: ${analysis.documentType}\n\nLegal Relevance: ${analysis.legalRelevance}`,
          processing_status: 'completed',
          processed_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing tag suggestions:', error);
      }
    } catch (error) {
      console.error('Error storing tag suggestions:', error);
    }
  }

  async applyTagsToDocument(documentId: number, tagIds: number[], userId: string, isAiSuggested = false) {
    try {
      const assignments = tagIds.map(tagId => ({
        document_id: documentId,
        tag_id: tagId,
        assigned_by: isAiSuggested ? 'ai' : userId,
        is_ai_suggested: isAiSuggested,
        confidence_score: isAiSuggested ? '0.8' : '1.0'
      }));

      const { error } = await supabaseAdmin
        .from('document_tag_assignments')
        .insert(assignments);

      if (error) {
        console.error('Error applying tags:', error);
        return false;
      }

      // Update usage count for tags
      for (const tagId of tagIds) {
        // Get current usage count and increment it
        const { data: tag, error: fetchError } = await supabaseAdmin
          .from('document_tags')
          .select('usage_count')
          .eq('id', tagId)
          .single();

        if (!fetchError && tag) {
          await supabaseAdmin
            .from('document_tags')
            .update({ usage_count: (tag.usage_count || 0) + 1 })
            .eq('id', tagId);
        }
      }

      return true;
    } catch (error) {
      console.error('Error applying tags to document:', error);
      return false;
    }
  }

  async getDocumentTags(documentId: number) {
    try {
      const { data, error } = await supabaseAdmin
        .from('document_tag_assignments')
        .select(`
          *,
          tag:document_tags(*)
        `)
        .eq('document_id', documentId);

      if (error) {
        console.error('Error fetching document tags:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching document tags:', error);
      return [];
    }
  }

  async getTagSuggestions(documentId: number) {
    try {
      const { data, error } = await supabaseAdmin
        .from('ai_tag_suggestions')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching tag suggestions:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching tag suggestions:', error);
      return null;
    }
  }

  async getAllTags() {
    try {
      const { data, error } = await supabaseAdmin
        .from('document_tags')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) {
        console.error('Error fetching all tags:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching all tags:', error);
      return [];
    }
  }

  async createCustomTag(name: string, category: string, description: string, userId: string) {
    try {
      const { data, error } = await supabaseAdmin
        .from('document_tags')
        .insert({
          name,
          category,
          description,
          is_system: false,
          created_by: userId,
          color: this.getCategoryColor(category)
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating custom tag:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error creating custom tag:', error);
      return null;
    }
  }
}

export const aiTaggingService = new AITaggingService();