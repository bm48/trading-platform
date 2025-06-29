import PDFKit from 'pdfkit';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { type Case } from '../shared/schema';

interface ComprehensiveDocumentData {
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
  riskAssessment: string;
  enforcementInfo: string;
  nextSteps: string;
  attachments: string[];
}

export class ComprehensivePDFGenerator {
  private templatesDir: string;
  private openai: OpenAI;

  constructor() {
    this.templatesDir = path.join(process.cwd(), 'templates');
    this.ensureTemplatesDirectory();
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  private ensureTemplatesDirectory(): void {
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }

  async generateComprehensiveDocument(caseData: Case): Promise<ComprehensiveDocumentData> {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OpenAI API key not found, using fallback content');
        return this.getFallbackContent(caseData);
      }

      const prompt = `You are a specialized legal expert in Australian construction law and the Security of Payment Act (SOPA). Generate a comprehensive, professional "RESOLVE - FOR TRADIES" strategy document that matches the exact structure and quality of the template provided.

Case Details:
- Client: ${(caseData as any).clientName || 'Client'}
- Case Title: ${caseData.title}
- Issue Type: ${caseData.issueType || 'Payment dispute'}
- Amount Owed: $${caseData.amount || 'TBD'}
- Case Description: ${caseData.description}
- Location: Australia

Create a detailed, professional legal strategy document with:

1. WELCOME MESSAGE: Professional acknowledgment (like the template: "Thanks for reaching out. I'm sorry you're being mucked around — you've done the work, kept your side of the deal, and now you're owed $X with no payment in sight. The good news is this: you're legally protected, even without a formal written contract.")

2. LEGAL ANALYSIS: Detailed analysis referencing specific Australian construction law and SOPA provisions

3. SECURITY OF PAYMENT ACT: Comprehensive explanation with specific steps and timeframes

4. TIMELINE: Detailed day-by-day action plan with deadlines

5. COST ESTIMATES: Realistic Australian legal costs and recovery likelihood

6. RISK ASSESSMENT: Honest evaluation of case strength and success probability

7. ENFORCEMENT INFORMATION: What happens if they still don't pay after adjudication

8. NEXT STEPS: Specific actionable steps they can take immediately

Use professional legal language but keep it accessible for tradespeople. Include specific references to Australian law where relevant.

Return as JSON with this exact structure:
{
  "clientName": "string",
  "caseTitle": "string", 
  "amount": "string",
  "issueType": "string",
  "description": "string",
  "welcomeMessage": "string (3-4 paragraphs matching template tone)",
  "legalAnalysis": "string (detailed legal position with SOPA references)",
  "securityOfPaymentAct": {
    "applicable": boolean,
    "reasoning": "string",
    "steps": [
      {
        "step": number,
        "title": "string",
        "description": "string",
        "timeframe": "string"
      }
    ]
  },
  "timeline": [
    {
      "day": "string",
      "action": "string",
      "deadline": "string (optional)"
    }
  ],
  "costEstimate": {
    "adjudicationFee": "string",
    "adjudicatorFee": "string", 
    "recoveryLikelihood": "string",
    "totalEstimatedCost": "string"
  },
  "riskAssessment": "string (honest evaluation)",
  "enforcementInfo": "string (what happens if they still don't pay)",
  "nextSteps": "string (immediate actionable steps)",
  "attachments": ["string (list of templates)"]
}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 4000
      });

      const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        clientName: aiResponse.clientName || (caseData as any).clientName || 'Valued Client',
        caseTitle: aiResponse.caseTitle || caseData.title,
        amount: aiResponse.amount || caseData.amount || 'Amount TBD',
        issueType: aiResponse.issueType || caseData.issueType || 'Payment dispute',
        description: aiResponse.description || caseData.description || '',
        welcomeMessage: aiResponse.welcomeMessage || 'Thanks for reaching out. I understand your frustration with this payment dispute.',
        legalAnalysis: aiResponse.legalAnalysis || 'You have strong legal protections under Australian construction law.',
        securityOfPaymentAct: aiResponse.securityOfPaymentAct || {
          applicable: true,
          reasoning: 'SOPA applies to your construction work and provides fast-track payment recovery.',
          steps: [
            { step: 1, title: 'Send Payment Claim', description: 'Issue formal payment claim under SOPA', timeframe: '10 business days' },
            { step: 2, title: 'Monitor Response', description: 'Principal must respond within timeframe', timeframe: '10 business days' },
            { step: 3, title: 'Apply for Adjudication', description: 'Lodge application if no response', timeframe: '20 business days' }
          ]
        },
        timeline: aiResponse.timeline || [
          { day: 'Day 0', action: 'Send Payment Claim', deadline: 'Today' },
          { day: 'Day 10', action: 'Payment Schedule deadline', deadline: '10 business days' },
          { day: 'Day 11-20', action: 'Apply for adjudication', deadline: '20 business days' }
        ],
        costEstimate: aiResponse.costEstimate || {
          adjudicationFee: 'Free - $550',
          adjudicatorFee: '$800 - $2,000',
          recoveryLikelihood: '75-85%',
          totalEstimatedCost: '$800 - $2,550'
        },
        riskAssessment: aiResponse.riskAssessment || 'Strong case with good recovery prospects.',
        enforcementInfo: aiResponse.enforcementInfo || 'If adjudication succeeds but payment is still withheld, you can enforce the decision as a court debt through Magistrates Court.',
        nextSteps: aiResponse.nextSteps || 'Prepare and send Payment Claim immediately, then monitor compliance deadlines.',
        attachments: aiResponse.attachments || ['Payment Claim Letter Template', 'SOPA Process Guide']
      };

    } catch (error) {
      console.error('Error generating AI document:', error);
      return this.getFallbackContent(caseData);
    }
  }

  private getFallbackContent(caseData: Case): ComprehensiveDocumentData {
    return {
      clientName: (caseData as any).clientName || 'Valued Client',
      caseTitle: caseData.title,
      amount: caseData.amount || 'Amount TBD',
      issueType: caseData.issueType || 'Payment dispute',
      description: caseData.description || '',
      welcomeMessage: 'Thanks for reaching out. I understand you\'re dealing with a challenging payment situation.',
      legalAnalysis: 'You have legal protections under Australian construction law and the Security of Payment Act.',
      securityOfPaymentAct: {
        applicable: true,
        reasoning: 'SOPA provides fast-track dispute resolution for construction payment issues.',
        steps: [
          { step: 1, title: 'Send Payment Claim', description: 'Issue formal payment claim', timeframe: '10 business days' },
          { step: 2, title: 'Await Response', description: 'Principal must respond', timeframe: '10 business days' },
          { step: 3, title: 'Consider Adjudication', description: 'Apply if no response', timeframe: '20 business days' }
        ]
      },
      timeline: [
        { day: 'Day 0', action: 'Send Payment Claim', deadline: 'Today' },
        { day: 'Day 10', action: 'Payment Schedule deadline' },
        { day: 'Day 11-20', action: 'Apply for adjudication if needed' }
      ],
      costEstimate: {
        adjudicationFee: 'Free - $550',
        adjudicatorFee: '$800 - $2,000',
        recoveryLikelihood: '75-85%',
        totalEstimatedCost: '$800 - $2,550'
      },
      riskAssessment: 'Good prospects for recovery through SOPA process.',
      enforcementInfo: 'Adjudication decisions can be enforced as court debts if payment is still withheld.',
      nextSteps: 'Prepare Payment Claim and send immediately to start the SOPA process.',
      attachments: ['Payment Claim Letter Template']
    };
  }

  async generateProfessionalPDF(caseData: Case, documentData: ComprehensiveDocumentData): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const filename = `resolve_comprehensive_${caseData.id}_${Date.now()}.pdf`;
        const filePath = path.join(this.templatesDir, filename);

        const doc = new PDFKit({
          margin: 50,
          size: 'A4',
          info: {
            Title: `RESOLVE Strategy Pack - ${documentData.caseTitle}`,
            Author: 'RESOLVE AI',
            Subject: 'Legal Strategy Document',
            Keywords: 'construction law, payment dispute, SOPA, strategy'
          }
        });

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Cover Page
        doc.fontSize(48).fillColor('#000000').text('RESOLVE', 50, 100, { align: 'center' });
        doc.fontSize(18).text('FOR TRADIES. POWERED BY AI', 50, 180, { align: 'center' });
        doc.fontSize(14).text(`Prepared for ${documentData.clientName}`, 50, 260, { align: 'center' });
        doc.fontSize(16).font('Helvetica-Bold').text(documentData.caseTitle, 50, 320, { align: 'center' });
        doc.fontSize(12).font('Helvetica').text(`Date: ${new Date().toLocaleDateString('en-AU')}`, 50, 360, { align: 'center' });
        doc.fontSize(10).fillColor('#666666').text('Resolve — Empowering you to resolve legal issues without the legal fees.', 50, 750, { align: 'center' });

        // Page 2 - Purpose
        doc.addPage();
        this.addSection(doc, '01', 'Purpose of this document', 
          `This document has been created to give you a clear understanding of your situation, outline the recommended steps to move forward, and show you exactly how I can support you — without the need for a lawyer. It includes a summary of your issue, a tailored strategy based on construction industry laws, a realistic timeline, and an editable letter you can send today. My goal is to take the guesswork, stress, and legal overwhelm out of the process so you can take action quickly, confidently, and affordably.

I've been through the legal system myself. I've seen how flawed it is — how it drags on for years, causes relentless stress, and often ends up benefiting the lawyers more than the people seeking justice. It's broken, and it's expensive. That's exactly why I built this. By combining my first hand experience with the power of AI technology, I've created a system that helps trades and builders take control, get the support they need, and get real results — without the legal drama or the massive legal bill.`);

        // Page 3 - Welcome
        doc.addPage();
        this.addSection(doc, '02', 'Welcome to Resolve', documentData.welcomeMessage);

        // Page 4 - Case Analysis
        doc.addPage();
        this.addSection(doc, '03', 'Your case and what you can do now', documentData.legalAnalysis);

        // Page 5 - How it works
        doc.addPage();
        this.addSection(doc, '04', 'How it works', documentData.securityOfPaymentAct.reasoning);
        
        let yPos = 150;
        documentData.securityOfPaymentAct.steps.forEach((step) => {
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text(`Step ${step.step}: ${step.title}`, 50, yPos);
          doc.fontSize(11).font('Helvetica').text(step.description, 50, yPos + 20, { width: 500 });
          doc.fontSize(10).fillColor('#666666').text(`Timeframe: ${step.timeframe}`, 50, yPos + 40);
          yPos += 70;
        });

        // Page 6 - Timeline
        doc.addPage();
        this.addSection(doc, '05', 'Timeline', '');
        
        yPos = 120;
        // Table header
        doc.rect(50, yPos, 500, 25).fillAndStroke('#f0f0f0', '#cccccc');
        doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold');
        doc.text('Day', 70, yPos + 7);
        doc.text('Action', 200, yPos + 7);
        yPos += 35;

        // Table rows
        documentData.timeline.forEach((item, index) => {
          const bgColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
          doc.rect(50, yPos - 5, 500, 30).fillAndStroke(bgColor, '#eeeeee');
          doc.fillColor('#000000').fontSize(11).font('Helvetica');
          doc.text(item.day, 70, yPos);
          doc.text(item.action, 200, yPos, { width: 280 });
          if (item.deadline) {
            doc.fontSize(9).fillColor('#dc2626').text(item.deadline, 200, yPos + 15);
          }
          yPos += 35;
        });

        doc.fontSize(12).fillColor('#000000').text(
          "You're legally in the right — and now you're using one of the strongest tools available to tradies in Australia.",
          50, yPos + 20, { width: 500 }
        );

        // Page 7 - Coverage
        doc.addPage();
        this.addSection(doc, '06', 'Your covered', 
          `Even without a formal contract, the builder agreed to the work and terms — and you completed it. That creates a legally enforceable right to payment, which SOPA supports.

We'll help you:
• Issue the correct Payment Claim
• Track deadlines
• Apply pressure without lawyers`);

        // Cost breakdown
        yPos = 250;
        doc.fontSize(14).font('Helvetica-Bold').text('How much does Adjudication Cost?', 50, yPos);
        yPos += 30;
        
        doc.fontSize(11).font('Helvetica').text(
          `The cost is far less than going to court or hiring a lawyer. Here's what you can expect:

Application Fee: ${documentData.costEstimate.adjudicationFee}
Adjudicator's Fee: ${documentData.costEstimate.adjudicatorFee}
Recovery Likelihood: ${documentData.costEstimate.recoveryLikelihood}

If your documents are clear and the builder doesn't respond, you'll likely win by default — making this a very low-risk option to recover what you're owed.`,
          50, yPos, { width: 500 }
        );

