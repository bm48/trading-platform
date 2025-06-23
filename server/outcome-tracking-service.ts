import { supabaseAdmin } from './db';
import { 
  cases, 
  successMetrics, 
  caseOutcomeHistory,
  type CaseOutcomeUpdate,
  type SuccessMetric,
  type CaseOutcomeHistory 
} from '@shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export interface OutcomeAnalytics {
  totalCases: number;
  successfulCases: number;
  partialSuccessCases: number;
  unsuccessfulCases: number;
  settledCases: number;
  ongoingCases: number;
  successRate: number;
  averageRecoveryRate: number;
  averageDaysToResolution: number;
  averageClientSatisfaction: number;
  averageStrategyEffectiveness: number;
  totalAmountClaimed: number;
  totalAmountRecovered: number;
  recommendationRate: number;
  topStrategies: Array<{
    strategy: string;
    successRate: number;
    caseCount: number;
  }>;
  topIssueTypes: Array<{
    issueType: string;
    successRate: number;
    caseCount: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    successRate: number;
    casesResolved: number;
    averageRecovery: number;
  }>;
}

export interface CaseOutcomeMetrics {
  recoveryPercentage: number;
  daysToResolution: number;
  strategyEffectiveness: number;
  clientSatisfaction: number;
  recommendationLikelihood: boolean;
}

