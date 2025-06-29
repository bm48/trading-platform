import { eq, sql, and, desc } from 'drizzle-orm';
import { supabase } from './db';
import { achievements, userAchievements, userStats, type Achievement, type UserAchievement, type UserStats, type InsertUserStats, type InsertUserAchievement } from '../shared/schema';

export interface UserProgress {
  user_id: string;
  level: number;
  total_points: number;
  experience_points: number;
  next_level_points: number;
  achievements_earned: number;
  recent_achievements: Array<{
    achievement: Achievement;
    earned_at: string;
  }>;
  stats: UserStats;
}

export interface AchievementNotification {
  achievement: Achievement;
  points_earned: number;
  new_level?: number;
}

export class AchievementService {
  constructor() {}

  // Calculate points needed for next level (exponential growth)
  private calculateLevelThreshold(level: number): number {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  // Initialize user stats when they first sign up
  async initializeUserStats(userId: string): Promise<UserStats> {
    try {
      const existingStats = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existingStats.data) {
        return existingStats.data as UserStats;
      }

      const newStats: InsertUserStats = {
        user_id: userId,
        total_points: 0,
        level: 1,
        experience_points: 0,
        cases_created: 0,
        contracts_created: 0,
        documents_uploaded: 0,
        ai_documents_generated: 0,
        calendar_events_created: 0,
        login_streak: 0,
        subscription_days: 0,
        achievements_earned: 0,
        last_login_date: new Date()
      };

      const { data, error } = await supabase
        .from('user_stats')
        .insert(newStats)
        .select()
        .single();

      if (error) throw error;

      // Award welcome achievement
      await this.checkAchievement(userId, 'welcome');

      return data as UserStats;
    } catch (error) {
      console.error('Error initializing user stats:', error);
      throw error;
    }
  }

