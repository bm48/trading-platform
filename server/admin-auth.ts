import { supabaseAdmin } from './db';

export interface AdminSession {
  isAdmin: boolean;
  email: string;
  sessionId: string;
  expiresAt: Date;
  userId: string;
}

export class AdminAuthService {
  // Authenticate admin with email/password using Supabase Auth
  async authenticateAdmin(email: string, password: string): Promise<string | null> {
    try {
      // Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password
      });

      if (authError || !authData.user) {
        console.error('Supabase auth error:', authError);
        return null;
      }

      // Check if user has admin role
      const userRole = authData.user.user_metadata?.role || authData.user.app_metadata?.role;
      const isAdmin = userRole === 'admin' || authData.user.user_metadata?.is_admin === true;

      if (!isAdmin) {
        console.error('User is not an admin:', email);
        return null;
      }

      // Create admin session in database
      const sessionId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error: sessionError } = await supabaseAdmin
        .from('admin_sessions')
        .insert({
          user_id: authData.user.id,
          session_id: sessionId,
          expires_at: expiresAt.toISOString()
        });

      if (sessionError) {
        console.error('Error creating admin session:', sessionError);
        // Fall back to in-memory session if table doesn't exist
      }

      return sessionId;
    } catch (error) {
      console.error('Admin authentication error:', error);
      return null;
    }
  }

  // Validate admin session using Supabase
  async validateAdminSession(sessionId: string): Promise<AdminSession | null> {
    try {
      // Check session in database first
      const { data: sessionData, error } = await supabaseAdmin
        .from('admin_sessions')
        .select('*, users:user_id(email)')
        .eq('session_id', sessionId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !sessionData) {
        console.error('Session validation error:', error);
        return null;
      }

      return {
        isAdmin: true,
        email: sessionData.users?.email || '',
        sessionId: sessionData.session_id,
        expiresAt: new Date(sessionData.expires_at),
        userId: sessionData.user_id
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  // Logout admin
  async logoutAdmin(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin
        .from('admin_sessions')
        .delete()
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error deleting admin session:', error);
        return false;
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