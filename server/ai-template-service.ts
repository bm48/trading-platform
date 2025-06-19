import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { Document, Paragraph, TextRun, Packer, HeadingLevel, AlignmentType } from 'docx';
import PDFDocument from 'pdfkit';
import { supabaseStorage } from './supabase-storage';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

interface IntakeFormData {
  // Client Information
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;
  
  // Case Details
  caseTitle: string;
  issueType: string;
  description: string;
  amount?: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  
  // Timeline
  incidentDate?: string;
  discoveryDate?: string;
  deadlineDate?: string;
  
  // Additional Details
  documentsProvided?: string[];
  previousActions?: string;
  desiredOutcome?: string;
}

interface AIGeneratedContent {
  legalAnalysis: string;
  recommendedActions: Array<{
    step: number;
    action: string;
    description: string;
    timeframe: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  timeline: Array<{
    date: string;
    milestone: string;
    description: string;
    type: 'deadline' | 'action' | 'followup';
  }>;
  documentTemplates: {
    demandLetter?: string;
    noticeToComplete?: string;
    adjudicationApplication?: string;
  };
  riskAssessment: {
    successProbability: number;
    risks: string[];
    mitigationStrategies: string[];
  };
  costEstimate: {
    adjudicationFees: number;
    potentialRecovery: number;
    timeframe: string;
  };
}

export class AITemplateService {
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

