import OpenAI from "openai";
import type { Case } from "@shared/schema";

// OpenAI is optional for development
const OPENAI_ENABLED = !!process.env.OPENAI_API_KEY;

const openai = OPENAI_ENABLED ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export async function analyzeCase(caseData: Case): Promise<any> {
  if (!OPENAI_ENABLED) {
    return {
      caseType: "AI Analysis Unavailable",
      jurisdiction: "Please configure OpenAI API key",
      legalFramework: ["Configuration Required"],
      strengthOfCase: "unknown",
      riskLevel: "unknown",
      estimatedTimeframe: "AI analysis not available",
      keyIssues: ["OpenAI API key required for AI analysis"],
      recommendedActions: ["Configure OpenAI integration"],
      legalProtections: ["Manual legal consultation recommended"],
      successProbability: 0
    };
  }

  try {
    const prompt = `
You are an expert legal advisor specializing in Australian construction and trade law. Analyze this case and provide strategic guidance.

Case Details:
- Issue Type: ${caseData.issueType}
- Amount: ${caseData.amount ? `$${caseData.amount}` : 'Not specified'}
- Description: ${caseData.description}

Please analyze this case and provide a JSON response with the following structure:
{
  "caseType": "string",
  "jurisdiction": "string",
  "legalFramework": ["SOPA", "BCIPA", "etc"],
  "strengthOfCase": "weak|moderate|strong",
  "riskLevel": "low|medium|high",
  "estimatedTimeframe": "string",
  "keyIssues": ["issue1", "issue2"],
  "recommendedActions": ["action1", "action2"],
  "legalProtections": ["protection1", "protection2"],
  "successProbability": "number (0-100)"
}

Focus on Australian trade and construction law, including Security of Payment Acts (SOPA), Building and Construction Industry Payment Acts, and relevant state legislation.
`;

    const response = await openai!.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert Australian construction law advisor. Provide analysis in JSON format only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error("Error analyzing case:", error);
    throw new Error("Failed to analyze case with AI");
  }
}

export async function generateStrategyPack(caseData: Case, analysis: any): Promise<any> {
  try {
    const prompt = `
Based on the case analysis, generate a comprehensive strategy pack for this Australian tradesperson.

Case: ${caseData.title}
Issue: ${caseData.issueType}
Amount: ${caseData.amount ? `$${caseData.amount}` : 'Not specified'}
Analysis: ${JSON.stringify(analysis)}

Generate a JSON response with:
{
  "executiveSummary": "string",
  "strategyOverview": "string",
  "stepByStepPlan": [
    {
      "step": "number",
      "action": "string",
      "description": "string",
      "timeframe": "string",
      "priority": "high|medium|low"
    }
  ],
  "documentsToGenerate": [
    {
      "type": "string",
      "purpose": "string",
      "urgency": "immediate|soon|later"
    }
  ],
  "legalOptions": [
    {
      "option": "string",
      "description": "string",
      "pros": ["string"],
      "cons": ["string"],
      "cost": "string",
      "timeframe": "string"
    }
  ],
  "timeline": {
    "immediateActions": ["string"],
    "shortTerm": ["string"],
    "mediumTerm": ["string"],
    "longTerm": ["string"]
  },
  "riskMitigation": ["string"],
  "expectedOutcomes": "string"
}

Focus on practical, actionable advice specific to Australian trade law.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert strategy consultant for Australian tradespeople. Provide detailed, actionable strategy packs in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (error) {
    console.error("Error generating strategy pack:", error);
    throw new Error("Failed to generate strategy pack with AI");
  }
}

export async function generateLegalDocument(documentType: string, caseData: Case, analysis: any): Promise<string> {
  try {
    const prompt = `
Generate a ${documentType} document for this Australian trade case.

Case Details:
- Type: ${caseData.issueType}
- Amount: ${caseData.amount ? `$${caseData.amount}` : 'Not specified'}
- Description: ${caseData.description}

Analysis: ${JSON.stringify(analysis)}

Create a professional ${documentType} suitable for Australian construction/trade disputes. Include proper legal formatting, references to relevant legislation (SOPA, etc.), and clear demands/statements.

Return only the document content, properly formatted.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert legal document writer specializing in Australian construction and trade law."
        },
        {
          role: "user",
          content: prompt
        }
      ],
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error("Error generating legal document:", error);
    throw new Error("Failed to generate legal document with AI");
  }
}
