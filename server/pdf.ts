import PDFDocument from 'pdfkit';
import { promises as fs } from 'fs';
import path from 'path';
import type { Case } from '@shared/schema';

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
