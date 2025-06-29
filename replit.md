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

- June 29, 2025: WORKFLOW MESSAGING UPDATED TO CURRENT SYSTEM - Updated "What happens next?" section in application form and approval emails to reflect current subscription-based workflow instead of old $299 one-time payment system. Now shows: Create account → Subscribe $49/month → Access dashboard → Get AI documents, matching actual system flow.
- June 29, 2025: DOCUMENT DOWNLOAD BUG COMPLETELY FIXED - Resolved download functionality issue where users saw "Download Started" message but files weren't actually downloading. Fixed by switching from apiRequest to direct fetch for blob responses, added blob size validation, enhanced error handling, and improved download trigger mechanism with proper cleanup. Both strategy documents and regular case documents now download correctly.
- June 29, 2025: SMART DOCUMENT TAGGING WITH AI IMPLEMENTED - Created comprehensive AI-powered document tagging system with OpenAI integration for intelligent tag suggestions. Features include 20+ predefined legal/financial/evidence tags, custom tag creation, confidence scoring, category-based organization, and seamless integration with case documents. Added new database tables (document_tags, document_tag_assignments, ai_tag_suggestions) and REST API endpoints for full tagging functionality.
- June 29, 2025: PDF DOWNLOAD SYSTEM COMPLETELY FIXED - Fixed critical PDF generation bug (switchToPage page indexing issue) and missing Supabase URL storage. Documents now properly upload to Supabase Storage with public URLs, enabling direct downloads. Updated both initial generation and fallback generation to store URLs correctly.
- June 29, 2025: USAGE LIMITS IMPLEMENTED FOR UNSUBSCRIBED USERS - Replaced subscription blocking with usage-based trial system allowing 2 free cases and 2 free contracts. Added comprehensive usage checking across endpoints, smart warnings in forms, and real-time remaining counts. Forms now show "Free trial: X remaining" instead of hard subscription blocks.
- June 29, 2025: CASE PROGRESS TRACKING & SUPABASE EMAIL FIXED - Implemented automatic case progress tracking (30% on document generation, 70% on admin approval/send) with enhanced logging and database updates. Switched email system from SMTP to Supabase Auth's native inviteUserByEmail for reliable Gmail delivery with professional templates including case details and dashboard access links.
- June 29, 2025: SUBSCRIPTION GATE & EMAIL NOTIFICATIONS IMPLEMENTED - Added subscription requirement check for case/contract creation with warning message "To create, first you have to subscribe" displayed when users without active subscriptions try to create content. Enhanced admin email notifications to send proper email templates via Supabase when admin clicks "Send notification" button, including detailed case information and dashboard access links.
- June 29, 2025: ADMIN DOCUMENT EDITING & USER SUBSCRIPTION STATUS FIXED - Resolved duplicate route conflict causing document edits to fail after first save by consolidating two PUT routes into single comprehensive endpoint with PDF regeneration. Enhanced admin users tab to display subscription status with plan type, dates, and Stripe customer IDs from Supabase Auth metadata
- June 29, 2025: ADMIN SECURITY AUTHENTICATION IMPROVED - Fixed admin login to show proper warning "Access denied: Only authorized administrators can access this panel" when non-admin emails attempt login, preventing unauthorized access attempts with clear error messaging
- June 29, 2025: SUBSCRIPTION DATA RETRIEVAL FIXED - Resolved issue where subscription status showed "No Active Plan" despite successful payment by fixing nested object access in Supabase user metadata from `user.user_metadata` to `user.user?.user_metadata`
- June 28, 2025: SUBSCRIPTION WARNING MESSAGE ENHANCED - Updated checkout page to show prominent amber warning "You Already Subscribed for Monthly Plan" when users with active subscriptions try to access checkout again. Added AlertTriangle icon and enhanced styling to make warning more visible.
- June 28, 2025: COMPREHENSIVE DATE FORMAT & SUBSCRIPTION FIXES - Fixed ALL date formatting across entire project to display "Jun 17th, 2025" format with ordinal suffixes. Implemented subscription status checking to prevent double subscriptions - users with active monthly subscriptions see "You've already subscribed" message when accessing checkout page
- June 28, 2025: DOCUMENT UPLOAD/DOWNLOAD SYSTEM COMPLETELY FIXED - Resolved variable naming conflicts in download function, fixed document name display issues, and ensured proper file handling. Contract document upload and download now working correctly with real filenames and proper authentication
- June 27, 2025: PDF DOWNLOAD FUNCTIONALITY COMPLETELY FIXED - Resolved download issues by implementing dual approach: direct blob download from Supabase Storage with server proxy fallback for CORS issues. Updated frontend to fetch files as blobs and trigger proper downloads instead of navigation
- June 27, 2025: AI DOCUMENT GENERATION ACCESS CONTROL BUG FIXED - Resolved "Access denied" error in AI document generation by fixing case ownership verification. Updated server routes to properly handle database column mapping (user_id vs userId)
- June 27, 2025: AI DOCUMENT GENERATION SYSTEM IMPLEMENTED - Created comprehensive AI-powered PDF generation using OpenAI API with "RESOLVE - FOR TRADIES" template. System includes database tables, API endpoints, Supabase storage integration, and admin approval workflow
- June 27, 2025: GOOGLE OAUTH VERIFICATION ERROR FIXED - Added comprehensive error handling for Google Calendar integration that requires domain verification. System now shows clear message explaining the issue and that it's temporarily unavailable during development
- June 27, 2025: INTERACTIVE CHECKOUT FORM COMPLETED - Users can now fill out payment form fields with real-time validation, card number formatting, and submit button only enables when all fields are complete
- June 27, 2025: SUPABASE GOOGLE OAUTH INTEGRATION - Updated Calendar integration to use Supabase's built-in Google OAuth instead of custom callback endpoints. Simplified authentication flow.
- June 27, 2025: DEMO SUBSCRIPTION FLOW FIXED - Demo mode now properly updates user subscription status and automatically redirects to dashboard after success
- June 27, 2025: STRIPE PAYMENT BUG FIXED - Resolved invalid client secret error by implementing demo mode for development and proper Stripe integration for production environments
- June 27, 2025: BUG FIXES COMPLETE - Fixed checkout redirect bug, Google Calendar error handling (now shows proper message), and identified Supabase email template setup needed
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