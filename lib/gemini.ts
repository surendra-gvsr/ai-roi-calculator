import "server-only";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const PLAYBOOK_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    phases: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING },
          timeframe: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          objective: { type: SchemaType.STRING },
          actions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          deliverable: { type: SchemaType.STRING },
          estCost: { type: SchemaType.NUMBER },
          owner: { type: SchemaType.STRING },
          risks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["id", "timeframe", "title", "objective", "actions", "deliverable", "estCost", "owner", "risks"],
      },
    },
    successMetrics: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    topRisks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    summary: { type: SchemaType.STRING },
  },
  required: ["phases", "successMetrics", "topRisks", "summary"],
};

export async function generatePlaybookJson(prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: PLAYBOOK_RESPONSE_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text);
}

// ---- Chat ----

const CHAT_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    message: { type: SchemaType.STRING },
    slotUpdates: {
      // We let Gemini emit any subset of the known fields. Strict per-field
      // typing is enforced server-side via zod after the response comes back.
      type: SchemaType.OBJECT,
      properties: {
        useCase: { type: SchemaType.STRING },
        industry: { type: SchemaType.STRING },
        teamSize: { type: SchemaType.NUMBER },
        employeeCount: { type: SchemaType.NUMBER },
        employeeSalary: { type: SchemaType.NUMBER },
        teamAvgSalary: { type: SchemaType.NUMBER },
        avoidedHireSalary: { type: SchemaType.NUMBER },
        avoidedHireMonth: { type: SchemaType.NUMBER },
        aiBuildCost: { type: SchemaType.NUMBER },
        aiMonthlyOpex: { type: SchemaType.NUMBER },
        productivityGainPct: { type: SchemaType.NUMBER },
        annualErrorCost: { type: SchemaType.NUMBER },
        errorReductionPct: { type: SchemaType.NUMBER },
        horizonMonths: { type: SchemaType.NUMBER },
      },
    },
    suggestedChips: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    done: { type: SchemaType.BOOLEAN },
    reasoning: { type: SchemaType.STRING },
  },
  required: ["message", "done"],
};

export async function generateChatJson(prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: CHAT_RESPONSE_SCHEMA,
      temperature: 0.5,
      // 2048 leaves enough room for the message + slotUpdates JSON even when
      // Gemini gets chatty with the optional `reasoning` field.
      maxOutputTokens: 2048,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text);
}
