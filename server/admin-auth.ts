import { supabaseAdmin } from './db';

export interface AdminSession {
  isAdmin: boolean;
  email: string;
  sessionId: string;
  expiresAt: Date;
  userId: string;
}

export class AdminAuthService {
  private fallbackSessions = new Map<string, AdminSession>();
  // Authenticate admin with email/password - fallback system
  async authenticateAdmin(email: string, password: string): Promise<string | null> {
    const ADMIN_EMAIL = 'hello@projectresolveai.com';
    const ADMIN_PASSWORD = 'helloprojectresolveai';

    try {
      // Try Supabase Auth first
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      });

      if (!authError && authData.user) {
        // Check if user has admin role
        const userRole = authData.user.user_metadata?.role || authData.user.app_metadata?.role;
        const isAdmin = userRole === 'admin' || authData.user.user_metadata?.is_admin === true;

        if (isAdmin) {
          const sessionId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);

          // Try to create session in database
          try {
            await supabaseAdmin
              .from('admin_sessions')
              .insert({
                user_id: authData.user.id,
                session_id: sessionId,
                expires_at: expiresAt.toISOString()
              });
          } catch (sessionError) {
            console.error('Database session creation failed, using fallback:', sessionError);
          }

          return sessionId;
        }
      }

      // Fallback to hardcoded credentials if Supabase fails
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const sessionId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Store in memory as fallback
        this.fallbackSessions.set(sessionId, {
          isAdmin: true,
          email: ADMIN_EMAIL,
          sessionId,
          expiresAt,
          userId: 'fallback-admin-user'
        });

        return sessionId;
      }

      return null;
    } catch (error) {
      console.error('Admin authentication error:', error);
      
      // Final fallback to hardcoded credentials
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const sessionId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        this.fallbackSessions.set(sessionId, {
          isAdmin: true,
          email: ADMIN_EMAIL,
          sessionId,
          expiresAt,
          userId: 'fallback-admin-user'
        });

        return sessionId;
      }

      return null;
    }
  }

  // Validate admin session with fallback support
  async validateAdminSession(sessionId: string): Promise<AdminSession | null> {
    try {
      // Check fallback sessions first
      const fallbackSession = this.fallbackSessions.get(sessionId);
      if (fallbackSession) {
        // Check if session expired
        if (new Date() > fallbackSession.expiresAt) {
          this.fallbackSessions.delete(sessionId);
          return null;
        }
        return fallbackSession;
      }

      // Check session in database
      const { data: sessionData, error } = await supabaseAdmin
        .from('admin_sessions')
        .select('*, auth_users:user_id(email)')
        .eq('session_id', sessionId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !sessionData) {
        console.error('Session validation error:', error);
        return null;
      }

      return {
        isAdmin: true,
        email: sessionData.auth_users?.email || '',
        sessionId: sessionData.session_id,
        expiresAt: new Date(sessionData.expires_at),
        userId: sessionData.user_id
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  // Logout admin with fallback support
  async logoutAdmin(sessionId: string): Promise<boolean> {
    try {
      // Remove from fallback sessions
      this.fallbackSessions.delete(sessionId);

      // Try to remove from database
      const { error } = await supabaseAdmin
        .from('admin_sessions')
        .delete()
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error deleting admin session from database:', error);
        // Still return true since we removed from fallback
      }
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }

  // Clean expired sessions
  async cleanExpiredSessions(): Promise<void> {
    try {
      await supabaseAdmin
        .from('admin_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());
    } catch (error) {
      console.error('Error cleaning expired sessions:', error);
    }
  }
}

export const adminAuthService = new AdminAuthService();

// Middleware for admin authentication
export const authenticateAdmin = async (req: any, res: any, next: any) => {
  try {
    // Clean expired sessions periodically
    await adminAuthService.cleanExpiredSessions();

    const sessionId = req.headers['x-admin-session'] || req.cookies?.adminSession;
    
    if (!sessionId) {
      return res.status(401).json({ message: 'Admin authentication required' });
    }

    const session = await adminAuthService.validateAdminSession(sessionId);
    if (!session) {
      return res.status(401).json({ message: 'Invalid or expired admin session' });
    }

    req.adminSession = session;
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};