  // Update user stats for specific actions
  async updateUserStats(userId: string, updates: Partial<UserStats>): Promise<UserStats> {
    try {
      // Ensure user stats exist
      await this.initializeUserStats(userId);

      const { data, error } = await supabase
        .from('user_stats')
        .update({
          ...updates,
          updated_at: new Date()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data as UserStats;
    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  }

  // Increment a specific stat counter
  async incrementStat(userId: string, statName: keyof UserStats, amount: number = 1): Promise<UserStats> {
    try {
      const { data, error } = await supabase.rpc('increment_user_stat', {
        user_id: userId,
        stat_name: statName,
        increment_amount: amount
      });

      if (error) {
        console.log('RPC function not available, using alternative method');
        
        // Fallback: Get current stats and update
        const currentStats = await this.getUserStats(userId);
        const currentValue = (currentStats[statName] as number) || 0;
        
        return await this.updateUserStats(userId, {
          [statName]: currentValue + amount
        } as Partial<UserStats>);
      }

      return data as UserStats;
    } catch (error) {
      console.error(`Error incrementing stat ${String(statName)}:`, error);
      throw error;
    }
  }

  // Check and award achievements
  async checkAchievement(userId: string, achievementKey: string, currentValue?: number): Promise<AchievementNotification | null> {
    try {
      // Get the achievement definition
      const { data: achievement, error: achievementError } = await supabase
        .from('achievements')
        .select('*')
        .eq('key', achievementKey)
        .eq('is_active', true)
        .single();

      if (achievementError || !achievement) {
        console.log(`Achievement ${achievementKey} not found or inactive`);
        return null;
      }

      // Check if user already has this achievement
      const { data: existingAchievement } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .eq('achievement_id', achievement.id)
        .single();

      if (existingAchievement?.is_completed) {
        return null; // Already earned
      }

      const achievementData = achievement as Achievement;
      let shouldAward = false;
      let progressValue = currentValue || 0;

      if (achievementData.requirement_type === 'boolean') {
        shouldAward = true;
      } else if (achievementData.requirement_type === 'count') {
        // For count-based achievements, check current progress
        if (currentValue === undefined) {
          const userStats = await this.getUserStats(userId);
          progressValue = this.getStatValue(userStats, achievementKey);
        }
        shouldAward = progressValue >= (achievementData.requirement_value || 1);
      }

      if (shouldAward) {
        // Award the achievement
        const userAchievement: InsertUserAchievement = {
          user_id: userId,
          achievement_id: achievementData.id,
          current_progress: progressValue,
          is_completed: true,
          notified: false
        };

        const { error: insertError } = await supabase
          .from('user_achievements')
          .upsert(userAchievement);

        if (insertError) throw insertError;

        // Add points and check for level up
        const notification = await this.awardPoints(userId, achievementData.points || 10);
        
        return {
          achievement: achievementData,
          points_earned: achievementData.points || 10,
          new_level: notification.new_level
        };
      } else if (achievementData.requirement_type === 'count') {
        // Update progress for count-based achievements
        const userAchievement: InsertUserAchievement = {
          user_id: userId,
          achievement_id: achievementData.id,
          current_progress: progressValue,
          is_completed: false,
          notified: false
        };

        await supabase
          .from('user_achievements')
          .upsert(userAchievement);
      }

      return null;
    } catch (error) {
      console.error('Error checking achievement:', error);
      return null;
    }
  }

  // Award points and handle level progression
  async awardPoints(userId: string, points: number): Promise<{ new_level?: number; total_points: number }> {
    try {
      const userStats = await this.getUserStats(userId);
      const newTotalPoints = userStats.total_points + points;
      const newExperiencePoints = userStats.experience_points + points;
      
      let newLevel = userStats.level;
      let experienceForNextLevel = newExperiencePoints;
      
      // Check for level up
      while (experienceForNextLevel >= this.calculateLevelThreshold(newLevel)) {
        experienceForNextLevel -= this.calculateLevelThreshold(newLevel);
        newLevel++;
      }

      const updatedStats = await this.updateUserStats(userId, {
        total_points: newTotalPoints,
        level: newLevel,
        experience_points: experienceForNextLevel,
        achievements_earned: userStats.achievements_earned + 1
      });

      // Check for level-based achievements
      if (newLevel > userStats.level) {
        await this.checkAchievement(userId, `level_${newLevel}`, newLevel);
      }

      // Check for point-based achievements
      if (newTotalPoints >= 500) await this.checkAchievement(userId, 'point_collector', newTotalPoints);
      if (newTotalPoints >= 1000) await this.checkAchievement(userId, 'power_user', newTotalPoints);
      if (newTotalPoints >= 2500) await this.checkAchievement(userId, 'legendary', newTotalPoints);

      return {
        new_level: newLevel > userStats.level ? newLevel : undefined,
        total_points: newTotalPoints
      };
    } catch (error) {
      console.error('Error awarding points:', error);
      throw error;
    }
  }

  // Get user progress overview
  async getUserProgress(userId: string): Promise<UserProgress> {
    try {
      const userStats = await this.getUserStats(userId);
      
      // Get recent achievements (last 5)
      const { data: recentAchievements, error } = await supabase
        .from('user_achievements')
        .select(`
          earned_at,
          achievements (*)
        `)
        .eq('user_id', userId)
        .eq('is_completed', true)
        .order('earned_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const nextLevelPoints = this.calculateLevelThreshold(userStats.level);

      return {
        user_id: userId,
        level: userStats.level,
        total_points: userStats.total_points,
        experience_points: userStats.experience_points,
        next_level_points: nextLevelPoints,
        achievements_earned: userStats.achievements_earned,
        recent_achievements: (recentAchievements || []).map((ua: any) => ({
          achievement: ua.achievements,
          earned_at: ua.earned_at
        })),
        stats: userStats
      };
    } catch (error) {
      console.error('Error getting user progress:', error);
      throw error;
    }
  }

  // Get all user achievements with progress
  async getUserAchievements(userId: string): Promise<Array<UserAchievement & { achievement: Achievement }>> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements (*)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((ua: any) => ({
        ...ua,
        achievement: ua.achievements
      }));
    } catch (error) {
      console.error('Error getting user achievements:', error);
      return [];
    }
  }

  // Track user actions and award relevant achievements
  async trackAction(userId: string, action: string, metadata?: any): Promise<AchievementNotification[]> {
    const notifications: AchievementNotification[] = [];

    try {
      switch (action) {
        case 'case_created':
          await this.incrementStat(userId, 'cases_created');
          const caseStats = await this.getUserStats(userId);
          
          if (caseStats.cases_created === 1) {
            const notification = await this.checkAchievement(userId, 'first_case');
            if (notification) notifications.push(notification);
          }
          
          if (caseStats.cases_created === 5) {
            const notification = await this.checkAchievement(userId, 'case_master', caseStats.cases_created);
            if (notification) notifications.push(notification);
          }
          break;

        case 'contract_created':
          await this.incrementStat(userId, 'contracts_created');
          const contractStats = await this.getUserStats(userId);
          
          if (contractStats.contracts_created === 1) {
            const notification = await this.checkAchievement(userId, 'first_contract');
            if (notification) notifications.push(notification);
          }
          
          if (contractStats.contracts_created === 5) {
            const notification = await this.checkAchievement(userId, 'contract_pro', contractStats.contracts_created);
            if (notification) notifications.push(notification);
          }
          break;

        case 'document_uploaded':
          await this.incrementStat(userId, 'documents_uploaded');
          const docStats = await this.getUserStats(userId);
          
          if (docStats.documents_uploaded === 1) {
            const notification = await this.checkAchievement(userId, 'document_uploader');
            if (notification) notifications.push(notification);
          }
          
          if (docStats.documents_uploaded === 25) {
            const notification = await this.checkAchievement(userId, 'document_collector', docStats.documents_uploaded);
            if (notification) notifications.push(notification);
          }
          break;

        case 'ai_document_generated':
          await this.incrementStat(userId, 'ai_documents_generated');
          const aiStats = await this.getUserStats(userId);
          
          if (aiStats.ai_documents_generated === 1) {
            const notification = await this.checkAchievement(userId, 'ai_powered');
            if (notification) notifications.push(notification);
          }
          break;

        case 'calendar_connected':
          const notification = await this.checkAchievement(userId, 'calendar_master');
          if (notification) notifications.push(notification);
          break;

        case 'subscription_started':
          const subNotification = await this.checkAchievement(userId, 'subscriber');
          if (subNotification) notifications.push(subNotification);
          break;

        case 'application_submitted':
          const appNotification = await this.checkAchievement(userId, 'first_application');
          if (appNotification) notifications.push(appNotification);
          break;
      }

      return notifications;
    } catch (error) {
      console.error('Error tracking action:', error);
      return [];
    }
  }

  // Helper method to get user stats
  private async getUserStats(userId: string): Promise<UserStats> {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        return await this.initializeUserStats(userId);
      }

      return data as UserStats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return await this.initializeUserStats(userId);
    }
  }

  // Helper method to get stat value based on achievement key
  private getStatValue(userStats: UserStats, achievementKey: string): number {
    switch (achievementKey) {
      case 'case_master': return userStats.cases_created;
      case 'contract_pro': return userStats.contracts_created;
      case 'document_collector': return userStats.documents_uploaded;
      case 'organizer': return userStats.documents_uploaded; // Using documents as proxy for tagging
      case 'streak_3':
      case 'streak_7':
      case 'streak_30': return userStats.login_streak;
      case 'level_5':
      case 'level_10': return userStats.level;
      case 'point_collector':
      case 'power_user':
      case 'legendary': return userStats.total_points;
      default: return 0;
    }
  }

  // Get all achievements for display
  async getAllAchievements(): Promise<Achievement[]> {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return (data || []) as Achievement[];
    } catch (error) {
      console.error('Error getting all achievements:', error);
      return [];
    }
  }
}

export const achievementService = new AchievementService();