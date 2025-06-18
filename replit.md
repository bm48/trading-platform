# replit.md

## Overview

This repository contains a full-stack web application called "Project Resolve AI" - an AI-powered legal support platform specifically designed for Australian tradespeople. The application helps users manage legal cases, contracts, and provides AI-powered legal guidance for payment disputes and other trade-related legal issues.

## System Architecture

The application follows a modern full-stack architecture:

- **Frontend**: React 18 with TypeScript, using Vite as the build tool
- **Backend**: Express.js server with TypeScript
- **Database**: Supabase PostgreSQL with direct Supabase client
- **Authentication**: Supabase Auth with JWT middleware
- **Styling**: Tailwind CSS with shadcn/ui components
- **File Storage**: Local file system with multer for uploads
- **External Services**: Optional integrations for OpenAI, Stripe, and email services

## Key Components

### Frontend Architecture
- **React Router**: Using wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Forms**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom design system

### Backend Architecture
- **API Server**: Express.js with TypeScript
- **Database Layer**: Drizzle ORM with PostgreSQL
- **Authentication**: Supabase Auth with JWT tokens
- **File Handling**: Multer for file uploads and storage
- **Email Service**: Nodemailer (optional, configurable)
- **AI Integration**: OpenAI API (optional, gracefully degrades)

### Database Schema
- **Users**: Extended user profiles with subscription and role management
- **Applications**: Initial form submissions from potential clients
- **Cases**: Legal case management with timeline tracking
- **Contracts**: Contract creation and management
- **Documents**: File attachment system for cases and contracts
- **Timeline Events**: Activity tracking for cases and contracts

## Data Flow

1. **User Registration/Login**: Handled by Supabase Auth
2. **Application Submission**: Anonymous users can submit initial applications
3. **Case Creation**: Authenticated users can create detailed legal cases
4. **Contract Management**: Users can create and manage contracts
5. **Document Upload**: Files can be attached to cases and contracts
6. **AI Analysis**: Optional OpenAI integration for case analysis and strategy generation
7. **Payment Processing**: Optional Stripe integration for subscription management

## External Dependencies

### Required Services
- **PostgreSQL Database**: For data persistence
- **Supabase**: For authentication and user management

### Optional Services (Graceful Degradation)
- **OpenAI API**: For AI-powered legal analysis and strategy generation
- **Stripe**: For payment processing and subscription management
- **SMTP Server**: For email notifications (Nodemailer)
- **SendGrid**: Alternative email service

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `OPENAI_API_KEY`: OpenAI API key (optional)
- `STRIPE_SECRET_KEY`: Stripe secret key (optional)
- `VITE_STRIPE_PUBLIC_KEY`: Stripe publishable key (optional)
- `SESSION_SECRET`: Express session secret
- Email configuration (optional): `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, etc.

## Deployment Strategy

### Development
- Uses Vite dev server for frontend
- Express server with hot reload via tsx
- PostgreSQL database (can be local or remote)

### Production Build
- Frontend: Vite builds static assets to `dist/public`
- Backend: esbuild bundles server code to `dist/index.js`
- Static files served by Express in production

### Replit Configuration
- Configured for autoscale deployment
- Uses Node.js 20 with PostgreSQL 16
- Port 5000 for development, external port 80 for production
- Workflow automation for easy deployment

### Key Features
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Progressive Enhancement**: Core functionality works without optional services
- **File Upload System**: Supports documents, images, and PDFs
- **Role-Based Access**: User, moderator, and admin roles
- **Subscription Management**: Strategy packs and monthly subscriptions
- **AI-Powered Analysis**: Optional legal case analysis and strategy generation

## Changelog

Changelog:
- June 15, 2025. Initial setup
- June 15, 2025. Completed Supabase migration and fixed 403 authentication errors in case/contract creation
- June 17, 2025. Completely resolved 403 authentication errors by implementing direct database storage layer, fixing timestamp handling in Drizzle ORM, and updating validation schemas. System now successfully creates cases and contracts with proper user authentication.
- June 17, 2025. Completed full Supabase migration - converted entire database architecture from hybrid PostgreSQL/Drizzle to pure Supabase client implementation. All database operations now use Supabase directly with proper field name mapping between frontend camelCase and database snake_case. Authentication and database operations are now unified under Supabase.
- June 17, 2025. Fixed document upload workflow - created comprehensive SQL setup for missing tables (timeline_events, documents, applications), implemented complete file upload endpoints with proper user authentication and field mapping, added multer configuration for secure file handling. Created supabase_timeline_events_table.sql for database table creation.
- June 18, 2025. Major architectural cleanup - consolidated entire project to use Supabase exclusively for authentication, authorization, and database operations. Removed redundant authentication systems (replitAuth.ts, auth-middleware.ts, direct-storage.ts, storage.ts) and route files (clean-routes.ts, case-routes.ts, contract-routes.ts, file-upload-routes.ts, routes.ts). Unified all API endpoints under supabase-routes.ts with consistent JWT token authentication. Fixed file upload authentication by ensuring proper Authorization header transmission from frontend to backend. System now uses single, clean Supabase-based architecture throughout.
- June 18, 2025. Implemented comprehensive micro-interaction animation system throughout the application to enhance user engagement. Added custom CSS animations (fadeIn, slideIn, pulse, bounce, shake, glow) with utility classes for buttons, cards, and interactive elements. Enhanced dashboard with staggered animations, hover effects, and smooth transitions. Applied animations to file upload components, navigation elements, stats cards, timeline events, and all interactive buttons. System includes card hover effects, button lift animations, icon bounce effects, and loading state animations for improved user experience.
- June 18, 2025. Implemented Supabase Edge Functions architecture to resolve schema mismatch and authentication issues. Created dedicated Edge Functions for case and contract creation (supabase/functions/create-case and supabase/functions/create-contract) with proper field mapping from frontend camelCase to database snake_case. Updated frontend components to directly call Edge Functions using Supabase auth tokens, bypassing Express API layer for critical operations. Fixed missing next_action_due column error in case creation. Edge Functions provide better security, scalability, and direct database access with built-in authentication.

## User Preferences

Preferred communication style: Simple, everyday language.