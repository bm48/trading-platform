import { AdminSession } from './admin-auth';

declare global {
  namespace Express {
    interface Request {
      adminSession?: AdminSession;
    }
  }
}

export {};