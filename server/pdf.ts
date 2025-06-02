import PDFDocument from 'pdfkit';
import { promises as fs } from 'fs';
import path from 'path';
import type { Case } from '@shared/schema';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

interface ResolveStrategyPack {
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

async function generateAIStrategyContent(caseData: Case): Promise<AIStrategyPack> {
  const prompt = `You are a legal AI assistant specializing in Australian trade and construction law. Generate a comprehensive strategy pack for the following case:

Case Details:
- Title: ${caseData.title}
- Issue Type: ${caseData.issueType}
- Amount: ${caseData.amount ? `$${caseData.amount}` : 'Not specified'}
- Description: ${caseData.description}
- Trade: ${caseData.tradeService || 'Not specified'}
- State: ${caseData.state || 'Not specified'}

Generate a professional strategy pack with the following structure. Respond in JSON format:

{
  "executiveSummary": "A 2-3 paragraph executive summary of the case and recommended approach",
  "caseStrengths": ["List of 4-6 key strengths in this case"],
  "recommendedActions": [
    {
      "step": 1,
      "title": "Action title",
      "description": "Detailed description of what to do",
      "priority": "High/Medium/Low",
      "timeframe": "Immediate/1-2 weeks/1-3 months"
    }
  ],
  "legalRecommendations": ["List of 3-5 specific legal recommendations"],
  "riskAssessment": "Paragraph explaining potential risks and mitigation strategies",
  "nextSteps": ["List of 3-4 immediate next steps"],
  "disclaimer": "Professional legal disclaimer appropriate for Australian trade disputes"
}

Make the content specific to Australian trade law, practical, and actionable.`;

  try {
    if (!openai) {
      throw new Error('OpenAI API key not configured');
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert legal AI assistant specializing in Australian trade and construction disputes. Provide detailed, practical advice in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const content = JSON.parse(response.choices[0].message.content);
    return content as AIStrategyPack;
  } catch (error) {
    console.error('Error generating AI strategy content:', error);
    // Fallback content if AI fails
    return {
      executiveSummary: "This strategy pack provides comprehensive guidance for your trade dispute case.",
      caseStrengths: ["Strong documentation available", "Clear contractual obligations", "Australian Consumer Law protections"],
      recommendedActions: [
        {
          step: 1,
          title: "Document Review",
          description: "Compile all relevant documentation including contracts, communications, and evidence.",
          priority: "High",
          timeframe: "Immediate"
        }
      ],
      legalRecommendations: ["Seek formal legal advice", "Consider dispute resolution options"],
      riskAssessment: "Moderate risk case with good prospects for resolution through proper legal channels.",
      nextSteps: ["Gather documentation", "Contact relevant parties", "Consider mediation"],
      disclaimer: "This document provides information and guidance, not legal advice. Consult with a qualified legal professional."
    };
  }
}

export async function generateAIStrategyPackPDF(caseData: Case): Promise<string> {
  // Generate AI content first
  const aiContent = await generateAIStrategyContent(caseData);
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 60,
          bottom: 60,
          left: 60,
          right: 60
        }
      });

      const fileName = `ai-strategy-pack-${caseData.caseNumber || Date.now()}.pdf`;
      const filePath = path.join('uploads', fileName);
      
      doc.pipe(require('fs').createWriteStream(filePath));

      // Cover Page
      doc.fontSize(28)
         .fillColor('#1565C0')
         .text('Resolve AI', 60, 100, { align: 'center' });
      
      doc.fontSize(24)
         .fillColor('#333')
         .text('Strategy Pack', 60, 140, { align: 'center' });

      doc.fontSize(16)
         .fillColor('#666')
         .text(`Case: ${caseData.caseNumber || 'RSV-' + Date.now()}`, 60, 180, { align: 'center' });

      // Case overview box
      doc.rect(60, 220, 475, 200)
         .fill('#f8f9fa')
         .stroke('#e9ecef');

      doc.fontSize(18)
         .fillColor('#1565C0')
         .text('Case Overview', 80, 240);

      doc.fontSize(12)
         .fillColor('#333')
         .text(`Title: ${caseData.title || 'Trade Dispute Case'}`, 80, 270)
         .text(`Issue Type: ${caseData.issueType || 'General Dispute'}`, 80, 290)
         .text(`Amount in Dispute: ${caseData.amount ? `$${Number(caseData.amount).toLocaleString()}` : 'To be determined'}`, 80, 310)
         .text(`Trade/Service: ${caseData.tradeService || 'Not specified'}`, 80, 330)
         .text(`State: ${caseData.state || 'Australia'}`, 80, 350)
         .text(`Generated: ${new Date().toLocaleDateString('en-AU')}`, 80, 370);

      // Footer for cover page
      doc.fontSize(10)
         .fillColor('#666')
         .text('Confidential and Privileged Document', 60, 750, { align: 'center' });

      // Page 2 - Executive Summary
      doc.addPage();
      
      doc.fontSize(24)
         .fillColor('#1565C0')
         .text('Executive Summary', 60, 60);

      doc.moveTo(60, 95)
         .lineTo(535, 95)
         .stroke('#1565C0');

      doc.fontSize(12)
         .fillColor('#333')
         .text(aiContent.executiveSummary, 60, 120, { 
           width: 475, 
           align: 'justify',
           lineGap: 5
         });

      // Page 3 - Case Strengths
      doc.addPage();
      
      doc.fontSize(20)
         .fillColor('#1565C0')
         .text('Case Strengths', 60, 60);

      doc.moveTo(60, 90)
         .lineTo(535, 90)
         .stroke('#1565C0');

      let y = 120;
      aiContent.caseStrengths.forEach((strength, index) => {
        doc.fontSize(12)
           .fillColor('#2e7d32')
           .text(`✓`, 60, y);
        
        doc.fontSize(12)
           .fillColor('#333')
           .text(strength, 80, y, { width: 455 });
        
        y += 25;
      });

      // Risk Assessment
      y += 20;
      doc.fontSize(18)
         .fillColor('#1565C0')
         .text('Risk Assessment', 60, y);

      y += 30;
      doc.fontSize(12)
         .fillColor('#333')
         .text(aiContent.riskAssessment, 60, y, { 
           width: 475, 
           align: 'justify',
           lineGap: 5
         });

      // Page 4 - Action Plan
      doc.addPage();
      
      doc.fontSize(20)
         .fillColor('#1565C0')
         .text('Recommended Action Plan', 60, 60);

      doc.moveTo(60, 90)
         .lineTo(535, 90)
         .stroke('#1565C0');

      y = 120;
      aiContent.recommendedActions.forEach((action, index) => {
        // Action header
        doc.fontSize(14)
           .fillColor('#1565C0')
           .text(`Step ${action.step}: ${action.title}`, 60, y);

        y += 20;

        // Priority and timeframe
        const priorityColor = action.priority === 'High' ? '#d32f2f' : 
                            action.priority === 'Medium' ? '#f57c00' : '#388e3c';
        
        doc.fontSize(10)
           .fillColor(priorityColor)
           .text(`Priority: ${action.priority}`, 60, y)
           .fillColor('#666')
           .text(`Timeframe: ${action.timeframe}`, 200, y);

        y += 20;

        // Description
        doc.fontSize(11)
           .fillColor('#333')
           .text(action.description, 80, y, { width: 455, lineGap: 3 });

        y += Math.ceil(action.description.length / 80) * 15 + 25;

        if (y > 700) {
          doc.addPage();
          y = 60;
        }
      });

      // Page 5 - Legal Recommendations
      doc.addPage();
      
      doc.fontSize(20)
         .fillColor('#1565C0')
         .text('Legal Recommendations', 60, 60);

      doc.moveTo(60, 90)
         .lineTo(535, 90)
         .stroke('#1565C0');

      y = 120;
      aiContent.legalRecommendations.forEach((recommendation, index) => {
        doc.fontSize(12)
           .fillColor('#666')
           .text(`${index + 1}.`, 60, y);
        
        doc.fontSize(12)
           .fillColor('#333')
           .text(recommendation, 80, y, { width: 455 });
        
        y += 30;
      });

      // Next Steps
      y += 20;
      doc.fontSize(18)
         .fillColor('#1565C0')
         .text('Immediate Next Steps', 60, y);

      y += 30;
      aiContent.nextSteps.forEach((step, index) => {
        doc.fontSize(12)
           .fillColor('#1565C0')
           .text(`→`, 60, y);
        
        doc.fontSize(12)
           .fillColor('#333')
           .text(step, 80, y, { width: 455 });
        
        y += 25;
      });

      // Final page - Disclaimer
      doc.addPage();
      
      doc.fontSize(18)
         .fillColor('#d32f2f')
         .text('Important Legal Disclaimer', 60, 60);

      doc.moveTo(60, 90)
         .lineTo(535, 90)
         .stroke('#d32f2f');

      doc.fontSize(12)
         .fillColor('#333')
         .text(aiContent.disclaimer, 60, 120, { 
           width: 475, 
           align: 'justify',
           lineGap: 5
         });

      // Contact information
      doc.fontSize(14)
         .fillColor('#1565C0')
         .text('Contact Information', 60, 250);

      doc.fontSize(12)
         .fillColor('#333')
         .text('Resolve AI Support Team', 60, 280)
         .text('Email: support@resolveai.com.au', 60, 300)
         .text('Phone: 1300 RESOLVE (1300 737 658)', 60, 320)
         .text('Website: www.resolveai.com.au', 60, 340);

      // Footer
      doc.fontSize(10)
         .fillColor('#666')
         .text('© 2024 Resolve AI - Empowering Australian Tradespeople with AI-Powered Legal Solutions', 60, 750, {
           align: 'center',
           width: 475
         });

      doc.end();

      doc.on('end', () => {
        resolve(filePath);
      });

      doc.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
}