  async generateContentFromIntake(intakeData: IntakeFormData): Promise<AIGeneratedContent> {
    const prompt = `
You are an expert Australian construction law specialist. Analyze this case and provide comprehensive legal guidance.

Case Details:
- Client: ${intakeData.clientName}
- Issue Type: ${intakeData.issueType}
- Description: ${intakeData.description}
- Amount: ${intakeData.amount ? `$${intakeData.amount}` : 'Not specified'}
- Urgency: ${intakeData.urgency}
- Incident Date: ${intakeData.incidentDate || 'Not specified'}
- Desired Outcome: ${intakeData.desiredOutcome || 'Not specified'}

Provide a comprehensive analysis in JSON format with:
1. Legal analysis of the situation under Australian construction law
2. Step-by-step recommended actions with timeframes
3. Timeline with key dates and deadlines
4. Risk assessment with success probability
5. Cost estimates for adjudication proceedings

Focus on Security of Payment Act provisions, adjudication processes, and practical recovery strategies.
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert Australian construction lawyer specializing in Security of Payment Act matters. Provide detailed, practical legal guidance in JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const aiContent = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        legalAnalysis: aiContent.legalAnalysis || "Analysis pending",
        recommendedActions: aiContent.recommendedActions || [],
        timeline: aiContent.timeline || [],
        documentTemplates: aiContent.documentTemplates || {},
        riskAssessment: aiContent.riskAssessment || {
          successProbability: 0,
          risks: [],
          mitigationStrategies: []
        },
        costEstimate: aiContent.costEstimate || {
          adjudicationFees: 0,
          potentialRecovery: 0,
          timeframe: "Unknown"
        }
      };
    } catch (error) {
      console.error('Error generating AI content:', error);
      throw new Error('Failed to generate AI content');
    }
  }

  async generateWordDocument(
    intakeData: IntakeFormData, 
    aiContent: AIGeneratedContent,
    templateType: 'strategy' | 'demand_letter' | 'adjudication_application'
  ): Promise<Buffer> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            children: [
              new TextRun({
                text: "RESOLVE+ Legal Services",
                bold: true,
                size: 32,
                color: "#1a365d"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),

          // Case Title
          new Paragraph({
            text: intakeData.caseTitle,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          }),

          // Client Information
          new Paragraph({
            text: "CLIENT INFORMATION",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Name: ", bold: true }),
              new TextRun({ text: intakeData.clientName })
            ],
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Email: ", bold: true }),
              new TextRun({ text: intakeData.clientEmail })
            ],
            spacing: { after: 100 }
          }),

          // Legal Analysis
          new Paragraph({
            text: "LEGAL ANALYSIS",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: aiContent.legalAnalysis,
            spacing: { after: 300 }
          }),

          // Recommended Actions
          new Paragraph({
            text: "RECOMMENDED ACTIONS",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          ...aiContent.recommendedActions.map(action => 
            new Paragraph({
              children: [
                new TextRun({ text: `${action.step}. `, bold: true }),
                new TextRun({ text: `${action.action} - `, bold: true }),
                new TextRun({ text: action.description })
              ],
              spacing: { after: 150 }
            })
          ),

          // Timeline
          new Paragraph({
            text: "PROJECT TIMELINE",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          ...aiContent.timeline.map(item => 
            new Paragraph({
              children: [
                new TextRun({ text: `${item.date}: `, bold: true }),
                new TextRun({ text: `${item.milestone} - ` }),
                new TextRun({ text: item.description })
              ],
              spacing: { after: 150 }
            })
          ),

          // Risk Assessment
          new Paragraph({
            text: "RISK ASSESSMENT",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Success Probability: ", bold: true }),
              new TextRun({ text: `${aiContent.riskAssessment.successProbability}%` })
            ],
            spacing: { after: 150 }
          }),

          // Footer
          new Paragraph({
            children: [
              new TextRun({
                text: "Generated by RESOLVE+ AI Legal Assistant",
                italics: true,
                size: 20,
                color: "#666666"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 }
          })
        ]
      }]
    });

    return await Packer.toBuffer(doc);
  }

  async generateBrandedPDF(
    intakeData: IntakeFormData,
    aiContent: AIGeneratedContent,
    isEditable: boolean = false
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Brand Header
      doc.fontSize(24)
         .fillColor('#1a365d')
         .text('RESOLVE+', 50, 50, { align: 'center' })
         .fontSize(16)
         .text('Legal Strategy Pack', 50, 80, { align: 'center' });

      // Case Information
      doc.fontSize(18)
         .fillColor('#000000')
         .text('Case Overview', 50, 130)
         .fontSize(12)
         .text(`Client: ${intakeData.clientName}`, 50, 160)
         .text(`Case: ${intakeData.caseTitle}`, 50, 180)
         .text(`Amount: ${intakeData.amount ? `$${intakeData.amount.toLocaleString()}` : 'TBD'}`, 50, 200);

      // Legal Analysis Section
      doc.fontSize(16)
         .text('Legal Analysis', 50, 240)
         .fontSize(11)
         .text(aiContent.legalAnalysis, 50, 270, { 
           width: 500, 
           align: 'justify' 
         });

      // Action Plan
      let yPosition = 370;
      doc.fontSize(16)
         .text('Recommended Action Plan', 50, yPosition);
      
      yPosition += 30;
      aiContent.recommendedActions.forEach((action, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.fontSize(12)
           .fillColor('#1a365d')
           .text(`Step ${action.step}: ${action.action}`, 50, yPosition)
           .fontSize(10)
           .fillColor('#000000')
           .text(action.description, 70, yPosition + 15)
           .text(`Timeline: ${action.timeframe}`, 70, yPosition + 35);
        
        yPosition += 60;
      });

      // Timeline Section
      if (yPosition > 600) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(16)
         .fillColor('#1a365d')
         .text('Project Timeline', 50, yPosition);
      
      yPosition += 30;
      aiContent.timeline.forEach(item => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.fontSize(11)
           .fillColor('#000000')
           .text(`${item.date}: ${item.milestone}`, 50, yPosition)
           .fontSize(9)
           .text(item.description, 70, yPosition + 15);
        
        yPosition += 35;
      });

      // Clickable Links Section
      if (yPosition > 650) {
        doc.addPage();
        yPosition = 50;
      }

      doc.fontSize(16)
         .fillColor('#1a365d')
         .text('Document Downloads', 50, yPosition);
      
      yPosition += 30;
      
      // Word Document Download Link
      doc.fontSize(12)
         .fillColor('#0066cc')
         .text('📄 Download Editable Word Document', 50, yPosition, {
           link: `/api/documents/word/${intakeData.clientName.replace(/\s+/g, '_')}_strategy.docx`,
           underline: true
         });
      
      yPosition += 25;
      
      // Key Steps Download
      doc.fillColor('#0066cc')
         .text('📋 Download Action Checklist', 50, yPosition, {
           link: `/api/documents/checklist/${intakeData.clientName.replace(/\s+/g, '_')}_checklist.pdf`,
           underline: true
         });

      // Footer
      doc.fontSize(8)
         .fillColor('#666666')
         .text('Generated by RESOLVE+ AI Legal Assistant', 50, 750, { 
           align: 'center' 
         })
         .text(new Date().toLocaleDateString(), 50, 765, { 
           align: 'center' 
         });

      doc.end();
    });
  }

  async saveGeneratedDocuments(
    caseId: number,
    userId: string,
    intakeData: IntakeFormData,
    aiContent: AIGeneratedContent
  ): Promise<{ wordDocId: number; pdfDocId: number }> {
    try {
      // Generate Word document
      const wordBuffer = await this.generateWordDocument(intakeData, aiContent, 'strategy');
      const wordFilename = `${intakeData.clientName.replace(/\s+/g, '_')}_strategy_${Date.now()}.docx`;
      const wordPath = path.join(this.templatesDir, wordFilename);
      fs.writeFileSync(wordPath, wordBuffer);

      // Generate PDF
      const pdfBuffer = await this.generateBrandedPDF(intakeData, aiContent);
      const pdfFilename = `${intakeData.clientName.replace(/\s+/g, '_')}_strategy_${Date.now()}.pdf`;
      const pdfPath = path.join(this.templatesDir, pdfFilename);
      fs.writeFileSync(pdfPath, pdfBuffer);

      // Save to database
      const wordDoc = await supabaseStorage.createDocument({
        user_id: userId,
        caseid: caseId,
        original_name: wordFilename,
        filename: wordFilename,
        upload_path: wordPath,
        file_type: 'docx',
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_size: wordBuffer.length,
        category: 'ai_generated',
        description: 'AI-generated strategy document (Word format)'
      });

      const pdfDoc = await supabaseStorage.createDocument({
        user_id: userId,
        caseid: caseId,
        original_name: pdfFilename,
        filename: pdfFilename,
        upload_path: pdfPath,
        file_type: 'pdf',
        mime_type: 'application/pdf',
        file_size: pdfBuffer.length,
        category: 'ai_generated',
        description: 'AI-generated strategy document (PDF format)'
      });

      return {
        wordDocId: wordDoc.id,
        pdfDocId: pdfDoc.id
      };
    } catch (error) {
      console.error('Error saving generated documents:', error);
      throw new Error('Failed to save generated documents');
    }
  }
}

export const aiTemplateService = new AITemplateService();