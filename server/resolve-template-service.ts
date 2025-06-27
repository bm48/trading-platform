import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
import { supabaseAdmin } from './db';

interface CaseData {
  id: number;
  client_name: string;
  case_title: string;
  issue_type: string;
  description: string;
  amount?: number;
  incident_date?: string;
  deadline_date?: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  user_id: string;
}

interface ResolveTemplateData {
  clientName: string;
  caseTitle: string;
  amount: string;
  issueType: string;
  description: string;
  welcomeMessage: string;
  legalAnalysis: string;
  sopaCoverage: string;
  actionSteps: Array<{
    step: number;
    action: string;
    description: string;
  }>;
  timeline: Array<{
    day: string;
    action: string;
  }>;
  nextSteps: string;
  adjudicationInfo: string;
  enforcementInfo: string;
  costEstimate: {
    applicationFee: string;
    adjudicatorFee: string;
    recoveryLikelihood: string;
  };
}

export class ResolveTemplateService {
  private templatesDir: string;

  constructor() {
    this.templatesDir = path.join(process.cwd(), 'templates');
    this.ensureTemplatesDirectory();
  }

  private ensureTemplatesDirectory(): void {
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }

  async generateResolveContent(caseData: CaseData): Promise<ResolveTemplateData> {
    const prompt = `
    You are an AI legal expert specializing in Australian construction law and Security of Payment Act (SOPA) claims.
    
    Generate content for a "RESOLVE FOR TRADIES" document based on this case information:
    
    Client: ${caseData.client_name}
    Case: ${caseData.case_title}
    Issue Type: ${caseData.issue_type}
    Description: ${caseData.description}
    Amount: ${caseData.amount ? `$${caseData.amount.toLocaleString()}` : 'Not specified'}
    Urgency: ${caseData.urgency}
    
    Provide a comprehensive response with the following sections:
    
    1. WELCOME_MESSAGE: A personalized welcome acknowledging their specific situation
    2. LEGAL_ANALYSIS: Clear explanation of their legal position under SOPA
    3. SOPA_COVERAGE: Explain how Security of Payment Act applies to their case
    4. ACTION_STEPS: 4-5 specific actionable steps they should take (format as numbered list)
    5. TIMELINE: Day-by-day timeline for SOPA process (Day 0, Day 10, Day 11-15, Week 4-6, Week 6+)
    6. NEXT_STEPS: Immediate actions they can take today
    7. ADJUDICATION_INFO: Explanation of the adjudication process and costs
    8. ENFORCEMENT_INFO: What happens if builder still doesn't pay after adjudication
    9. COST_ESTIMATE: Realistic cost breakdown for the process

    Make it specific to Victorian Security of Payment Act 2002. Use professional but accessible language suitable for tradespeople.
    Format your response as JSON with these exact keys: welcomeMessage, legalAnalysis, sopaCoverage, actionSteps, timeline, nextSteps, adjudicationInfo, enforcementInfo, costEstimate.
    `;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 3000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated from OpenAI');
      }

      const aiData = JSON.parse(content);

