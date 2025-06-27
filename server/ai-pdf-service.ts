import OpenAI from 'openai';
import PDFKit from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { supabaseStorage } from './supabase-storage';
import { cases, type Case } from '../shared/schema';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ResolveDocumentData {
  clientName: string;
  caseTitle: string;
  amount: string;
  issueType: string;
  description: string;
  welcomeMessage: string;
  legalAnalysis: string;
  securityOfPaymentAct: {
    applicable: boolean;
    reasoning: string;
    steps: Array<{
      step: number;
      title: string;
      description: string;
      timeframe: string;
    }>;
  };
  timeline: Array<{
    day: string;
    action: string;
    deadline?: string;
  }>;
  costEstimate: {
    adjudicationFee: string;
    adjudicatorFee: string;
    recoveryLikelihood: string;
    totalEstimatedCost: string;
  };
  nextSteps: string;
  attachments: string[];
}

export class AIPDFService {
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

  async generateResolveDocument(caseData: Case): Promise<ResolveDocumentData> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OpenAI API key not found, using fallback content');
        return this.getFallbackContent(caseData);
      }

      // Extract client name from case data or use a generic name
      const clientName = caseData.title.split(' ')[0] || 'Valued Client';
      
      const prompt = `
You are a specialized legal AI assistant for Australian construction law and the Security of Payment Act. 
Create a personalized "RESOLVE - FOR TRADIES" document using the uploaded template structure and the following real case information:

Case Details:
- Client: ${clientName}
- Case Title: ${caseData.title}
- Issue Type: ${caseData.issueType}
- Amount Owed: $${caseData.amount || 'Amount to be determined'}
- Case Description: ${caseData.description}
- Case Number: ${(caseData as any).case_number || caseData.caseNumber || 'N/A'}
- Current Status: ${caseData.status || 'Active'}
- Priority Level: ${caseData.priority || 'Medium'}

Instructions:
1. Follow the exact template structure from the RESOLVE document (sections 01-07)
2. Personalize all content based on the specific case details provided
3. Provide practical, actionable legal guidance for Australian construction disputes
4. Focus on Security of Payment Act 2002 applications where relevant to this case
5. Include specific timelines and cost estimates relevant to this situation
6. Use professional but accessible language suitable for tradespeople

Return your response as JSON with this exact structure based on the RESOLVE template:
{
  "clientName": "${clientName}",
  "caseTitle": "${caseData.title || 'Untitled Case'}",
  "amount": "$${caseData.amount || 'TBD'}",
  "issueType": "${caseData.issueType || 'general_dispute'}",
  "description": "Personalized analysis of this case based on the provided details",
  "welcomeMessage": "Thanks for reaching out. I'm sorry you're being mucked around — you've done the work, kept your side of the deal, and now you're owed [amount] with no payment in sight. The good news is this: you're legally protected, even without a formal written contract.",
  "legalAnalysis": "You can take action under the Security of Payment Act 2002 (VIC) — a law designed specifically for trades and subcontractors like you to get paid quickly without going to court or hiring a lawyer. [Include specific analysis for this case]",
  "securityOfPaymentAct": {
    "applicable": true,
    "reasoning": "The Act applies because: You did construction work or supplied related goods/services, You issued a valid invoice (payment claim), and You haven't been paid within the allowed timeframe.",
    "steps": [
      {
        "step": 1,
        "title": "Send Payment Claim under SOPA",
        "description": "You send a new invoice marked as a Payment Claim under the Security of Payment Act 2002 (Vic). This gives the builder only 10 business days to respond.",
        "timeframe": "10 business days for response"
      },
      {
        "step": 2,
        "title": "Monitor for Response",
        "description": "If he doesn't respond, you win by default — and can apply for adjudication and recover the amount via court enforcement.",
        "timeframe": "Automatic win if no response"
      },
      {
        "step": 3,
        "title": "Apply for Adjudication",
        "description": "If he disputes it, it goes to adjudication — a fast, binding decision (usually within 2–4 weeks).",
        "timeframe": "2-4 weeks for decision"
      }
    ]
  },
  "timeline": [
    {
      "day": "Day 0",
      "action": "Send Payment Claim including new invoice under SOPA (draft letter attached)",
      "deadline": "Start 10-day response period"
    },
    {
      "day": "Day 10",
      "action": "Deadline for builder to issue a Payment Schedule",
      "deadline": "Builder must respond by this date"
    },
    {
      "day": "Day 11-15",
      "action": "If no schedule received, apply for adjudication",
      "deadline": "Application window"
    },
    {
      "day": "Week 4-6",
      "action": "Adjudicator decides in your favour (if paperwork is correct)",
      "deadline": "Binding legal decision"
    },
    {
      "day": "Week 6+",
      "action": "Enforce as a court debt if still unpaid",
      "deadline": "Final enforcement"
    }
  ],
  "costEstimate": {
    "adjudicationFee": "Application Fee (to Adjudicator) - Free through some ANAs (e.g. Adjudicate Today)",
    "adjudicatorFee": "Adjudicator's Fee - Usually $500–$1,500 depending on complexity and time involved",
    "recoveryLikelihood": "High - You may recover this fee if the builder loses the case",
    "totalEstimatedCost": "$500–$1,500 (potentially recoverable if you win)"
  },
  "nextSteps": "If the builder doesn't respond within 10 business days of receiving your Payment Claim, you can proceed to adjudication — a fast, legally binding process under the Security of Payment Act.",
  "attachments": ["Payment Claim Letter - Word Document"]
}
`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a legal AI assistant specialized in Australian construction law and dispute resolution. Provide practical, actionable legal guidance for tradespeople."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const parsedContent = JSON.parse(content) as ResolveDocumentData;
      return parsedContent;

    } catch (error) {
      console.error('Error generating AI content:', error);
      return this.getFallbackContent(caseData);
    }
  }

  private getFallbackContent(caseData: Case): ResolveDocumentData {
    const issueType = caseData.issueType || 'general_dispute';
    return {
      clientName: 'Client Name', // Will be populated from application data
      caseTitle: caseData.title || 'Untitled Case',
      amount: caseData.amount ? `$${caseData.amount}` : 'Amount to be determined',
      issueType: issueType,
      description: caseData.description || 'Case details to be reviewed',
      welcomeMessage: `Thanks for reaching out. I understand you're dealing with ${issueType.toLowerCase()} issues, and I'm here to help you navigate this situation effectively.`,
      legalAnalysis: `Based on your ${caseData.issueType.toLowerCase()} matter, you have legal protections under Australian construction law. Even without a formal written contract, you may have rights to payment for work completed and can take action to recover what you're owed.`,
      securityOfPaymentAct: {
        applicable: true,
        reasoning: "The Security of Payment Act typically applies to construction work and related services, providing fast-track dispute resolution for payment issues.",
        steps: [
          {
            step: 1,
            title: "Issue Payment Claim",
            description: "Send a formal payment claim under the Security of Payment Act, clearly stating the amount owed and work completed.",
            timeframe: "Immediate action required"
          },
          {
            step: 2,
            title: "Await Payment Schedule",
            description: "The other party has 10 business days to respond with a payment schedule or reasons for non-payment.",
            timeframe: "10 business days"
          },
          {
            step: 3,
            title: "Consider Adjudication",
            description: "If no response or dispute, you can apply for adjudication for a binding decision.",
            timeframe: "Available after 10 business days"
          }
        ]
      },
      timeline: [
        {
          day: "Day 0",
          action: "Send Payment Claim under Security of Payment Act",
          deadline: "Today"
        },
        {
          day: "Day 10",
          action: "Deadline for other party to respond",
          deadline: "Critical deadline"
        },
        {
          day: "Day 11-15",
          action: "Apply for adjudication if no response received",
          deadline: "Action window"
        }
      ],
      costEstimate: {
        adjudicationFee: "Often free through some providers",
        adjudicatorFee: "$500 - $1,500 depending on complexity",
        recoveryLikelihood: "High if paperwork is correct and claim is valid",
        totalEstimatedCost: "$500 - $1,500 (may be recoverable if successful)"
      },
      nextSteps: "Review the attached payment claim template, customize it with your specific details, and send it to the other party. Keep detailed records of all communications and deadlines.",
      attachments: ["Payment Claim Letter Template", "Supporting Documentation Checklist", "Timeline Tracker"]
    };
  }

  async generateResolvePDF(caseData: Case, documentData: ResolveDocumentData): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const caseNumber = (caseData as any).case_number || caseData.caseNumber || 'UNKNOWN';
        const filename = `resolve_${caseNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
        const filePath = path.join(this.templatesDir, filename);

        const doc = new PDFKit({
          margin: 50,
          size: 'A4'
        });

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Page 1: Cover Page - Match exact template layout
        // Large RESOLVE header
        doc.fontSize(48)
           .fillColor('#000000')
           .text('RESOLVE', 50, 100, { align: 'center' });

        doc.moveDown(3);

        // FOR TRADIES subtitle
        doc.fontSize(18)
           .fillColor('#000000')
           .text('FOR TRADIES. POWERED BY AI', 50, 200, { align: 'center' });

        doc.moveDown(3);

        // Prepared for section
        doc.fontSize(14)
           .fillColor('#000000')
           .text(`Prepared for ${documentData.clientName}`, 50, 280);

        doc.moveDown(2);

        // Case title
        doc.fontSize(16)
           .fillColor('#000000')
           .font('Helvetica-Bold')
           .text(`${documentData.caseTitle}`, 50, 320);

        doc.moveDown(1);

        // Date
        doc.fontSize(12)
           .fillColor('#000000')
           .font('Helvetica')
           .text(`${new Date().toLocaleDateString()}`, 50, 360);

        // Footer tagline at bottom
        doc.fontSize(12)
           .fillColor('#666666')
           .text('Resolve — Empowering you to resolve legal issues without the legal fees.', 50, 750, { align: 'center' });

        // Start content on new page
        doc.addPage();
        let yPosition = 50;

        // Purpose section
        this.addSection(doc, '01', 'Purpose of this document', 
          'This document has been created to give you a clear understanding of your situation, outline the recommended steps to move forward, and show you exactly how I can support you — without the need for a lawyer.', 
          yPosition);
        yPosition += 120;

        // Welcome section
        this.addSection(doc, '02', 'Welcome to Resolve', documentData.welcomeMessage, yPosition);
        yPosition += 100;

        // Case Analysis
        this.addSection(doc, '03', 'Your case and what you can do now', documentData.legalAnalysis, yPosition);
        yPosition += 120;

        // Security of Payment Act section
        if (documentData.securityOfPaymentAct.applicable) {
          this.addSection(doc, '04', 'How it works', 
            documentData.securityOfPaymentAct.reasoning, yPosition);
          yPosition += 80;

          documentData.securityOfPaymentAct.steps.forEach((step, index) => {
            if (yPosition > 700) {
              doc.addPage();
              yPosition = 50;
            }
            doc.fontSize(12)
               .fillColor('#000000')
               .text(`Step ${step.step}: ${step.title}`, 70, yPosition, { width: 450 });
            doc.fontSize(10)
               .fillColor('#666666')
               .text(step.description, 70, yPosition + 20, { width: 450 });
            doc.text(`Timeframe: ${step.timeframe}`, 70, yPosition + 40, { width: 450 });
            yPosition += 70;
          });
        }

        // Timeline section
        doc.addPage();
        yPosition = 50;
        this.addSection(doc, '05', 'Timeline', '', yPosition);
        yPosition += 60;

        documentData.timeline.forEach((item) => {
          doc.fontSize(11)
             .fillColor('#000000')
             .text(item.day, 70, yPosition, { width: 100 });
          doc.text(item.action, 180, yPosition, { width: 350 });
          if (item.deadline) {
            doc.fontSize(9)
               .fillColor('#dc2626')
               .text(item.deadline, 180, yPosition + 15, { width: 350 });
          }
          yPosition += 40;
        });

        // Cost estimate section
        yPosition += 30;
        this.addSection(doc, '06', 'Cost Estimate', '', yPosition);
        yPosition += 60;

        doc.fontSize(10)
           .fillColor('#000000')
           .text(`Adjudication Fee: ${documentData.costEstimate.adjudicationFee}`, 70, yPosition);
        yPosition += 20;
        doc.text(`Adjudicator Fee: ${documentData.costEstimate.adjudicatorFee}`, 70, yPosition);
        yPosition += 20;
        doc.text(`Recovery Likelihood: ${documentData.costEstimate.recoveryLikelihood}`, 70, yPosition);
        yPosition += 20;
        doc.text(`Total Estimated Cost: ${documentData.costEstimate.totalEstimatedCost}`, 70, yPosition);

        // Next Steps
        yPosition += 50;
        this.addSection(doc, '07', 'Next Steps', documentData.nextSteps, yPosition);

        // Footer
        doc.fontSize(8)
           .fillColor('#999999')
           .text('Resolve for tradies — Empowering you to resolve legal issues without the legal fees.', 50, 750, { align: 'center' });

        doc.end();

        writeStream.on('finish', () => {
          resolve(filename);
        });

        writeStream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private addSection(doc: PDFKit.PDFDocument, number: string, title: string, content: string, yPosition: number) {
    // Section number (in blue circle)
    doc.circle(60, yPosition + 10, 12)
       .fillColor('#2563eb')
       .fill();
    
    doc.fontSize(10)
       .fillColor('#ffffff')
       .text(number, 54, yPosition + 6);

    // Section title
    doc.fontSize(14)
       .fillColor('#000000')
       .text(title, 80, yPosition, { width: 450 });

    // Section content
    if (content) {
      doc.fontSize(10)
         .fillColor('#333333')
         .text(content, 80, yPosition + 25, { width: 450, lineGap: 2 });
    }
  }

  async saveToSupabase(
    filename: string, 
    caseId: number, 
    userId: string, 
    documentData: ResolveDocumentData
  ): Promise<number> {
    try {
      const filePath = path.join(this.templatesDir, filename);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Generated PDF file not found: ${filename}`);
      }

      // Upload to Supabase Storage
      const fileBuffer = fs.readFileSync(filePath);
      const storagePath = `ai-documents/${userId}/${filename}`;
      
      const { data: uploadData, error: uploadError } = await supabaseStorage.supabase
        .storage
        .from('documents')
        .upload(storagePath, fileBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload PDF to storage: ${uploadError.message}`);
      }

      // Create record in ai_generated_documents table
      const aiDocument = await supabaseStorage.createAiDocument({
        case_id: caseId,
        user_id: userId,
        type: 'strategy_pack', // Database column is 'type', not 'document_type'
        ai_content: documentData,
        pdf_file_path: storagePath,
        status: 'pending_review'
      });

      // Clean up local file
      fs.unlinkSync(filePath);

      return aiDocument.id;

    } catch (error) {
      console.error('Error saving to Supabase:', error);
      throw error;
    }
  }

  async generateAndSaveResolveDocument(caseData: Case): Promise<number> {
    try {
      // Generate AI content using OpenAI
      const documentData = await this.generateResolveDocument(caseData);
      
      // Generate PDF with the AI content
      const filename = await this.generateResolvePDF(caseData, documentData);
      
      // Save to Supabase and create database record
      const documentId = await this.saveToSupabase(filename, caseData.id, caseData.userId, documentData);

      console.log(`Generated AI document ${documentId} for case ${caseData.id}`);
      return documentId;

    } catch (error) {
      console.error('Error in generateAndSaveResolveDocument:', error);
      throw error;
    }
  }
}

export const aiPDFService = new AIPDFService();