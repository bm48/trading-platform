import { supabaseAdmin } from './db';

export interface DocumentationEmail {
  recipientEmail: string;
  recipientName: string;
  documentTitle: string;
  documentUrl?: string;
  documentContent?: string;
  customMessage?: string;
  caseId?: number;
}

export class EmailDocumentationService {
  
  /**
   * Send document via Supabase Email with professional template
   */
  async sendDocumentationEmail(emailData: DocumentationEmail): Promise<{ success: boolean; message: string }> {
    try {
      const emailTemplate = this.generateEmailTemplate(emailData);
      
      const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(emailData.recipientEmail, {
        data: {
          documentation_email: true,
          recipient_name: emailData.recipientName,
          document_title: emailData.documentTitle,
          document_url: emailData.documentUrl,
          custom_message: emailData.customMessage,
          case_id: emailData.caseId,
          email_template: emailTemplate
        }
      });

      if (error) {
        console.error('Supabase email error:', error);
        return { success: false, message: `Failed to send email: ${error.message}` };
      }

      console.log(`Documentation email sent successfully to ${emailData.recipientEmail}`);
      return { success: true, message: 'Documentation email sent successfully' };
    } catch (error: any) {
      console.error('Email service error:', error);
      return { success: false, message: `Email service error: ${error.message}` };
    }
  }

  /**
   * Send document via Gmail SMTP (alternative method)
   */
  async sendViaGmailSMTP(emailData: DocumentationEmail): Promise<{ success: boolean; message: string }> {
    const nodemailer = require('nodemailer');
    
    try {
      // Gmail SMTP configuration
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER, // your-email@gmail.com
          pass: process.env.GMAIL_APP_PASSWORD // Google App Password
        }
      });

      const htmlTemplate = this.generateEmailTemplate(emailData);

      const mailOptions = {
        from: `"Resolve AI" <${process.env.GMAIL_USER}>`,
        to: emailData.recipientEmail,
        subject: `Your ${emailData.documentTitle} - Resolve AI`,
        html: htmlTemplate,
        attachments: emailData.documentUrl ? [{
          filename: `${emailData.documentTitle}.pdf`,
          path: emailData.documentUrl
        }] : []
      };

      await transporter.sendMail(mailOptions);
      return { success: true, message: 'Email sent via Gmail SMTP' };
    } catch (error: any) {
      console.error('Gmail SMTP error:', error);
      return { success: false, message: `Gmail SMTP error: ${error.message}` };
    }
  }

  /**
   * Send document via SendGrid (premium option)
   */
  async sendViaSendGrid(emailData: DocumentationEmail): Promise<{ success: boolean; message: string }> {
    const sgMail = require('@sendgrid/mail');
    
    try {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to: emailData.recipientEmail,
        from: 'hello@resolveai.com',
        subject: `Your ${emailData.documentTitle} - Resolve AI`,
        html: this.generateEmailTemplate(emailData),
        attachments: emailData.documentUrl ? [{
          content: Buffer.from(emailData.documentContent || '').toString('base64'),
          filename: `${emailData.documentTitle}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }] : []
      };

      await sgMail.send(msg);
      return { success: true, message: 'Email sent via SendGrid' };
    } catch (error: any) {
      console.error('SendGrid error:', error);
      return { success: false, message: `SendGrid error: ${error.message}` };
    }
  }

  /**
   * Generate professional email template
   */
  private generateEmailTemplate(emailData: DocumentationEmail): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Your Documentation - Resolve AI</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e40af; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button { display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Resolve AI</h1>
                <p>Your Legal Documentation Partner</p>
            </div>
            
            <div class="content">
                <h2>Hello ${emailData.recipientName},</h2>
                
                <p>Your requested documentation is ready! We've prepared your <strong>${emailData.documentTitle}</strong> and it's ready for download.</p>
                
                ${emailData.customMessage ? `<p><em>${emailData.customMessage}</em></p>` : ''}
                
                ${emailData.documentUrl ? `
                <p>
                    <a href="${emailData.documentUrl}" class="button">Download Your Document</a>
                </p>
                ` : ''}
                
                <p>This document has been specifically prepared for your case and contains important legal information. Please review it carefully and contact us if you have any questions.</p>
                
                <p><strong>What's Next?</strong></p>
                <ul>
                    <li>Review your documentation thoroughly</li>
                    <li>Follow the recommended timeline</li>
                    <li>Contact us if you need clarification</li>
                    <li>Access your dashboard for updates</li>
                </ul>
                
                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                
                <p>Best regards,<br>
                The Resolve AI Team</p>
            </div>
            
            <div class="footer">
                <p>© 2025 Resolve AI - Legal Support for Australian Tradespeople</p>
                <p>Contact: hello@resolveai.com</p>
                <p>This email was sent regarding ${emailData.caseId ? `Case #${emailData.caseId}` : 'your documentation request'}.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Send bulk documentation to multiple users
   */
  async sendBulkDocumentation(emails: DocumentationEmail[]): Promise<{ sent: number; failed: number; errors: string[] }> {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const emailData of emails) {
      try {
        const result = await this.sendDocumentationEmail(emailData);
        if (result.success) {
          sent++;
        } else {
          failed++;
          errors.push(`${emailData.recipientEmail}: ${result.message}`);
        }
      } catch (error: any) {
        failed++;
        errors.push(`${emailData.recipientEmail}: ${error.message}`);
      }
    }

    return { sent, failed, errors };
  }
}

export const emailDocumentationService = new EmailDocumentationService();