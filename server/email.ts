import nodemailer from 'nodemailer';

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

export async function sendWelcomeEmail(email: string, fullName: string): Promise<void> {
  if (!EMAIL_ENABLED) {
    console.log(`Email would be sent to ${email} (${fullName}) - Welcome email`);
    return;
  }
  
  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@projectresolve.ai',
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
            <p style="margin: 0;">© 2024 TradeGuard AI - Legal Support for Australian Tradespeople</p>
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
      from: process.env.FROM_EMAIL || 'noreply@projectresolve.ai',
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
            <p style="margin: 0;">© 2024 TradeGuard AI - Legal Support for Australian Tradespeople</p>
          </div>
        </div>
      `,
    };

    await transporter!.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending approval email:', error);
  }
}

export async function sendStrategyPackEmail(email: string, fullName: string, caseNumber: string): Promise<void> {
  if (!EMAIL_ENABLED) {
    console.log(`Email would be sent to ${email} (${fullName}) - Strategy pack ready for case ${caseNumber}`);
    return;
  }
  
  try {
    const portalLink = `${process.env.BASE_URL || 'http://localhost:5000'}/dashboard`;
    
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@projectresolve.ai',
      to: email,
      subject: `Your Strategy Pack is Ready - Project Resolve AI Case ${caseNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1565C0, #0277BD); color: white; padding: 30px; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
              <div style="background: rgba(255,255,255,0.2); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 24px; font-weight: bold;">+</div>
              <h1 style="margin: 0; font-size: 28px;">Strategy Pack Complete!</h1>
            </div>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Project Resolve AI - Case ${caseNumber}</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #1565C0; margin-top: 0;">Your custom strategy is ready, ${fullName}!</h2>
            
            <p>Our AI has completed the analysis of your case and generated a comprehensive strategy pack tailored to your specific situation.</p>
            
            <div style="background: white; padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0;">
              <h3 style="color: #1565C0; margin-top: 0;">Access Your Strategy Pack</h3>
              <p style="margin-bottom: 20px;">Log in to your personal portal to view your complete strategy pack and start taking action.</p>
              <a href="${portalLink}" style="background: #FF8F00; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access Your Portal</a>
            </div>
            
            <div style="background: #E8F5E8; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2E7D32; margin-top: 0;">Your strategy pack includes:</h3>
              <ul style="color: #37474F; padding-left: 20px; margin-bottom: 0;">
                <li>Executive summary of your case</li>
                <li>Step-by-step action plan with timelines</li>
                <li>Ready-to-send legal documents</li>
                <li>Risk assessment and mitigation strategies</li>
                <li>Expected outcomes and next steps</li>
                <li>Interactive timeline with deadlines</li>
              </ul>
            </div>
            
            <p style="color: #37474F;">Need ongoing support? Consider upgrading to our monthly support plan for continued guidance and additional case assistance.</p>
          </div>
          
          <div style="background: #37474F; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">© 2024 TradeGuard AI - Legal Support for Australian Tradespeople</p>
          </div>
        </div>
      `,
    };

    await transporter!.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending strategy pack email:', error);
  }
}

export async function sendRejectionEmail(email: string, fullName: string, reason: string): Promise<void> {
  if (!EMAIL_ENABLED) {
    console.log(`Email would be sent to ${email} (${fullName}) - Application rejected: ${reason}`);
    return;
  }
  
  try {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@projectresolve.ai',
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
              Thank you for considering TradeGuard AI for your legal support needs.
            </p>
          </div>
          
          <div style="background: #37474F; color: white; padding: 20px; text-align: center; font-size: 14px;">
            <p style="margin: 0;">© 2024 TradeGuard AI - Legal Support for Australian Tradespeople</p>
          </div>
        </div>
      `,
    };

    await transporter!.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending rejection email:', error);
  }
}
