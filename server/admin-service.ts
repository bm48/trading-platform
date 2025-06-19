import { supabase, supabaseAdmin } from './db';
import { supabaseStorage } from './supabase-storage';
import type { User, Application, Case, Document } from '@shared/schema';

export interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  totalCases: number;
  activeCases: number;
  pendingApplications: number;
  pendingDocuments: number;
  totalRevenue: number;
  activeSubscriptions: number;
}

export interface AdminNotification {
  id: string;
  type: 'document_review' | 'new_application' | 'subscription_change' | 'case_update';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  createdAt: string;
  relatedId?: number;
  relatedType?: 'application' | 'case' | 'document' | 'user';
}

export interface PendingDocument {
  id: number;
  caseId: number;
  caseTitle: string;
  clientName: string;
  type: 'strategy_pack' | 'demand_letter' | 'notice_to_complete' | 'adjudication_application';
  status: 'draft' | 'reviewed' | 'sent';
  wordDocId?: number;
  pdfDocId?: number;
  aiContent: any;
  intakeData: any;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export class AdminService {
  // Get admin dashboard statistics
  async getAdminStats(): Promise<AdminStats> {
    const today = new Date().toISOString().split('T')[0];
    
    const [
      usersCount,
      newUsersToday,
      casesStats,
      applicationsCount,
      documentsCount,
      subscriptionsStats
    ] = await Promise.all([
      // Total users
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      
      // New users today
      supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today),
      
      // Cases statistics
      Promise.all([
        supabaseAdmin.from('cases').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('cases').select('*', { count: 'exact', head: true }).eq('status', 'active')
      ]),
      
      // Pending applications
      supabaseAdmin
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      
      // Pending documents for review
      supabaseAdmin
        .from('ai_generations')
        .select('*', { count: 'exact', head: true })
        .in('status', ['draft', 'reviewed']),
      
      // Subscription statistics
      Promise.all([
        supabaseAdmin
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('subscription_status', 'active'),
        supabaseAdmin
          .from('users')
          .select('strategy_packs_remaining')
          .eq('subscription_status', 'active')
      ])
    ]);

    // Calculate total revenue (simplified - would need proper payment tracking)
    const activeSubsCount = subscriptionsStats[0].count || 0;
    const estimatedRevenue = activeSubsCount * 49; // $49/month

    return {
      totalUsers: usersCount.count || 0,
      newUsersToday: newUsersToday.count || 0,
      totalCases: casesStats[0].count || 0,
      activeCases: casesStats[1].count || 0,
      pendingApplications: applicationsCount.count || 0,
      pendingDocuments: documentsCount.count || 0,
      totalRevenue: estimatedRevenue,
      activeSubscriptions: activeSubsCount
    };
  }

