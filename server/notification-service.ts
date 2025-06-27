import { supabaseStorage } from './supabase-storage';
import type { Notification, InsertNotification } from '@shared/schema';

export interface NotificationFilters {
  status?: 'unread' | 'read' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  type?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationSummary {
  total: number;
  unread: number;
  critical: number;
  high: number;
  byType: Record<string, number>;
}

export class NotificationService {
  constructor() {}

  // Create a new notification
  async createNotification(notification: InsertNotification): Promise<Notification> {
    try {
      const newNotification = await supabaseStorage.createNotification(notification);
      return newNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  // Get notifications for a user with filtering and pagination
  async getUserNotifications(
    userId: string, 
    filters: NotificationFilters = {}
  ): Promise<Notification[]> {
    try {
      const notifications = await supabaseStorage.getUserNotifications(userId, filters);
      
      // Remove expired notifications
      const now = new Date();
      const validNotifications = notifications.filter(n => 
        !n.expires_at || new Date(n.expires_at) > now
      );

      // Sort by priority and creation date
      return validNotifications.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        return new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime(); // Newer first
      });
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw new Error('Failed to fetch notifications');
    }
  }

  // Get notification summary/statistics
  async getNotificationSummary(userId: string): Promise<NotificationSummary> {
    try {
      const notifications = await this.getUserNotifications(userId);
      
      const summary: NotificationSummary = {
        total: notifications.length,
        unread: notifications.filter(n => n.status === 'unread').length,
        critical: notifications.filter(n => n.priority === 'critical').length,
        high: notifications.filter(n => n.priority === 'high').length,
        byType: {},
      };

      // Count by type
      notifications.forEach(n => {
        summary.byType[n.type] = (summary.byType[n.type] || 0) + 1;
      });

      return summary;
    } catch (error) {
      console.error('Error getting notification summary:', error);
      throw new Error('Failed to get notification summary');
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: number, userId: string): Promise<void> {
    try {
      await supabaseStorage.updateNotification(notificationId, {
        status: 'read',
        read_at: new Date(),
      }, userId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    try {
      await supabaseStorage.markAllNotificationsAsRead(userId);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  // Archive notification
  async archiveNotification(notificationId: number, userId: string): Promise<void> {
    try {
      await supabaseStorage.updateNotification(notificationId, {
        status: 'archived',
        archived_at: new Date(),
      }, userId);
    } catch (error) {
      console.error('Error archiving notification:', error);
      throw new Error('Failed to archive notification');
    }
  }

  // Delete notification (permanent)
  async deleteNotification(notificationId: number, userId: string): Promise<void> {
    try {
      await supabaseStorage.deleteNotification(notificationId, userId);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw new Error('Failed to delete notification');
    }
  }

  // Create deadline notifications for cases
  async createDeadlineNotifications(userId: string): Promise<void> {
    try {
      const cases = await supabaseStorage.getUserCases(userId);
      const now = new Date();
      
      for (const caseItem of cases) {
        if (caseItem.deadlineDate) {
          const deadlineDate = new Date(caseItem.deadlineDate);
          const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          let shouldCreateNotification = false;
          let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
          let title = '';
          let message = '';
          
          // Create notifications based on how close the deadline is
          if (daysUntilDeadline <= 1) {
            shouldCreateNotification = true;
            priority = 'critical';
            title = '🚨 Deadline Today!';
            message = `Your case "${caseItem.title}" deadline is today. Take immediate action.`;
          } else if (daysUntilDeadline <= 3) {
            shouldCreateNotification = true;
            priority = 'high';
            title = '⚠️ Deadline Approaching';
            message = `Your case "${caseItem.title}" deadline is in ${daysUntilDeadline} days.`;
          } else if (daysUntilDeadline <= 7) {
            shouldCreateNotification = true;
            priority = 'medium';
            title = '📅 Deadline Reminder';
            message = `Your case "${caseItem.title}" deadline is in ${daysUntilDeadline} days.`;
          }
          
          if (shouldCreateNotification) {
            // Check if we already have a recent deadline notification for this case
            const existingNotifications = await this.getUserNotifications(userId, {
              type: 'deadline',
              limit: 50
            });
            
            const hasRecentDeadlineNotification = existingNotifications.some((n: Notification) => 
              n.related_id === caseItem.id && 
              n.related_type === 'case' &&
              new Date(n.created_at!).getTime() > (now.getTime() - 24 * 60 * 60 * 1000) // Within 24 hours
            );
            
            if (!hasRecentDeadlineNotification) {
              await this.createNotification({
                user_id: userId,
                title,
                message,
                type: 'deadline',
                priority,
                category: 'payment_disputes',
                related_id: caseItem.id,
                related_type: 'case',
                action_url: `/cases/${caseItem.id}`,
                action_label: 'View Case',
                metadata: { daysUntilDeadline, deadlineDate: deadlineDate.toISOString() },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error creating deadline notifications:', error);
    }
  }

  // Create smart AI-powered notifications
  async createSmartNotifications(userId: string): Promise<void> {
    try {
      const cases = await supabaseStorage.getUserCases(userId);
      const contracts = await supabaseStorage.getUserContracts(userId);
      
      // Create case update notifications
      for (const caseItem of cases) {
        if (caseItem.status === 'pending' || caseItem.status === 'in_progress') {
          const daysSinceCreated = Math.floor(
            (Date.now() - new Date(caseItem.createdAt!).getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // Suggest actions for cases that have been idle
          if (daysSinceCreated >= 7) {
            await this.createNotification({
              user_id: userId,
              title: '💡 Case Action Needed',
              message: `Your case "${caseItem.title}" has been open for ${daysSinceCreated} days. Consider taking the next step.`,
              type: 'action_required',
              priority: 'medium',
              category: 'payment_disputes',
              related_id: caseItem.id,
              related_type: 'case',
              action_url: `/cases/${caseItem.id}`,
              action_label: 'Review Case',
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
            });
          }
        }
      }
      
      // Create legal tips and insights
      const legalTips = [
        {
          title: '📚 Legal Tip: Documentation',
          message: 'Always keep detailed records of all communications and work performed. This strengthens your position in disputes.',
          category: 'general',
        },
        {
          title: '💰 Payment Tip: Invoicing',
          message: 'Send invoices immediately upon completion. Include clear payment terms and due dates.',
          category: 'payment_disputes',
        },
        {
          title: '📋 Contract Tip: Scope Definition',
          message: 'Define scope of work clearly in contracts to avoid disputes about additional charges.',
          category: 'contract_issues',
        },
      ];
      
      // Send one random tip per week
      const randomTip = legalTips[Math.floor(Math.random() * legalTips.length)];
      await this.createNotification({
        user_id: userId,
        title: randomTip.title,
        message: randomTip.message,
        type: 'legal_tip',
        priority: 'low',
        category: randomTip.category,
        action_url: '/dashboard',
        action_label: 'Learn More',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
      });
      
    } catch (error) {
      console.error('Error creating smart notifications:', error);
    }
  }

  // Clean up expired notifications
  async cleanupExpiredNotifications(): Promise<void> {
    try {
      await supabaseStorage.deleteExpiredNotifications();
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
    }
  }
}

export const notificationService = new NotificationService();