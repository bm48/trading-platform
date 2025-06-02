import PDFDocument from 'pdfkit';
import { promises as fs } from 'fs';
import path from 'path';
import type { Case } from '@shared/schema';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

interface ResolveContent {
  clientName: string;
  caseTitle: string;
  amount: string;
  welcomeMessage: string;
  caseDescription: string;
  legalSteps: Array<{
    step: number;
    title: string;
    description: string;
  }>;
  timeline: Array<{
    day: string;
    action: string;
  }>;
  coverageExplanation: string;
  nextSteps: string;
  adjudicationInfo: string;
  enforcementInfo: string;
  attachments: string[];
}

async function generateResolveContent(caseData: Case): Promise<ResolveContent> {
  const prompt = `Generate content for a RESOLVE strategy pack for an Australian tradie payment dispute. Use the case details below to create personalized, actionable content following the Security of Payment Act framework.

Case Details:
- Issue: ${caseData.issueType}
- Amount: ${caseData.amount || '$10,000'}
- Description: ${caseData.description || 'Payment dispute'}
- Case Title: ${caseData.title}

Create content that:
1. Shows empathy for their situation
2. Explains their legal rights under Security of Payment Act
3. Provides specific actionable steps with deadlines
4. Uses practical, tradie-friendly language
5. Focuses on getting paid without lawyers

Return JSON with this structure:
{
  "clientName": "string (extract from case or use generic)",
  "caseTitle": "string (Party A v Party B format)",
  "amount": "string (amount owed)",
  "welcomeMessage": "string (empathetic intro acknowledging their situation)",
  "caseDescription": "string (explains legal position under SOPA)",
  "legalSteps": [{"step": number, "title": "string", "description": "string"}],
  "timeline": [{"day": "string", "action": "string"}],
  "coverageExplanation": "string (why they're legally protected)",
  "nextSteps": "string (adjudication process explanation)",
  "adjudicationInfo": "string (costs and process)",
  "enforcementInfo": "string (what happens if they still don't pay)",
  "attachments": ["Payment Claim Letter - Word Document"]
}`;

  try {
    if (!openai) {
      throw new Error('OpenAI API key not configured. Please provide your OpenAI API key to generate personalized strategy content.');
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a legal AI specializing in Australian Security of Payment Acts. Create empathetic, actionable content for tradespeople in payment disputes."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    return result as ResolveContent;
  } catch (error) {
    console.error("Error generating content:", error);
    throw new Error('Failed to generate strategy content. Please check your OpenAI API key configuration.');
  }
}

export async function generateResolvePDF(caseData: Case): Promise<string> {
  try {
    // Generate AI content
    const content = await generateResolveContent(caseData);
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    const filename = `resolve-strategy-${caseData.caseNumber || Date.now()}.pdf`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    await fs.mkdir(uploadsDir, { recursive: true });
    const filepath = path.join(uploadsDir, filename);
    
    doc.pipe(require('fs').createWriteStream(filepath));

    // Cover Page
    doc.fontSize(36).fillColor('#000').text('RESOLVE', 50, 50);
    doc.fontSize(18).text('FOR TRADIES. POWERED BY AI', 50, 100);
    doc.moveDown(2);
    doc.fontSize(14).text(`Prepared for ${content.clientName}`, 50, 150);
    doc.moveDown(2);
    doc.fontSize(16).text(content.caseTitle, 50, 200);
    doc.moveDown();
    doc.fontSize(12).text(new Date().toLocaleDateString(), 50, 240);
    doc.moveDown(4);
    doc.text('Resolve — Empowering you to resolve legal issues without the legal fees.', 50, 300);

    // Page 2 - Purpose
    doc.addPage();
    doc.fontSize(16).fillColor('#000').text('Purpose of this document', 50, 50);
    doc.fontSize(10).text('01', 500, 50);
    doc.moveDown();
    doc.fontSize(10).text(`This document has been created to give you a clear understanding of your situation, outline the recommended steps to move forward, and show you exactly how I can support you — without the need for a lawyer. It includes a summary of your issue, a tailored strategy based on construction industry laws, a realistic timeline, and an editable letter you can send today. My goal is to take the guesswork, stress, and legal overwhelm out of the process so you can take action quickly, confidently, and affordably.`);
    doc.moveDown();
    doc.text(`I've been through the legal system myself. I've seen how flawed it is — how it drags on for years, causes relentless stress, and often ends up benefiting the lawyers more than the people seeking justice. It's broken, and it's expensive. That's exactly why I built this. By combining my first hand experience with the power of AI technology, I've created a system that helps trades and builders take control, get the support they need, and get real results — without the legal drama or the massive legal bill.`);

    // Page 3 - Welcome
    doc.addPage();
    doc.fontSize(16).text('Welcome to Resolve', 50, 50);
    doc.fontSize(10).text('02', 500, 50);
    doc.moveDown();
    doc.fontSize(10).text(content.welcomeMessage);

    // Page 4 - Your case
    doc.addPage();
    doc.fontSize(16).text('Your case and what you can do now', 50, 50);
    doc.fontSize(10).text('03', 500, 50);
    doc.moveDown();
    doc.fontSize(10).text(content.caseDescription);
    doc.moveDown();
    doc.text('Even if there was no formal contract, the Act still applies if:');
    doc.list(['You did construction work or supplied related goods/services', 'You issued a valid invoice (payment claim)', "You haven't been paid within the allowed timeframe"], 70);

    // Page 5 - How it works
    doc.addPage();
    doc.fontSize(16).text('How it works', 50, 50);
    doc.fontSize(10).text('04', 500, 50);
    doc.moveDown();
    content.legalSteps.forEach((step, index) => {
      doc.fontSize(10).text(`Step ${step.step}: ${step.title}`);
      doc.text(step.description);
      doc.moveDown();
    });

    // Page 6 - Timeline
    doc.addPage();
    doc.fontSize(16).text('Timeline', 50, 50);
    doc.fontSize(10).text('05', 500, 50);
    doc.moveDown();
    
    // Timeline table
    let yPos = 100;
    doc.fontSize(10).text('Day', 60, yPos).text('Action', 150, yPos);
    yPos += 20;
    
    content.timeline.forEach(item => {
      doc.text(item.day, 60, yPos).text(item.action, 150, yPos);
      yPos += 20;
    });

    doc.moveDown(2);
    doc.text("You're legally in the right — and now you're using one of the strongest tools available to tradies.");

    // Page 7 - You're covered
    doc.addPage();
    doc.fontSize(16).text("You're covered", 50, 50);
    doc.fontSize(10).text('06', 500, 50);
    doc.moveDown();
    doc.fontSize(10).text(content.coverageExplanation);
    doc.moveDown();
    doc.text("We'll help you:");
    doc.list(['Issue the correct Payment Claim', 'Track deadlines', 'Apply pressure without lawyers'], 70);

    // Page 8 - Next Steps
    doc.addPage();
    doc.fontSize(16).text('Next Steps', 50, 50);
    doc.fontSize(10).text('07', 500, 50);
    doc.moveDown();
    doc.fontSize(10).text(content.nextSteps);
    doc.moveDown();
    doc.text('What is adjudication');
    doc.text(content.adjudicationInfo);
    doc.moveDown();
    doc.text('How much does Adjudication Cost?');
    doc.text('The cost is far less than going to court or hiring a lawyer.');

    // Final page - Enforcement
    doc.addPage();
    doc.fontSize(12).text("What If the Builder Still Doesn't Pay?");
    doc.moveDown();
    doc.fontSize(10).text(content.enforcementInfo);
    doc.moveDown();
    doc.text('Summary of Next Steps');
    doc.list([
      'Wait 10 business days after sending the Payment Claim',
      'No reply? Apply for adjudication through an Authorised Nominating Authority (ANA)',
      'Win the decision? Wait for payment (usually within 5–10 business days)',
      'Still unpaid? Enforce the ruling through court with an Adjudication Certificate'
    ], 70);
    
    doc.moveDown(2);
    doc.text('Attachments');
    content.attachments.forEach(attachment => {
      doc.text(`• ${attachment}`);
    });

    doc.end();

    return filepath;
  } catch (error: any) {
    console.error("Error generating RESOLVE PDF:", error);
    throw new Error(`Failed to generate RESOLVE PDF: ${error.message}`);
  }
}