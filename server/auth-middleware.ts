import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "./supabase";

// Define user interface for authentication
interface AuthUser {
  id: string;
  email?: string;
  role?: string;
}

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Middleware to verify Supabase JWT token
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: "Access token required" });
    }

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Get user profile for role information
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || 'user'
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: "Authentication failed" });
  }
};

// Middleware to check if user has required role
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role || 'user')) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
};

// Middleware for admin-only routes
export const requireAdmin = requireRole(['admin']);

// Middleware for admin or moderator routes
export const requireModerator = requireRole(['admin', 'moderator']);

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (!error && user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        req.user = {
          id: user.id,
          email: user.email,
          role: profile?.role || 'user'
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if optional
    next();
  }
};