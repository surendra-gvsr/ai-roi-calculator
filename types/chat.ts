import { z } from "zod";
import type { CalculatorInputs } from "./inputs";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  chips?: string[];
  /** Slot keys this message updated — for the "we updated X" badge */
  updatedSlots?: string[];
}

/**
 * The shape Gemini is told to return.
 * `slotUpdates` is a partial of CalculatorInputs — only the fields the bot
 * confidently extracted from the user's last turn.
 */
/**
 * `slotUpdates` is intentionally loose: it accepts any subset of CalculatorInputs
 * fields (which includes scalars AND the `toggles` object). The page-level merge
 * code filters out non-finite numbers and empty strings before applying.
 */
export const ChatResponseSchema = z.object({
  message: z.string().min(1).max(800),
  slotUpdates: z.record(z.string(), z.unknown()).default({}),
  suggestedChips: z.array(z.string().min(1).max(60)).max(4).optional(),
  done: z.boolean().default(false),
  reasoning: z.string().optional(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export interface ChatRequest {
  messages: ChatMessage[];
  filledSlots: Partial<CalculatorInputs>;
  nextSlotKey: string | null;
  /** "hero" during onboarding, "sidebar" once dashboard is visible — changes the prompt rules */
  variant: "hero" | "sidebar";
}