  // Get pending documents for admin review
  async getPendingDocuments(): Promise<PendingDocument[]> {
    try {
      const { data: generations, error } = await supabaseAdmin
        .from('ai_generations')
        .select(`
          *,
          cases!inner (
            id,
            title,
            user_id
          )
        `)
        .in('status', ['draft', 'reviewed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (generations || []).map(gen => ({
        id: gen.id,
        caseId: gen.case_id,
        caseTitle: gen.cases.title,
        clientName: `${gen.cases.users.first_name || ''} ${gen.cases.users.last_name || ''}`.trim(),
        type: gen.type,
        status: gen.status,
        wordDocId: gen.word_doc_id,
        pdfDocId: gen.pdf_doc_id,
        aiContent: gen.ai_content,
        intakeData: gen.intake_data,
        createdAt: gen.created_at,
        reviewedBy: gen.reviewed_by,
        reviewedAt: gen.reviewed_at
      }));
    } catch (error) {
      console.error('Error fetching pending documents:', error);
      return [];
    }
  }

  // Update document content and status
  async updateDocument(documentId: number, updates: {
    content?: any;
    status?: 'draft' | 'reviewed' | 'sent';
    reviewedBy?: string;
  }): Promise<boolean> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.content) {
        updateData.ai_content = updates.content;
      }
      
      if (updates.status) {
        updateData.status = updates.status;
        if (updates.status === 'reviewed') {
          updateData.reviewed_by = updates.reviewedBy;
          updateData.reviewed_at = new Date().toISOString();
        }
        if (updates.status === 'sent') {
          updateData.sent_by = updates.reviewedBy;
          updateData.sent_at = new Date().toISOString();
        }
      }

      const { error } = await supabaseAdmin
        .from('ai_generations')
        .update(updateData)
        .eq('id', documentId);

      return !error;
    } catch (error) {
      console.error('Error updating document:', error);
      return false;
    }
  }

  // Get all applications with user details
  async getAllApplications(): Promise<Application[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching applications:', error);
      return [];
    }
  }

  // Get user activity timeline
  async getUserActivity(limit: number = 50): Promise<any[]> {
    try {
      // Get recent activity from multiple sources
      const [applications, cases, documents] = await Promise.all([
        supabaseAdmin
          .from('applications')
          .select('id, full_name, email, created_at, status')
          .order('created_at', { ascending: false })
          .limit(limit),
        
        supabaseAdmin
          .from('cases')
          .select(`
            id, title, created_at, status,
            users!inner (first_name, last_name, email)
          `)
          .order('created_at', { ascending: false })
          .limit(limit),
        
        supabaseAdmin
          .from('ai_generations')
          .select(`
            id, type, created_at, status,
            cases!inner (
              title,
              users!inner (first_name, last_name, email)
            )
          `)
          .order('created_at', { ascending: false })
          .limit(limit)
      ]);

      // Combine and sort all activities
      const activities = [
        ...(applications.data || []).map(app => ({
          id: `app-${app.id}`,
          type: 'application',
          title: `New Application: ${app.full_name}`,
          description: `Application submitted by ${app.email}`,
          timestamp: app.created_at,
          status: app.status,
          relatedId: app.id
        })),
        
        ...(cases.data || []).map(case_ => ({
          id: `case-${case_.id}`,
          type: 'case',
          title: `Case Created: ${case_.title}`,
          description: `Case created by ${case_.users.first_name || ''} ${case_.users.last_name || ''}`.trim(),
          timestamp: case_.created_at,
          status: case_.status,
          relatedId: case_.id
        })),
        
        ...(documents.data || []).map(doc => ({
          id: `doc-${doc.id}`,
          type: 'document',
          title: `Document Generated: ${doc.type.replace('_', ' ')}`,
          description: `${doc.type} generated for ${doc.cases?.title || 'case'}`,
          timestamp: doc.created_at,
          status: doc.status,
          relatedId: doc.id
        }))
      ];

      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching user activity:', error);
      return [];
    }
  }

  // Generate admin notifications
  async getAdminNotifications(): Promise<AdminNotification[]> {
    try {
      const notifications: AdminNotification[] = [];
      
      // Check for pending documents that need review
      const { data: pendingDocs } = await supabaseAdmin
        .from('ai_generations')
        .select('id, type, created_at, cases!inner(title)')
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      (pendingDocs || []).forEach(doc => {
        notifications.push({
          id: `doc-review-${doc.id}`,
          type: 'document_review',
          title: 'Document Review Required',
          message: `${doc.type.replace('_', ' ')} for "${doc.cases.title}" needs review`,
          priority: 'high',
          isRead: false,
          createdAt: doc.created_at,
          relatedId: doc.id,
          relatedType: 'document'
        });
      });

      // Check for new applications
      const { data: newApps } = await supabaseAdmin
        .from('applications')
        .select('id, full_name, created_at')
        .eq('status', 'pending')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      (newApps || []).forEach(app => {
        notifications.push({
          id: `app-new-${app.id}`,
          type: 'new_application',
          title: 'New Application Received',
          message: `Application from ${app.full_name} requires attention`,
          priority: 'medium',
          isRead: false,
          createdAt: app.created_at,
          relatedId: app.id,
          relatedType: 'application'
        });
      });

      return notifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error generating admin notifications:', error);
      return [];
    }
  }

  // Mark user as admin
  async promoteUserToAdmin(userId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('users')
        .update({ role: 'admin' })
        .eq('id', userId);

      return !error;
    } catch (error) {
      console.error('Error promoting user to admin:', error);
      return false;
    }
  }

  // Check if user is admin
  async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) return false;
      return data?.role === 'admin';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }
}

export const adminService = new AdminService();