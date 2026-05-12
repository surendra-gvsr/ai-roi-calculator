import { NextResponse } from "next/server";
import { z } from "zod";
import { generateChatJson } from "@/lib/gemini";
import { buildChatPrompt } from "@/lib/prompts";
import { ChatResponseSchema } from "@/types/chat";
import { mockChatReply } from "@/lib/mock-chat";
import type { SlotKey } from "@/lib/slots";
import type { CalculatorInputs } from "@/types/inputs";

const RequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      chips: z.array(z.string()).optional(),
      updatedSlots: z.array(z.string()).optional(),
    }),
  ),
  filledSlots: z.record(z.any()).optional().default({}),
  nextSlotKey: z.string().nullable().optional().default(null),
  variant: z.enum(["hero", "sidebar"]).optional().default("hero"),
  mock: z.boolean().optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request shape", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { messages, filledSlots, nextSlotKey, variant, mock } = parsed.data;

  const url = new URL(req.url);
  const mockQuery = url.searchParams.get("mock") === "1";
  const useMock = mock || mockQuery || !process.env.GEMINI_API_KEY;

  if (useMock) {
    const reply = mockChatReply({
      messages,
      filledSlots: filledSlots as Partial<CalculatorInputs>,
      nextSlotKey: nextSlotKey as SlotKey | null,
      variant,
    });
    return NextResponse.json({ ...reply, source: "mock" });
  }

  try {
    const prompt = buildChatPrompt({
      messages,
      filledSlots: filledSlots as Partial<CalculatorInputs>,
      nextSlotKey: nextSlotKey as SlotKey | null,
      variant,
    });
    const raw = await generateChatJson(prompt);
    const validated = ChatResponseSchema.safeParse(raw);
    if (!validated.success) {
      // Fall back to the mock so the user never gets stuck.
      const fallback = mockChatReply({
        messages,
        filledSlots: filledSlots as Partial<CalculatorInputs>,
        nextSlotKey: nextSlotKey as SlotKey | null,
        variant,
      });
      return NextResponse.json({ ...fallback, source: "mock-fallback", validationIssues: validated.error.issues });
    }
    return NextResponse.json({ ...validated.data, source: "llm" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // On any LLM error, fall back to mock so the conversation continues.
    const fallback = mockChatReply({
      messages,
      filledSlots: filledSlots as Partial<CalculatorInputs>,
      nextSlotKey: nextSlotKey as SlotKey | null,
      variant,
    });
    return NextResponse.json({ ...fallback, source: "mock-fallback", error: message });
  }
}
