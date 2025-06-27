import { supabaseAdmin } from './db';
import { supabase } from './supabase-auth';

export interface AdminSession {
  isAdmin: boolean;
  email: string;
  sessionId: string;
  expiresAt: Date;
  userId: string;
}

export class AdminAuthService {
  // Authenticate admin using Supabase Auth
  async authenticateAdmin(email: string, password: string): Promise<string | null> {
    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        console.log('Admin authentication failed:', authError?.message);
        return null;
      }

      // Check if user has admin role
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('role, email, firstName, lastName')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !userProfile) {
        console.log('Failed to fetch user profile:', profileError?.message);
        return null;
      }

      if (userProfile.role !== 'admin') {
        console.log('User does not have admin role:', userProfile.role);
        return null;
      }

      // Return the session token from Supabase
      const sessionToken = authData.session?.access_token;
      if (!sessionToken) {
        console.log('No session token received');
        return null;
      }

      console.log('Admin authenticated successfully:', userProfile.email);
      return sessionToken;

    } catch (error) {
      console.error('Admin authentication error:', error);
      return null;
    }
  }

  // Validate admin session using Supabase Auth
  async validateAdminSession(sessionToken: string): Promise<AdminSession | null> {
    try {
      // Validate the JWT token with Supabase
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(sessionToken);

      if (userError || !userData.user) {
        console.log('Invalid session token:', userError?.message);
        return null;
      }

      // Check if user has admin role
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('role, email, firstName, lastName')
        .eq('id', userData.user.id)
        .single();

      if (profileError || !userProfile) {
        console.log('Failed to fetch user profile for validation:', profileError?.message);
        return null;
      }

      if (userProfile.role !== 'admin') {
        console.log('User does not have admin role:', userProfile.role);
        return null;
      }

      // Return admin session info
      const session: AdminSession = {
        isAdmin: true,
        email: userProfile.email,
        sessionId: sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        userId: userData.user.id
      };

      return session;
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  // Logout admin using Supabase Auth
  async logoutAdmin(sessionToken: string): Promise<boolean> {
    try {
      // Sign out from Supabase Auth
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out admin:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }
}

export const adminAuthService = new AdminAuthService();

// Middleware for admin authentication
export const authenticateAdmin = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No admin session token' });
    }

    const sessionToken = authHeader.split(' ')[1];
    const session = await adminAuthService.validateAdminSession(sessionToken);
    
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