export async function generateStrategyPackPDF(caseData: Case): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      const fileName = `strategy-pack-${caseData.caseNumber}.pdf`;
      const filePath = path.join('uploads', fileName);
      
      doc.pipe(require('fs').createWriteStream(filePath));

      // Header
      doc.fontSize(24)
         .fillColor('#1565C0')
         .text('TradeGuard AI Strategy Pack', 50, 50);
      
      doc.fontSize(16)
         .fillColor('#666')
         .text(`Case: ${caseData.caseNumber}`, 50, 80);

      doc.moveTo(50, 110)
         .lineTo(545, 110)
         .stroke('#1565C0');

      let y = 130;

      // Case Overview
      doc.fontSize(18)
         .fillColor('#1565C0')
         .text('Case Overview', 50, y);
      
      y += 30;
      
      doc.fontSize(12)
         .fillColor('#333')
         .text(`Title: ${caseData.title}`, 50, y)
         .text(`Issue Type: ${caseData.issueType}`, 50, y + 15)
         .text(`Amount: ${caseData.amount ? `$${caseData.amount}` : 'Not specified'}`, 50, y + 30)
         .text(`Status: ${caseData.status}`, 50, y + 45);

      y += 80;

      // AI Analysis Section
      if (caseData.aiAnalysis) {
        doc.fontSize(18)
           .fillColor('#1565C0')
           .text('Legal Analysis', 50, y);
        
        y += 30;
        
        const analysis = caseData.aiAnalysis as any;
        
        doc.fontSize(12)
           .fillColor('#333')
           .text(`Case Strength: ${analysis.strengthOfCase || 'Unknown'}`, 50, y)
           .text(`Risk Level: ${analysis.riskLevel || 'Unknown'}`, 50, y + 15)
           .text(`Estimated Timeframe: ${analysis.estimatedTimeframe || 'Unknown'}`, 50, y + 30)
           .text(`Success Probability: ${analysis.successProbability || 'Unknown'}%`, 50, y + 45);

        y += 80;

        // Key Issues
        if (analysis.keyIssues && analysis.keyIssues.length > 0) {
          doc.fontSize(14)
             .fillColor('#1565C0')
             .text('Key Issues:', 50, y);
          
          y += 20;
          
          analysis.keyIssues.forEach((issue: string, index: number) => {
            doc.fontSize(12)
               .fillColor('#333')
               .text(`• ${issue}`, 70, y);
            y += 15;
          });
          
          y += 10;
        }

        // Legal Protections
        if (analysis.legalProtections && analysis.legalProtections.length > 0) {
          doc.fontSize(14)
             .fillColor('#1565C0')
             .text('Legal Protections Available:', 50, y);
          
          y += 20;
          
          analysis.legalProtections.forEach((protection: string) => {
            doc.fontSize(12)
               .fillColor('#333')
               .text(`• ${protection}`, 70, y);
            y += 15;
          });
          
          y += 10;
        }
      }

      // Strategy Pack Section
      if (caseData.strategyPack) {
        // Check if we need a new page
        if (y > 650) {
          doc.addPage();
          y = 50;
        }

        doc.fontSize(18)
           .fillColor('#1565C0')
           .text('Strategy Pack', 50, y);
        
        y += 30;
        
        const strategy = caseData.strategyPack as any;
        
        // Executive Summary
        if (strategy.executiveSummary) {
          doc.fontSize(14)
             .fillColor('#1565C0')
             .text('Executive Summary:', 50, y);
          
          y += 20;
          
          doc.fontSize(12)
             .fillColor('#333')
             .text(strategy.executiveSummary, 50, y, { width: 495 });
          
          y += 60;
        }

        // Step by Step Plan
        if (strategy.stepByStepPlan && strategy.stepByStepPlan.length > 0) {
          if (y > 600) {
            doc.addPage();
            y = 50;
          }

          doc.fontSize(14)
             .fillColor('#1565C0')
             .text('Action Plan:', 50, y);
          
          y += 20;
          
          strategy.stepByStepPlan.forEach((step: any, index: number) => {
            doc.fontSize(12)
               .fillColor('#FF8F00')
               .text(`Step ${step.step}: ${step.action}`, 50, y);
            
            y += 15;
            
            doc.fontSize(11)
               .fillColor('#333')
               .text(step.description, 70, y, { width: 475 });
            
            y += 25;
            
            doc.fontSize(10)
               .fillColor('#666')
               .text(`Timeframe: ${step.timeframe} | Priority: ${step.priority}`, 70, y);
            
            y += 25;

            if (y > 700) {
              doc.addPage();
              y = 50;
            }
          });
        }

        // Timeline
        if (strategy.timeline) {
          if (y > 600) {
            doc.addPage();
            y = 50;
          }

          doc.fontSize(14)
             .fillColor('#1565C0')
             .text('Timeline:', 50, y);
          
          y += 20;
          
          const timeline = strategy.timeline;
          
          if (timeline.immediateActions) {
            doc.fontSize(12)
               .fillColor('#C62828')
               .text('Immediate Actions:', 50, y);
            y += 15;
            
            timeline.immediateActions.forEach((action: string) => {
              doc.fontSize(11)
                 .fillColor('#333')
                 .text(`• ${action}`, 70, y);
              y += 12;
            });
            y += 10;
          }

          if (timeline.shortTerm) {
            doc.fontSize(12)
               .fillColor('#F57C00')
               .text('Short Term (1-2 weeks):', 50, y);
            y += 15;
            
            timeline.shortTerm.forEach((action: string) => {
              doc.fontSize(11)
                 .fillColor('#333')
                 .text(`• ${action}`, 70, y);
              y += 12;
            });
            y += 10;
          }

          if (timeline.mediumTerm) {
            doc.fontSize(12)
               .fillColor('#2E7D32')
               .text('Medium Term (1-3 months):', 50, y);
            y += 15;
            
            timeline.mediumTerm.forEach((action: string) => {
              doc.fontSize(11)
                 .fillColor('#333')
                 .text(`• ${action}`, 70, y);
              y += 12;
            });
          }
        }
      }

      // Footer
      doc.fontSize(10)
         .fillColor('#666')
         .text('© 2024 TradeGuard AI - This document provides information and guidance, not legal advice.', 50, 750, {
           align: 'center',
           width: 495
         });

      doc.end();

      doc.on('end', () => {
        resolve(filePath);
      });

      doc.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
}
