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
  
  // Authenticate admin with hardcoded credentials only
  async authenticateAdmin(email: string, password: string): Promise<string | null> {
    const ADMIN_EMAIL = 'hello@projectresolveai.com';
    const ADMIN_PASSWORD = 'helloprojectresolveai';

    // Check hardcoded credentials
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const sessionId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const adminSession: AdminSession = {
        isAdmin: true,
        email: ADMIN_EMAIL,
        sessionId,
        expiresAt,
        userId: 'admin_user'
      };

      // Store in fallback sessions (memory)
      this.fallbackSessions.set(sessionId, adminSession);

      // Also try to store in database if available
      try {
        await supabaseAdmin
          .from('admin_sessions')
          .insert({
            user_id: 'admin_user',
            session_id: sessionId,
            expires_at: expiresAt.toISOString()
          });
      } catch (sessionError) {
        console.log('Database session creation failed, using memory fallback:', sessionError);
      }

      return sessionId;
    }

    return null;
  }

  // Validate admin session with fallback support
  async validateAdminSession(sessionId: string): Promise<AdminSession | null> {
    try {
      // Check fallback sessions first
      const fallbackSession = this.fallbackSessions.get(sessionId);
      if (fallbackSession) {
        if (fallbackSession.expiresAt > new Date()) {
          return fallbackSession;
        } else {
          this.fallbackSessions.delete(sessionId);
        }
      }

      // Try to get from database
      const { data: sessionData, error } = await supabaseAdmin
        .from('admin_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (!error && sessionData) {
        const session: AdminSession = {
          isAdmin: true,
          email: 'hello@projectresolveai.com',
          sessionId: sessionData.session_id,
          expiresAt: new Date(sessionData.expires_at),
          userId: sessionData.user_id
        };

        if (session.expiresAt > new Date()) {
          return session;
        } else {
          // Session expired, clean it up
          await this.logoutAdmin(sessionId);
        }
      }

      return null;
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

    const sessionId = req.cookies?.admin_session_id;
    if (!sessionId) {
      return res.status(401).json({ message: 'No admin session' });
    }

    const session = await adminAuthService.validateAdminSession(sessionId);
    if (!session) {
      return res.status(401).json({ message: 'Invalid admin session' });
    }

    req.adminSession = session;
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
};