# Project Resolve AI - Replit Configuration

## Overview

Project Resolve AI is a comprehensive legal support platform specifically designed for Australian tradespeople. It provides AI-powered case management, document generation, contract management, and legal consultation services through a modern web application. The platform helps tradespeople navigate legal issues related to payment disputes, contract issues, and regulatory compliance.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **UI Framework**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state, React hooks for local state
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API with Express routes
- **File Processing**: Multer for file uploads with Supabase Storage integration
- **Document Generation**: PDFKit for PDF generation, Docx for Word documents

### Database & Storage
- **Primary Database**: Supabase (PostgreSQL) for user data, cases, contracts, and metadata
- **File Storage**: Supabase Storage for document uploads and generated files
- **Schema Management**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Supabase Auth for user management and session handling

## Key Components

### Authentication & Authorization
- **User Authentication**: Supabase Auth with email/password
- **Admin Authentication**: Custom admin session management with hardcoded credentials
- **Session Management**: JWT tokens with automatic refresh
- **Route Protection**: Protected routes for authenticated users and admin-only sections

### Case Management System
- **Case Creation**: Comprehensive intake forms with validation
- **Case Tracking**: Status updates, timeline tracking, and progress visualization
- **AI Analysis**: OpenAI integration for legal case analysis and recommendations
- **Document Management**: File uploads, previews, and organized storage per case

### Contract Management
- **Contract Creation**: Detailed contract forms with party information and terms
- **Contract Tracking**: Status monitoring and milestone tracking
- **Template System**: Standardized contract templates for different trade types
- **Integration**: Links contracts to related cases and documentation

### Document Generation & Management
- **AI-Powered Generation**: Strategy packs, demand letters, and legal documents
- **Template System**: Customizable document templates with merge fields
- **Multi-Format Output**: PDF and Word document generation
- **Version Control**: Document revisions and approval workflows

### Calendar Integration
- **Google Calendar**: OAuth integration for event synchronization
- **Microsoft Calendar**: MSAL integration for Outlook/Teams calendar sync
- **Event Management**: Create, update, and sync case-related events
- **Automated Scheduling**: Timeline-based event creation for legal deadlines

### Payment & Subscription System
- **Stripe Integration**: Payment processing for strategy packs and subscriptions
- **Subscription Models**: One-time strategy packs and monthly unlimited subscriptions
- **Usage Tracking**: Credit-based system for strategy pack purchases
- **Billing Management**: Subscription status and renewal handling

## Data Flow

1. **User Registration/Login**: Supabase Auth → Profile creation in database
2. **Case Creation**: Form submission → Validation → Database storage → AI analysis
3. **Document Generation**: Case data → AI processing → Template rendering → File storage
4. **File Upload**: Client upload → Supabase Storage → Metadata in database
5. **Calendar Sync**: Event creation → External calendar APIs → Status tracking
6. **Payment Processing**: Stripe checkout → Subscription update → Access control

## External Dependencies

### Required Services
- **Supabase**: Database, authentication, and file storage
- **OpenAI**: AI analysis and document generation (optional for development)
- **Stripe**: Payment processing (optional for development)

### Optional Integrations
- **SendGrid**: Email notifications and communications
- **Google Calendar API**: Calendar synchronization
- **Microsoft Graph API**: Microsoft 365 calendar integration
- **SMTP**: Alternative email service for notifications

### Development Dependencies
- **Node.js 20**: Runtime environment
- **PostgreSQL 16**: Database engine (managed by Supabase)
- **TypeScript**: Type safety and development experience
- **ESBuild**: Production bundling for server code

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js with tsx for TypeScript execution
- **Database**: Supabase hosted PostgreSQL
- **File Storage**: Supabase Storage buckets
- **Hot Reload**: Vite development server with HMR

### Production Deployment
- **Platform**: Replit autoscale deployment
- **Build Process**: Vite build for frontend, ESBuild for backend
- **Environment**: Production Node.js with compiled JavaScript
- **Database**: Same Supabase instance with production credentials

### Configuration Management
- **Environment Variables**: Separate development and production configs
- **Database Migrations**: Drizzle migrations for schema changes
- **Asset Optimization**: Vite build optimization for static assets
- **Error Handling**: Comprehensive error logging and user feedback

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- June 27, 2025: EMAIL CONFIRMATION FLOW - Implemented complete email confirmation workflow: after signup users receive confirmation email, clicking link redirects to login page, then after login redirects to monthly subscription
- June 27, 2025: AUTHENTICATION SYSTEM ENHANCEMENT - Added email/password signup/login functionality to auth page alongside existing Google OAuth
- June 27, 2025: CRITICAL BUG FIXES - Fixed admin dashboard user count (now shows 5 users), application form redirect functionality confirmed working, and Google Calendar integration error handling implemented
- June 27, 2025: MAJOR WORKFLOW UPDATE - Implemented new user flow: Application Form → Signup/Login → Monthly Subscription → Dashboard → Admin Approval for Documents
- June 27, 2025: Created comprehensive Contract Detail page with tabbed interface showing overview, parties, terms, and documents (matching Case detail functionality)
- June 27, 2025: CRITICAL FIX - Fixed admin dashboard redirect bug where authenticated admins were being redirected back to landing page due to inverted logic in useEffect
- June 27, 2025: Fixed admin login redirect loop issue - improved authentication state management to prevent navigation conflicts between login success and route protection
- June 27, 2025: Implemented comprehensive Legal Insights Service with AI-powered analysis and dashboard widget integration

## Changelog

Changelog:
- June 25, 2025. Initial setup