      return {
        clientName: caseData.client_name,
        caseTitle: caseData.case_title,
        amount: caseData.amount ? `$${caseData.amount.toLocaleString()}` : 'Not specified',
        issueType: caseData.issue_type,
        description: caseData.description,
        welcomeMessage: aiData.welcomeMessage,
        legalAnalysis: aiData.legalAnalysis,
        sopaCoverage: aiData.sopaCoverage,
        actionSteps: aiData.actionSteps,
        timeline: aiData.timeline,
        nextSteps: aiData.nextSteps,
        adjudicationInfo: aiData.adjudicationInfo,
        enforcementInfo: aiData.enforcementInfo,
        costEstimate: aiData.costEstimate,
      };
    } catch (error) {
      console.error('Error generating AI content:', error);
      // Fallback content if AI fails
      return this.getFallbackContent(caseData);
    }
  }

  private getFallbackContent(caseData: CaseData): ResolveTemplateData {
    return {
      clientName: caseData.client_name,
      caseTitle: caseData.case_title,
      amount: caseData.amount ? `$${caseData.amount.toLocaleString()}` : 'Not specified',
      issueType: caseData.issue_type,
      description: caseData.description,
      welcomeMessage: `Thanks for reaching out. I'm sorry you're being mucked around — you've done the work, kept your side of the deal, and now you're owed ${caseData.amount ? `$${caseData.amount.toLocaleString()}` : 'payment'} with no payment in sight. The good news is this: you're legally protected, even without a formal written contract.`,
      legalAnalysis: 'You can take action under the Security of Payment Act 2002 (VIC) — a law designed specifically for trades and subcontractors like you to get paid quickly without going to court or hiring a lawyer.',
      sopaCoverage: 'Even if there was no formal contract, the Act still applies if: You did construction work or supplied related goods/services, and You issued a valid invoice (payment claim), and You haven\'t been paid within the allowed timeframe.',
      actionSteps: [
        { step: 1, action: 'Send Payment Claim', description: 'Issue a new invoice marked as a Payment Claim under the Security of Payment Act 2002 (Vic)' },
        { step: 2, action: 'Wait for Response', description: 'Builder has only 10 business days to respond with a Payment Schedule' },
        { step: 3, action: 'Apply for Adjudication', description: 'If no response, apply for adjudication (fast-track judgment)' },
        { step: 4, action: 'Enforce Decision', description: 'If still unpaid after adjudication, enforce as court debt' }
      ],
      timeline: [
        { day: 'Day 0', action: 'Send Payment Claim including new invoice under SOPA' },
        { day: 'Day 10', action: 'Deadline for builder to issue a Payment Schedule' },
        { day: 'Day 11-15', action: 'If no schedule received, apply for adjudication' },
        { day: 'Week 4-6', action: 'Adjudicator decides in your favour (if paperwork is correct)' },
        { day: 'Week 6+', action: 'Enforce as a court debt if still unpaid' }
      ],
      nextSteps: 'If the builder doesn\'t respond within 10 business days of receiving your Payment Claim, you can proceed to adjudication — a fast, legally binding process under the Security of Payment Act.',
      adjudicationInfo: 'Adjudication is a quick, formal dispute resolution process that doesn\'t require a lawyer or going to court. It\'s run by an independent Adjudicator who reviews your original invoice, the work completed, and supporting evidence.',
      enforcementInfo: 'If the Adjudicator rules in your favour and the builder still doesn\'t pay, you can enforce the decision as a court debt using an Adjudication Certificate.',
      costEstimate: {
        applicationFee: 'Free through some ANAs (e.g. Adjudicate Today)',
        adjudicatorFee: 'Usually $500–$1,500 depending on complexity',
        recoveryLikelihood: 'High - you may recover fees if the builder loses'
      }
    };
  }

  async generateResolvePDF(caseData: CaseData): Promise<string> {
    const templateData = await this.generateResolveContent(caseData);
    const filename = `resolve-${caseData.id}-${Date.now()}.pdf`;
    const filePath = path.join(this.templatesDir, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header with RESOLVE branding
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#2563eb');
      doc.text('RESOLVE', 50, 50);
      doc.fontSize(12).font('Helvetica').fillColor('#000000');
      doc.text('FOR TRADIES. POWERED BY AI', 50, 80);

      doc.moveDown(1);
      doc.text(`Prepared for ${templateData.clientName}`, 50, doc.y);
      doc.moveDown(0.5);
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text(templateData.caseTitle, 50, doc.y);
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica');
      doc.text(new Date().toLocaleDateString(), 50, doc.y);

      // Add page break
      doc.addPage();

      // Section 1: Purpose
      this.addSection(doc, '01', 'Purpose of this document', 
        'This document has been created to give you a clear understanding of your situation, outline the recommended steps to move forward, and show you exactly how I can support you — without the need for a lawyer.');

      // Section 2: Welcome
      this.addSection(doc, '02', 'Welcome to Resolve', templateData.welcomeMessage);

      // Section 3: Case Analysis
      this.addSection(doc, '03', 'Your case and what you can do now', templateData.legalAnalysis);
      doc.text(templateData.sopaCoverage, 50, doc.y, { width: 500 });

      // Section 4: How it works
      this.addSection(doc, '04', 'How it works', '');
      templateData.actionSteps.forEach((step, index) => {
        doc.font('Helvetica-Bold');
        doc.text(`Step ${step.step}: ${step.action}`, 50, doc.y);
        doc.font('Helvetica');
        doc.text(step.description, 50, doc.y, { width: 500 });
        doc.moveDown(0.5);
      });

      // Section 5: Timeline
      this.addSection(doc, '05', 'Timeline', '');
      templateData.timeline.forEach(item => {
        doc.font('Helvetica-Bold').text(item.day, 50, doc.y, { width: 100, continued: true });
        doc.font('Helvetica').text(item.action, 150, doc.y, { width: 400 });
        doc.moveDown(0.5);
      });

      // Section 6: Coverage
      this.addSection(doc, '06', 'You\'re covered', templateData.sopaCoverage);

      // Section 7: Next Steps
      this.addSection(doc, '07', 'Next Steps', templateData.nextSteps);
      doc.text('What is adjudication', 50, doc.y, { underline: true });
      doc.moveDown(0.3);
      doc.text(templateData.adjudicationInfo, 50, doc.y, { width: 500 });

      // Cost information
      doc.moveDown(1);
      doc.font('Helvetica-Bold').text('How much does Adjudication Cost?', 50, doc.y);
      doc.font('Helvetica').moveDown(0.5);
      doc.text(`Application Fee: ${templateData.costEstimate.applicationFee}`, 50, doc.y);
      doc.text(`Adjudicator's Fee: ${templateData.costEstimate.adjudicatorFee}`, 50, doc.y);
      doc.text(`Cost Recovery: ${templateData.costEstimate.recoveryLikelihood}`, 50, doc.y);

      // Enforcement section
      doc.moveDown(1);
      doc.font('Helvetica-Bold').text('What If the Builder Still Doesn\'t Pay?', 50, doc.y);
      doc.font('Helvetica').moveDown(0.5);
      doc.text(templateData.enforcementInfo, 50, doc.y, { width: 500 });

      // Footer
      doc.fontSize(10).fillColor('#666666');
      doc.text('Resolve for tradies — Empowering you to resolve legal issues without the legal fees.', 50, 750);

      doc.end();

      stream.on('finish', () => {
        resolve(filename);
      });

      stream.on('error', reject);
    });
  }

  private addSection(doc: PDFKit.PDFDocument, number: string, title: string, content: string) {
    // Add some space before new section
    doc.moveDown(1);

    // Section number
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#2563eb');
    doc.text(number, 50, doc.y, { width: 50, continued: true });

    // Section title
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000');
    doc.text(title, 80, doc.y);

    // Section content
    if (content) {
      doc.fontSize(12).font('Helvetica').moveDown(0.5);
      doc.text(content, 50, doc.y, { width: 500 });
    }

    doc.moveDown(0.5);
  }

  async saveToSupabase(filename: string, caseId: number, userId: string, templateData: ResolveTemplateData): Promise<number> {
    try {
      const filePath = path.join(this.templatesDir, filename);
      const fileBuffer = fs.readFileSync(filePath);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('documents')
        .upload(`resolve-pdfs/${filename}`, fileBuffer, {
          contentType: 'application/pdf',
          metadata: {
            caseId: caseId.toString(),
            userId: userId,
            type: 'resolve_template'
          }
        });

      if (uploadError) {
        console.error('Error uploading PDF to storage:', uploadError);
        throw uploadError;
      }

      // Save metadata to database
      const { data: documentData, error: dbError } = await supabaseAdmin
        .from('generated_documents')
        .insert({
          case_id: caseId,
          user_id: userId,
          document_type: 'resolve_template',
          filename: filename,
          file_path: uploadData.path,
          ai_content: templateData,
          status: 'completed',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) {
        console.error('Error saving document metadata:', dbError);
        throw dbError;
      }

      // Clean up local file
      fs.unlinkSync(filePath);

      return documentData.id;
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      throw error;
    }
  }
}

export const resolveTemplateService = new ResolveTemplateService();