export class OutcomeTrackingService {
  // Update case outcome
  async updateCaseOutcome(
    caseId: number, 
    userId: string, 
    outcomeData: CaseOutcomeUpdate
  ): Promise<void> {
    try {
      // Get current case data
      const { data: currentCase } = await supabaseAdmin
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .eq('user_id', userId)
        .single();

      if (!currentCase) {
        throw new Error('Case not found or access denied');
      }

      // Calculate derived metrics
      const metrics = this.calculateCaseMetrics(outcomeData, currentCase);
      
      // Update case with outcome data
      const updateData = {
        ...outcomeData,
        status: outcomeData.outcome === 'ongoing' ? 'active' : 'resolved',
        recovery_percentage: metrics.recoveryPercentage,
        days_to_resolution: metrics.daysToResolution,
        resolved_at: outcomeData.outcome !== 'ongoing' ? new Date().toISOString() : null,
        closed_at: ['successful', 'unsuccessful', 'settled'].includes(outcomeData.outcome || '') 
          ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      // Convert camelCase to snake_case for database
      const dbUpdateData = {
        outcome: updateData.outcome,
        outcome_description: updateData.outcomeDescription,
        amount_recovered: updateData.amountRecovered,
        amount_claimed: updateData.amountClaimed,
        recovery_percentage: updateData.recovery_percentage,
        resolution_method: updateData.resolutionMethod,
        days_to_resolution: updateData.days_to_resolution,
        client_satisfaction_score: updateData.clientSatisfactionScore,
        strategy_effectiveness: updateData.strategyEffectiveness,
        would_recommend: updateData.wouldRecommend,
        lessons_learned: updateData.lessonsLearned,
        status: updateData.status,
        resolved_at: updateData.resolved_at,
        closed_at: updateData.closed_at,
        updated_at: updateData.updated_at
      };

      await supabaseAdmin
        .from('cases')
        .update(dbUpdateData)
        .eq('id', caseId);

      // Record outcome history
      await this.recordOutcomeHistory(caseId, userId, currentCase, outcomeData);

      // Update success metrics
      await this.updateSuccessMetrics(userId);

    } catch (error) {
      console.error('Error updating case outcome:', error);
      throw error;
    }
  }

  // Calculate case-specific metrics
  private calculateCaseMetrics(
    outcomeData: CaseOutcomeUpdate, 
    currentCase: any
  ): CaseOutcomeMetrics {
    const recoveryPercentage = outcomeData.amountRecovered && outcomeData.amountClaimed
      ? (outcomeData.amountRecovered / outcomeData.amountClaimed) * 100
      : 0;

    const daysToResolution = currentCase.created_at
      ? Math.floor((new Date().getTime() - new Date(currentCase.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      recoveryPercentage,
      daysToResolution,
      strategyEffectiveness: outcomeData.strategyEffectiveness || 0,
      clientSatisfaction: outcomeData.clientSatisfactionScore || 0,
      recommendationLikelihood: outcomeData.wouldRecommend || false
    };
  }

  // Record outcome change history
  private async recordOutcomeHistory(
    caseId: number,
    userId: string,
    previousCase: any,
    newOutcome: CaseOutcomeUpdate
  ): Promise<void> {
    const historyData = {
      case_id: caseId,
      user_id: userId,
      previous_outcome: previousCase.outcome,
      new_outcome: newOutcome.outcome,
      previous_status: previousCase.status,
      new_status: newOutcome.outcome === 'ongoing' ? 'active' : 'resolved',
      change_reason: `Outcome updated to ${newOutcome.outcome}`,
      amount_recovered: newOutcome.amountRecovered,
      strategy_used: newOutcome.resolutionMethod,
      milestone_reached: newOutcome.outcome,
      notes: newOutcome.outcomeDescription
    };

    await supabaseAdmin
      .from('case_outcome_history')
      .insert(historyData);
  }

  // Update aggregated success metrics
  async updateSuccessMetrics(userId: string): Promise<void> {
    try {
      const now = new Date();
      const currentMonth = now.toISOString().substring(0, 7); // YYYY-MM format

      // Get all resolved cases for the user
      const { data: resolvedCases } = await supabaseAdmin
        .from('cases')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['resolved', 'closed']);

      if (!resolvedCases || resolvedCases.length === 0) {
        return;
      }

      // Calculate metrics
      const analytics = this.calculateAnalytics(resolvedCases);

      // Upsert monthly metrics
      const monthlyMetric = {
        user_id: userId,
        metric_type: 'monthly_summary',
        period: 'monthly',
        period_date: new Date(currentMonth + '-01').toISOString(),
        total_cases: analytics.totalCases,
        successful_cases: analytics.successfulCases,
        partial_success_cases: analytics.partialSuccessCases,
        unsuccessful_cases: analytics.unsuccessfulCases,
        settled_cases: analytics.settledCases,
        success_rate: analytics.successRate,
        average_recovery_rate: analytics.averageRecoveryRate,
        average_days_to_resolution: analytics.averageDaysToResolution,
        average_client_satisfaction: analytics.averageClientSatisfaction,
        average_strategy_effectiveness: analytics.averageStrategyEffectiveness,
        total_amount_claimed: analytics.totalAmountClaimed,
        total_amount_recovered: analytics.totalAmountRecovered,
        recommendation_rate: analytics.recommendationRate,
        most_successful_strategy: analytics.topStrategies[0]?.strategy || null,
        most_successful_issue_type: analytics.topIssueTypes[0]?.issueType || null,
        updated_at: now.toISOString()
      };

      // Check if metric exists for this month
      const { data: existingMetric } = await supabaseAdmin
        .from('success_metrics')
        .select('id')
        .eq('user_id', userId)
        .eq('period', 'monthly')
        .eq('period_date', monthlyMetric.period_date)
        .single();

      if (existingMetric) {
        await supabaseAdmin
          .from('success_metrics')
          .update(monthlyMetric)
          .eq('id', existingMetric.id);
      } else {
        await supabaseAdmin
          .from('success_metrics')
          .insert(monthlyMetric);
      }

    } catch (error) {
      console.error('Error updating success metrics:', error);
    }
  }

  // Calculate comprehensive analytics
  private calculateAnalytics(cases: any[]): OutcomeAnalytics {
    const totalCases = cases.length;
    const successfulCases = cases.filter(c => c.outcome === 'successful').length;
    const partialSuccessCases = cases.filter(c => c.outcome === 'partial_success').length;
    const unsuccessfulCases = cases.filter(c => c.outcome === 'unsuccessful').length;
    const settledCases = cases.filter(c => c.outcome === 'settled').length;
    const ongoingCases = cases.filter(c => c.outcome === 'ongoing' || !c.outcome).length;

    const successRate = totalCases > 0 
      ? ((successfulCases + partialSuccessCases) / totalCases) * 100 
      : 0;

    const casesWithRecovery = cases.filter(c => c.recovery_percentage);
    const averageRecoveryRate = casesWithRecovery.length > 0
      ? casesWithRecovery.reduce((sum, c) => sum + (c.recovery_percentage || 0), 0) / casesWithRecovery.length
      : 0;

    const casesWithResolutionTime = cases.filter(c => c.days_to_resolution);
    const averageDaysToResolution = casesWithResolutionTime.length > 0
      ? casesWithResolutionTime.reduce((sum, c) => sum + (c.days_to_resolution || 0), 0) / casesWithResolutionTime.length
      : 0;

    const casesWithSatisfaction = cases.filter(c => c.client_satisfaction_score);
    const averageClientSatisfaction = casesWithSatisfaction.length > 0
      ? casesWithSatisfaction.reduce((sum, c) => sum + (c.client_satisfaction_score || 0), 0) / casesWithSatisfaction.length
      : 0;

    const casesWithEffectiveness = cases.filter(c => c.strategy_effectiveness);
    const averageStrategyEffectiveness = casesWithEffectiveness.length > 0
      ? casesWithEffectiveness.reduce((sum, c) => sum + (c.strategy_effectiveness || 0), 0) / casesWithEffectiveness.length
      : 0;

    const totalAmountClaimed = cases.reduce((sum, c) => sum + (parseFloat(c.amount_claimed) || 0), 0);
    const totalAmountRecovered = cases.reduce((sum, c) => sum + (parseFloat(c.amount_recovered) || 0), 0);

    const casesWithRecommendation = cases.filter(c => c.would_recommend !== null);
    const recommendationRate = casesWithRecommendation.length > 0
      ? (casesWithRecommendation.filter(c => c.would_recommend).length / casesWithRecommendation.length) * 100
      : 0;

    // Calculate top strategies and issue types
    const strategyStats = this.calculateTopStrategies(cases);
    const issueTypeStats = this.calculateTopIssueTypes(cases);
    const monthlyTrends = this.calculateMonthlyTrends(cases);

    return {
      totalCases,
      successfulCases,
      partialSuccessCases,
      unsuccessfulCases,
      settledCases,
      ongoingCases,
      successRate,
      averageRecoveryRate,
      averageDaysToResolution,
      averageClientSatisfaction,
      averageStrategyEffectiveness,
      totalAmountClaimed,
      totalAmountRecovered,
      recommendationRate,
      topStrategies: strategyStats,
      topIssueTypes: issueTypeStats,
      monthlyTrends
    };
  }

  // Calculate top performing strategies
  private calculateTopStrategies(cases: any[]): Array<{strategy: string, successRate: number, caseCount: number}> {
    const strategyGroups = cases.reduce((acc, c) => {
      if (!c.resolution_method) return acc;
      
      if (!acc[c.resolution_method]) {
        acc[c.resolution_method] = { total: 0, successful: 0 };
      }
      
      acc[c.resolution_method].total++;
      if (['successful', 'partial_success'].includes(c.outcome)) {
        acc[c.resolution_method].successful++;
      }
      
      return acc;
    }, {} as Record<string, {total: number, successful: number}>);

    return Object.entries(strategyGroups)
      .map(([strategy, stats]) => ({
        strategy,
        successRate: (stats.successful / stats.total) * 100,
        caseCount: stats.total
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);
  }

  // Calculate top performing issue types
  private calculateTopIssueTypes(cases: any[]): Array<{issueType: string, successRate: number, caseCount: number}> {
    const issueGroups = cases.reduce((acc, c) => {
      if (!c.issue_type) return acc;
      
      if (!acc[c.issue_type]) {
        acc[c.issue_type] = { total: 0, successful: 0 };
      }
      
      acc[c.issue_type].total++;
      if (['successful', 'partial_success'].includes(c.outcome)) {
        acc[c.issue_type].successful++;
      }
      
      return acc;
    }, {} as Record<string, {total: number, successful: number}>);

    return Object.entries(issueGroups)
      .map(([issueType, stats]) => ({
        issueType,
        successRate: (stats.successful / stats.total) * 100,
        caseCount: stats.total
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);
  }

  // Calculate monthly trends
  private calculateMonthlyTrends(cases: any[]): Array<{month: string, successRate: number, casesResolved: number, averageRecovery: number}> {
    const monthlyGroups = cases.reduce((acc, c) => {
      if (!c.resolved_at) return acc;
      
      const month = c.resolved_at.substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { total: 0, successful: 0, totalRecovery: 0, recoveryCount: 0 };
      }
      
      acc[month].total++;
      if (['successful', 'partial_success'].includes(c.outcome)) {
        acc[month].successful++;
      }
      
      if (c.recovery_percentage) {
        acc[month].totalRecovery += c.recovery_percentage;
        acc[month].recoveryCount++;
      }
      
      return acc;
    }, {} as Record<string, {total: number, successful: number, totalRecovery: number, recoveryCount: number}>);

    return Object.entries(monthlyGroups)
      .map(([month, stats]) => ({
        month,
        successRate: (stats.successful / stats.total) * 100,
        casesResolved: stats.total,
        averageRecovery: stats.recoveryCount > 0 ? stats.totalRecovery / stats.recoveryCount : 0
      }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12);
  }

  // Get user analytics
  async getUserAnalytics(userId: string, period?: string): Promise<OutcomeAnalytics> {
    try {
      let query = supabaseAdmin
        .from('cases')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['resolved', 'closed']);

      // Add date filtering if period specified
      if (period) {
        const now = new Date();
        let startDate: Date;
        
        switch (period) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'quarter':
            startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = new Date(0); // All time
        }
        
        query = query.gte('resolved_at', startDate.toISOString());
      }

      const { data: cases } = await query;
      
      return this.calculateAnalytics(cases || []);
    } catch (error) {
      console.error('Error getting user analytics:', error);
      throw error;
    }
  }

  // Get success metrics history
  async getSuccessMetricsHistory(userId: string, limit: number = 12): Promise<SuccessMetric[]> {
    try {
      const { data } = await supabaseAdmin
        .from('success_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('period', 'monthly')
        .order('period_date', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error('Error getting success metrics history:', error);
      throw error;
    }
  }

  // Get case outcome history
  async getCaseOutcomeHistory(caseId: number): Promise<CaseOutcomeHistory[]> {
    try {
      const { data } = await supabaseAdmin
        .from('case_outcome_history')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      return data || [];
    } catch (error) {
      console.error('Error getting case outcome history:', error);
      throw error;
    }
  }
}

export const outcomeTrackingService = new OutcomeTrackingService();