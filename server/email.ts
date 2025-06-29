import nodemailer from 'nodemailer';
import { supabaseAdmin } from './db.js';

// Email configuration - optional for development
const EMAIL_ENABLED = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = EMAIL_ENABLED ? nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null;

// Supabase email service for admin notifications
export async function sendDocumentNotificationEmail(
  userEmail: string,
  firstName: string,
  caseTitle: string,
  documentType: string,
  loginUrl: string = 'https://projectresolveai.com/login'
): Promise<boolean> {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1565C0, #0277BD); color: white; padding: 30px; text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 24px; font-weight: bold;">📄</div>
            <h1 style="margin: 0; font-size: 28px;">Project Resolve AI</h1>
          </div>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your Legal Document is Ready</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #1565C0; margin-top: 0;">Document Ready for Review</h2>
          
          <p>Dear ${firstName},</p>
          
          <p>Great news! Your legal document for case "<strong>${caseTitle}</strong>" has been reviewed and approved by our team.</p>
          
          <div style="background: white; padding: 25px; border-radius: 8px; border-left: 4px solid #4CAF50; margin: 25px 0;">
            <h3 style="color: #1565C0; margin-top: 0;">Document Details</h3>
            <ul style="color: #37474F; padding-left: 20px; margin-bottom: 0;">
              <li><strong>Case:</strong> ${caseTitle}</li>
              <li><strong>Document Type:</strong> ${documentType}</li>
              <li><strong>Status:</strong> Approved and Ready</li>
            </ul>
          </div>
          
          <div style="background: white; padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0;">
            <h3 style="color: #1565C0; margin-top: 0;">Access Your Document</h3>
            <p style="margin-bottom: 20px;">Log in to your dashboard to view and download your personalized legal strategy document.</p>
            <a href="${loginUrl}" style="background: #FF8F00; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Dashboard</a>
          </div>
          
          <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1565C0; margin-top: 0;">What's Next?</h3>
            <ul style="color: #37474F; padding-left: 20px; margin-bottom: 0;">
              <li>Review your personalized legal strategy document</li>
              <li>Follow the step-by-step action plan provided</li>
              <li>Use the timeline to track important deadlines</li>
              <li>Contact us if you have any questions</li>
            </ul>
          </div>
          
          <p style="color: #37474F;">If you have any questions about your document or need assistance, please don't hesitate to contact our support team.</p>
        </div>
        
        <!-- Footer -->
        <div style="background: #37474F; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p style="margin: 0;">© 2025 Project Resolve AI - Legal Support for Australian Tradespeople</p>
          <p style="margin: 5px 0 0 0; opacity: 0.8;">This email was sent because a document was approved for your account.</p>
        </div>
      </div>
    `;

    // For development, use nodemailer if available, otherwise log
    if (EMAIL_ENABLED && transporter) {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'hello@projectresolveai.com',
        to: userEmail,
        subject: `Your Legal Document is Ready - ${caseTitle}`,
        html: htmlContent,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Document notification email sent to: ${userEmail}`);
      return true;
    } else {
      // Log the email content for development
      console.log('=== EMAIL NOTIFICATION (Development Mode) ===');
      console.log(`To: ${userEmail}`);
      console.log(`Subject: Your Legal Document is Ready - ${caseTitle}`);
      console.log('Content: Document notification with login link');
      console.log('=== END EMAIL ===');
      return true;
    }
  } catch (error) {
    console.error('Failed to send document notification email:', error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, fullName: string): Promise<void> {
  if (!EMAIL_ENABLED) {
    console.log(`Email would be sent to ${email} (${fullName}) - Welcome email`);
    return;
  }
  
  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'hello@projectresolveai.com',
      to: email,
      subject: 'Application Received - Project Resolve AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1565C0, #0277BD); color: white; padding: 30px; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
              <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 24px; font-weight: bold;">+</div>
              <h1 style="margin: 0; font-size: 28px;">Project Resolve AI</h1>
            </div>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Legal Support for Australian Tradespeople</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #1565C0; margin-top: 0;">Application Received Successfully</h2>
            
            <p>Hi ${fullName},</p>
            
            <p>Thank you for submitting your application to Project Resolve AI. We've received your case details and our team is reviewing your situation.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #FF8F00; margin: 20px 0;">
              <h3 style="color: #1565C0; margin-top: 0;">What happens next?</h3>
              <ul style="color: #37474F; padding-left: 20px;">
                <li>Case review and approval within 2 hours</li>
                <li>Email with link to complete detailed application</li>
                <li>Payment processing ($299 one-time fee)</li>
                <li>AI analysis and strategy pack generation</li>
                <li>Delivery of your custom strategy pack within 24-48 hours</li>
              </ul>
            </div>
            
            <p style="color: #37474F;">We'll notify you as soon as your case has been approved and you can proceed to the next step.</p>
            
            <p style="color: #78909C; font-size: 14px; margin-top: 30px;">
              If you have any questions, please don't hesitate to contact our support team.
            </p>
          </div>
          
          <div style="background: #37474F; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">© 2024 Project Resolve AI - Legal Support for Australian Tradespeople</p>
            <p style="margin: 5px 0 0 0; color: #B0BEC5;">This platform provides information services, not legal advice.</p>
          </div>
        </div>
      `,
    };

    await transporter!.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
}

export async function sendApprovalEmail(email: string, fullName: string, applicationId: number): Promise<void> {
  if (!EMAIL_ENABLED) {
    console.log(`Email would be sent to ${email} (${fullName}) - Approval email for application ${applicationId}`);
    return;
  }
  
  try {
    const approvalLink = `${process.env.BASE_URL || 'http://localhost:5000'}/application/${applicationId}/complete`;
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'hello@projectresolveai.com',
      to: email,
      subject: 'Case Approved - Project Resolve AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #2E7D32, #4CAF50); color: white; padding: 30px; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
              <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 24px; font-weight: bold;">+</div>
              <h1 style="margin: 0; font-size: 28px;">Case Approved!</h1>
            </div>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Project Resolve AI - Your application has been accepted</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #2E7D32; margin-top: 0;">Great news, ${fullName}!</h2>
            
            <p>Your case has been reviewed and approved by our team. We believe we can help you resolve your situation effectively.</p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0;">
              <h3 style="color: #1565C0; margin-top: 0;">Ready to proceed?</h3>
              <p style="margin-bottom: 20px;">Complete your detailed application and make payment to get your custom strategy pack.</p>
              <a href="${approvalLink}" style="background: #FF8F00; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Complete Application - $299</a>
            </div>
            
            <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1565C0; margin-top: 0;">What's included in your $299 Strategy Pack:</h3>
              <ul style="color: #37474F; padding-left: 20px; margin-bottom: 0;">
                <li>AI-powered legal analysis of your case</li>
                <li>Custom strategy plan with step-by-step actions</li>
                <li>All required legal documents and letters</li>
                <li>Timeline with deadlines and next steps</li>
                <li>Access to your personal case portal</li>
                <li>Document storage and management tools</li>
              </ul>
            </div>
            
            <p style="color: #37474F;">This link will expire in 7 days, so please complete your application soon to secure your strategy pack.</p>
          </div>
          
          <div style="background: #37474F; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">© 2024 Project Resolve AI - Legal Support for Australian Tradespeople</p>
          </div>
        </div>
      `,
    };

    await transporter!.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending approval email:', error);
  }
}



