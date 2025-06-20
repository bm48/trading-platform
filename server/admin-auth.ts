import { supabaseAdmin } from './db';

// Admin credentials
const ADMIN_EMAIL = 'hello@projectresolveai.com';
const ADMIN_PASSWORD = 'helloprojectresolveai';

export interface AdminSession {
  isAdmin: boolean;
  email: string;
  sessionId: string;
  expiresAt: Date;
}

// In-memory admin sessions storage
const adminSessions = new Map<string, AdminSession>();

export class AdminAuthService {
  // Authenticate admin with email/password
  async authenticateAdmin(email: string, password: string): Promise<string | null> {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // Generate session ID
      const sessionId = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create admin session (expires in 24 hours)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const session: AdminSession = {
        isAdmin: true,
        email: ADMIN_EMAIL,
        sessionId,
        expiresAt
      };
      
      adminSessions.set(sessionId, session);
      return sessionId;
    }
    return null;
  }

  // Validate admin session
  validateAdminSession(sessionId: string): AdminSession | null {
    const session = adminSessions.get(sessionId);
    if (!session) return null;

    // Check if session expired
    if (new Date() > session.expiresAt) {
      adminSessions.delete(sessionId);
      return null;
    }

    return session;
  }

  // Logout admin
  logoutAdmin(sessionId: string): boolean {
    return adminSessions.delete(sessionId);
  }

  // Clean expired sessions
  cleanExpiredSessions(): void {
    const now = new Date();
    const entries = Array.from(adminSessions.entries());
    for (const [sessionId, session] of entries) {
      if (now > session.expiresAt) {
        adminSessions.delete(sessionId);
      }
    }
  }
}

export const adminAuthService = new AdminAuthService();

// Middleware for admin authentication
export const authenticateAdmin = (req: any, res: any, next: any) => {
  try {
    // Clean expired sessions periodically
    adminAuthService.cleanExpiredSessions();

    const sessionId = req.headers['x-admin-session'] || req.cookies?.adminSession;
    

    
    if (!sessionId) {
      return res.status(401).json({ message: 'Admin authentication required' });
    }

    const session = adminAuthService.validateAdminSession(sessionId);
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