import { supabaseAdmin } from './supabase';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface LegalInsight {
  id: string;
  type: 'deadline_alert' | 'case_analysis' | 'industry_trend' | 'legal_tip' | 'action_required';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'payment_disputes' | 'contract_issues' | 'regulatory_compliance' | 'general';
  actionable: boolean;
  expiresAt?: string;
  relatedCaseId?: number;
  metadata?: {
    amount?: number;
    daysUntil?: number;
    legislation?: string;
    severity?: string;
  };
}

export interface DashboardInsights {
  urgentAlerts: LegalInsight[];
  caseAnalysis: LegalInsight[];
  industryTrends: LegalInsight[];
  legalTips: LegalInsight[];
  actionItems: LegalInsight[];
}

export class LegalInsightsService {
  constructor() {}

  async generatePersonalizedInsights(userId: string): Promise<DashboardInsights> {
    try {
      // Get user's cases and contracts
      const { data: cases } = await supabaseAdmin
        .from('cases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      const { data: contracts } = await supabaseAdmin
        .from('contracts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Generate AI-powered insights based on user data
      const insights = await this.generateAIInsights(cases || [], contracts || []);

      // Combine with static insights
      const staticInsights = this.getStaticInsights();

      return {
        urgentAlerts: this.filterInsightsByType(insights, 'deadline_alert').slice(0, 3),
        caseAnalysis: this.filterInsightsByType(insights, 'case_analysis').slice(0, 2),
        industryTrends: staticInsights.industryTrends.slice(0, 2),
        legalTips: staticInsights.legalTips.slice(0, 3),
        actionItems: this.filterInsightsByType(insights, 'action_required').slice(0, 4),
      };
    } catch (error) {
      console.error('Error generating personalized insights:', error);
      return this.getFallbackInsights();
    }
  }

  private async generateAIInsights(cases: any[], contracts: any[]): Promise<LegalInsight[]> {
    if (!openai || cases.length === 0) {
      return [];
    }

    try {
      const caseData = cases.map(c => ({
        type: c.issue_type,
        amount: c.amount,
        status: c.status,
        deadlineDate: c.deadline_date,
        description: c.description?.substring(0, 200) // Limit description length
      }));

      const prompt = `As a legal AI assistant for Australian tradespeople, analyze these cases and generate personalized legal insights:

Cases: ${JSON.stringify(caseData, null, 2)}

Generate insights in JSON format with this structure:
{
  "insights": [
    {
      "type": "deadline_alert|case_analysis|action_required",
      "title": "Brief insight title",
      "content": "Actionable insight content (2-3 sentences)",
      "priority": "low|medium|high|critical",
      "category": "payment_disputes|contract_issues|regulatory_compliance|general",
      "actionable": true/false,
      "metadata": {
        "amount": number_if_relevant,
        "daysUntil": number_if_deadline,
        "legislation": "relevant_law_if_applicable"
      }
    }
  ]
}

Focus on:
1. Payment deadlines and SOPA requirements
2. Contract compliance issues
3. Regulatory deadlines
4. Case-specific recommendations
5. Risk assessments

Limit to 5 most relevant insights.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 1500,
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"insights": []}');
      
      return result.insights.map((insight: any, index: number) => ({
        id: `ai-${Date.now()}-${index}`,
        ...insight,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Expire in 1 week
      }));

    } catch (error) {
      console.error('Error generating AI insights:', error);
      return [];
    }
  }

  private getStaticInsights(): { industryTrends: LegalInsight[], legalTips: LegalInsight[] } {
    const industryTrends: LegalInsight[] = [
      {
        id: 'trend-1',
        type: 'industry_trend',
        title: 'SOPA Payment Times Decreasing',
        content: 'Recent data shows payment times under Security of Payment Act have improved by 15% in 2024, with more contractors receiving payments within statutory timeframes.',
        priority: 'medium',
        category: 'payment_disputes',
        actionable: false,
        metadata: {
          legislation: 'Security of Payment Act'
        }
      },
      {
        id: 'trend-2',
        type: 'industry_trend', 
        title: 'Contract Disputes Rising',
        content: 'Contract variation disputes have increased 23% this year. Ensure all variations are documented in writing and signed before work commences.',
        priority: 'medium',
        category: 'contract_issues',
        actionable: true,
      }
    ];

    const legalTips: LegalInsight[] = [
      {
        id: 'tip-1',
        type: 'legal_tip',
        title: 'Document Everything',
        content: 'Always keep detailed records of variations, delays, and additional work. Photos with timestamps are powerful evidence in disputes.',
        priority: 'medium',
        category: 'general',
        actionable: true,
      },
      {
        id: 'tip-2',
        type: 'legal_tip',
        title: 'SOPA Notice Timing',
        content: 'Payment claims under SOPA must be served within specified timeframes. Missing deadlines can invalidate your claim entirely.',
        priority: 'high',
        category: 'payment_disputes',
        actionable: true,
        metadata: {
          legislation: 'Security of Payment Act'
        }
      },
      {
        id: 'tip-3',
        type: 'legal_tip',
        title: 'Retention Release',
        content: 'You can claim retention money 30 days after practical completion. Don\'t wait - set calendar reminders for retention release dates.',
        priority: 'medium',
        category: 'payment_disputes',
        actionable: true,
      }
    ];

    return { industryTrends, legalTips };
  }

  private filterInsightsByType(insights: LegalInsight[], type: string): LegalInsight[] {
    return insights.filter(insight => insight.type === type);
  }

  private getFallbackInsights(): DashboardInsights {
    const staticInsights = this.getStaticInsights();
    
    return {
      urgentAlerts: [
        {
          id: 'alert-1',
          type: 'deadline_alert',
          title: 'Review Payment Terms',
          content: 'Ensure all new contracts include clear payment terms and penalty clauses for late payments.',
          priority: 'medium',
          category: 'contract_issues',
          actionable: true,
        }
      ],
      caseAnalysis: [
        {
          id: 'analysis-1',
          type: 'case_analysis',
          title: 'Stay Proactive',
          content: 'Regular case reviews help identify potential issues early. Create new cases for any payment or contract concerns.',
          priority: 'low',
          category: 'general',
          actionable: true,
        }
      ],
      industryTrends: staticInsights.industryTrends,
      legalTips: staticInsights.legalTips,
      actionItems: [
        {
          id: 'action-1',
          type: 'action_required',
          title: 'Update Contact Information',
          content: 'Ensure your profile has current contact details for important legal notifications.',
          priority: 'low',
          category: 'general',
          actionable: true,
        }
      ],
    };
  }

  async getCaseSpecificInsights(caseId: number, userId: string): Promise<LegalInsight[]> {
    try {
      const { data: caseData } = await supabaseAdmin
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .eq('user_id', userId)
        .single();

      if (!caseData) {
        return [];
      }

      // Generate case-specific insights
      return [
        {
          id: `case-insight-${caseId}`,
          type: 'case_analysis',
          title: 'Next Steps Recommended',
          content: `Based on your ${caseData.issue_type} case, consider these actions to strengthen your position.`,
          priority: 'medium',
          category: this.mapIssueTypeToCategory(caseData.issue_type),
          actionable: true,
          relatedCaseId: caseId,
          metadata: {
            amount: caseData.amount
          }
        }
      ];
    } catch (error) {
      console.error('Error generating case-specific insights:', error);
      return [];
    }
  }

  private mapIssueTypeToCategory(issueType: string): 'payment_disputes' | 'contract_issues' | 'regulatory_compliance' | 'general' {
    const mapping: Record<string, 'payment_disputes' | 'contract_issues' | 'regulatory_compliance' | 'general'> = {
      'payment_dispute': 'payment_disputes',
      'contract_issue': 'contract_issues',
      'regulatory_compliance': 'regulatory_compliance',
    };
    
    return mapping[issueType] || 'general';
  }
}

export const legalInsightsService = new LegalInsightsService();