export async function sendRejectionEmail(email: string, fullName: string, reason: string): Promise<void> {
  if (!EMAIL_ENABLED) {
    console.log(`Email would be sent to ${email} (${fullName}) - Application rejected: ${reason}`);
    return;
  }
  
  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'hello@projectresolveai.com',
      to: email,
      subject: 'Application Update - Project Resolve AI',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #D32F2F, #F44336); color: white; padding: 30px; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
              <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 24px; font-weight: bold;">+</div>
              <h1 style="margin: 0; font-size: 28px;">Application Update</h1>
            </div>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Project Resolve AI</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #D32F2F; margin-top: 0;">Thank you for your application, ${fullName}</h2>
            
            <p>We appreciate your interest in Project Resolve AI. After careful review of your case details, we regret to inform you that we cannot proceed with your application at this time.</p>
            
            <div style="background: #FFEBEE; padding: 20px; border-radius: 8px; border-left: 4px solid #F44336; margin: 20px 0;">
              <h3 style="color: #D32F2F; margin-top: 0;">Reason:</h3>
              <p style="color: #37474F; margin-bottom: 0;">${reason}</p>
            </div>
            
            <p style="color: #37474F;">This decision doesn't reflect on the validity of your situation. We recommend consulting with a qualified legal professional who can provide personalized advice for your specific circumstances.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1565C0; margin-top: 0;">Alternative Resources:</h3>
              <ul style="color: #37474F; padding-left: 20px;">
                <li>Legal Aid Australia - Free legal advice</li>
                <li>Local Bar Association referral services</li>
                <li>Community legal centers in your area</li>
                <li>Industry-specific dispute resolution services</li>
              </ul>
            </div>
            
            <p style="color: #78909C; font-size: 14px; margin-top: 30px;">
              Thank you for considering Project Resolve AI for your legal support needs.
            </p>
          </div>
          
          <div style="background: #37474F; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">© 2024 Project Resolve AI - Legal Support for Australian Tradespeople</p>
          </div>
        </div>
      `,
    };

    await transporter!.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending rejection email:', error);
  }
}

export async function sendStrategyPackEmail(
  email: string, 
  subject: string, 
  body: string, 
  attachmentIds?: number[]
): Promise<boolean> {
  if (!EMAIL_ENABLED) {
    console.log(`Email would be sent to ${email} - Strategy pack: ${subject}`);
    return true;
  }

  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a365d; margin: 0;">RESOLVE+</h1>
          <p style="color: #666; margin: 5px 0;">AI-Powered Legal Services</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          ${body.split('\n').map(line => `<p style="margin: 10px 0;">${line}</p>`).join('')}
        </div>
        
        <div style="border-top: 1px solid #e9ecef; padding-top: 20px; text-align: center;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            This email was sent by RESOLVE+ Legal Services<br>
            For support, please contact us at support@resolveplus.com.au
          </p>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'hello@projectresolveai.com',
      to: email,
      subject: subject,
      html: html,
    };

    await transporter!.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending strategy pack email:', error);
    return false;
  }
}

export async function sendApplicationConfirmationEmail(
  email: string,
  fullName: string,
  applicationId: number
): Promise<void> {
  if (!EMAIL_ENABLED) {
    console.log(`Application confirmation email would be sent to ${email} (${fullName}) for application #${applicationId}`);
    return;
  }

  try {
    const mailOptions = {
      from: `"Project Resolve AI" <${SMTP_FROM}>`,
      to: email,
      subject: 'Application Received - Project Resolve AI',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; background: #F8F9FA;">
          <div style="background: linear-gradient(135deg, #1565C0 0%, #0D47A1 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Project Resolve AI</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Legal Support for Australian Tradespeople</p>
          </div>
          
          <div style="padding: 40px 30px; background: white; margin: 0;">
            <h2 style="color: #1565C0; margin-top: 0;">Application Received Successfully!</h2>
            
            <p>Hi ${fullName},</p>
            
            <p>Thank you for submitting your application to Project Resolve AI. We've received your case details and our AI is now reviewing your situation.</p>
            
            <div style="background: #E3F2FD; padding: 20px; border-radius: 8px; border-left: 4px solid #1565C0; margin: 20px 0;">
              <h3 style="color: #1565C0; margin-top: 0;">Application #${applicationId}</h3>
              <p style="margin: 10px 0 0 0; color: #37474F;">Your application has been assigned ID #${applicationId} for tracking.</p>
            </div>
            
            <div style="background: #FFF3E0; padding: 20px; border-radius: 8px; border-left: 4px solid #FF8F00; margin: 20px 0;">
              <h3 style="color: #F57C00; margin-top: 0;">What happens next?</h3>
              <ol style="color: #37474F; padding-left: 20px; margin: 10px 0;">
                <li><strong>AI Review (Within 24 hours)</strong> - Our AI analyzes your case</li>
                <li><strong>Approval & Payment Link</strong> - If approved, you'll receive a payment link for $299</li>
                <li><strong>Detailed Intake Form</strong> - Complete our comprehensive questionnaire</li>
                <li><strong>Strategy Pack Creation</strong> - Custom AI-generated legal strategy and documents</li>
                <li><strong>Dashboard Access</strong> - Full access to case management tools</li>
              </ol>
            </div>
            
            <p style="color: #37474F;">We'll notify you as soon as your application has been reviewed. Check your email regularly for updates.</p>
            
            <p style="color: #78909C; font-size: 14px; margin-top: 30px;">
              If you have any questions, please contact our support team. We're here to help you resolve your legal issues.
            </p>
          </div>
          
          <div style="background: #37474F; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">© 2024 Project Resolve AI - Legal Support for Australian Tradespeople</p>
            <p style="margin: 5px 0 0 0; color: #B0BEC5;">This platform provides information services, not legal advice.</p>
          </div>
        </div>
      `,
    };

    await transporter!.sendMail(mailOptions);
    console.log(`Application confirmation email sent successfully to ${email}`);
  } catch (error) {
    console.error('Error sending application confirmation email:', error);
    throw error;
  }
}