        // Page 8 - Next Steps
        doc.addPage();
        this.addSection(doc, '07', 'Next Steps', documentData.nextSteps);

        // Enforcement section
        yPos = 200;
        doc.fontSize(14).font('Helvetica-Bold').text("What If the Builder Still Doesn't Pay?", 50, yPos);
        yPos += 30;
        
        doc.fontSize(11).font('Helvetica').text(documentData.enforcementInfo, 50, yPos, { width: 500 });

        // Summary steps
        yPos += 100;
        doc.fontSize(14).font('Helvetica-Bold').text('Summary of Next Steps', 50, yPos);
        yPos += 30;
        
        const summarySteps = [
          'Wait 10 business days after sending the Payment Claim',
          'No reply? Apply for adjudication through an Authorised Nominating Authority (ANA)',
          'Win the decision? Wait for payment (usually within 5–10 business days)',
          'Still unpaid? Enforce the ruling through court with an Adjudication Certificate'
        ];

        summarySteps.forEach((step, index) => {
          doc.fontSize(11).font('Helvetica').text(`${index + 1}. ${step}`, 70, yPos);
          yPos += 25;
        });

        // Attachments
        if (documentData.attachments && documentData.attachments.length > 0) {
          yPos += 40;
          doc.fontSize(16).font('Helvetica-Bold').text('Attachments', 50, yPos);
          yPos += 30;
          documentData.attachments.forEach(attachment => {
            doc.fontSize(12).font('Helvetica').text(attachment, 50, yPos);
            yPos += 20;
          });
        }

        // Add footer to all pages
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          const pageIndex = doc.bufferedPageRange().start + i;
          doc.switchToPage(pageIndex);
          doc.fontSize(9).fillColor('#666666').text(
            'Resolve for tradies— Empowering you to resolve legal issues without the legal fees.     RESOLVE',
            50, 770, { align: 'center' }
          );
        }

        doc.end();

        writeStream.on('finish', () => {
          resolve(filename);
        });

        writeStream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  private addSection(doc: PDFKit.PDFDocument, number: string, title: string, content: string, yPos: number = 50): number {
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text(title, 50, yPos);
    doc.fontSize(10).fillColor('#666666').text(number, 500, yPos);
    
    if (content) {
      doc.fontSize(11).font('Helvetica').fillColor('#000000').text(content, 50, yPos + 30, { 
        width: 500, 
        align: 'justify',
        lineGap: 3
      });
    }
    
    return yPos + 120; // Return new y position
  }
}

export const comprehensivePDFGenerator = new ComprehensivePDFGenerator();