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

      const prompt = `
You are a legal AI assistant specialized in Australian construction law and the Security of Payment Act. 
Analyze the following case and generate a comprehensive "RESOLVE - FOR TRADIES" document.

Case Information:
- Case Title: ${caseData.title}
- Case Number: ${caseData.caseNumber}
- Issue Type: ${caseData.issueType}
- Amount: $${caseData.amount || 'Not specified'}
- Description: ${caseData.description}
- Status: ${caseData.status}
- Priority: ${caseData.priority}

Based on this case information, generate a detailed analysis following the RESOLVE template structure. 
Focus on practical, actionable advice for Australian tradespeople, particularly around the Security of Payment Act.

Return your response as JSON with the following structure:
{
  "clientName": "Client full name",
  "caseTitle": "Descriptive case title",
  "amount": "Formatted amount (e.g., '$10,000')",
  "issueType": "Type of legal issue",
  "description": "Brief case summary",
  "welcomeMessage": "Personalized welcome message acknowledging their situation",
  "legalAnalysis": "Detailed analysis of their legal position and rights",
  "securityOfPaymentAct": {
    "applicable": true/false,
    "reasoning": "Why SOPA does or doesn't apply",
    "steps": [
      {
        "step": 1,
        "title": "Step title",
        "description": "Detailed description of what to do",
        "timeframe": "How long this step takes"
      }
    ]
  },
  "timeline": [
    {
      "day": "Day 0",
      "action": "Action to take",
      "deadline": "Important deadline if any"
    }
  ],
  "costEstimate": {
    "adjudicationFee": "Cost estimate",
    "adjudicatorFee": "Fee range",
    "recoveryLikelihood": "Likelihood assessment",
    "totalEstimatedCost": "Total estimated cost"
  },
  "nextSteps": "Clear next steps and recommendations",
  "attachments": ["List of recommended attachments/documents"]
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
    return {
      clientName: 'Client Name', // Will be populated from application data
      caseTitle: caseData.title,
      amount: caseData.amount ? `$${caseData.amount}` : 'Amount to be determined',
      issueType: caseData.issueType,
      description: caseData.description || 'Case details to be reviewed',
      welcomeMessage: `Thanks for reaching out. I understand you're dealing with ${caseData.issueType.toLowerCase()} issues, and I'm here to help you navigate this situation effectively.`,
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
        const filename = `resolve_${caseData.caseNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
        const filePath = path.join(this.templatesDir, filename);

        const doc = new PDFKit({
          margin: 50,
          size: 'A4'
        });

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Header with RESOLVE branding
        doc.fontSize(32)
           .fillColor('#2563eb')
           .text('RESOLVE', 50, 50, { align: 'center' });

        doc.fontSize(14)
           .fillColor('#666666')
           .text('FOR TRADIES. POWERED BY AI', 50, 90, { align: 'center' });

        doc.moveDown(2);

        // Client information
        doc.fontSize(18)
           .fillColor('#000000')
           .text(`Prepared for ${documentData.clientName}`, 50, 150);

        doc.fontSize(16)
           .text(`${documentData.caseTitle}`, 50, 180);

        doc.fontSize(12)
           .fillColor('#666666')
           .text(`Date: ${new Date().toLocaleDateString()}`, 50, 210);

        // Add separator line
        doc.moveTo(50, 240)
           .lineTo(545, 240)
           .stroke('#cccccc');

        let yPosition = 270;

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
        document_type: 'strategy_pack',
        title: `RESOLVE Strategy Pack - ${documentData.clientName}`,
        ai_content: documentData,
        template_used: 'resolve_tradies_template',
        pdf_file_path: storagePath,
        status: 'pending_review',
        metadata: {
          generated_at: new Date().toISOString(),
          case_amount: documentData.amount,
          issue_type: documentData.issueType
        }
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