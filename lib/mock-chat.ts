import type { ChatMessage, ChatResponse } from "@/types/chat";
import type { CalculatorInputs } from "@/types/inputs";
import { SLOT_DEFS, type SlotKey } from "./slots";

/**
 * Heuristic extractor for the offline / no-API-key path. Pulls numbers and a
 * use case out of the user's most recent message based on the slot we're
 * currently trying to fill. Not as smart as Gemini but never blocks the flow.
 */
function extract(
  lastUserMessage: string,
  nextSlotKey: SlotKey | null,
): Partial<CalculatorInputs> {
  if (!nextSlotKey) return {};
  const text = lastUserMessage.trim();
  const lower = text.toLowerCase();

  if (nextSlotKey === "useCase") {
    return text.length > 0 ? { useCase: text } : {};
  }

  if (nextSlotKey === "currentHeadcount") {
    const n = readNumber(lower);
    if (n !== null && n > 0 && n < 1000) {
      return { teamSize: n, employeeCount: Math.min(n, 5) };
    }
  }

  if (nextSlotKey === "avgSalary") {
    const n = readMoney(lower);
    if (n !== null && n > 10_000 && n < 1_000_000) {
      return { employeeSalary: n, teamAvgSalary: n, avoidedHireSalary: n };
    }
  }

  if (nextSlotKey === "aiBuildCost") {
    const n = readMoney(lower);
    if (n !== null && n >= 10_000) {
      return { aiBuildCost: n, aiMonthlyOpex: Math.round((n * 0.10) / 12) };
    }
    // user said "not sure" or similar — use a sensible default
    if (/(not sure|don'?t know|idk|typical|default)/.test(lower)) {
      return { aiBuildCost: 80_000, aiMonthlyOpex: 667 };
    }
  }

  if (nextSlotKey === "productivityGainPct") {
    const pct = readPercent(lower);
    if (pct !== null) return { productivityGainPct: pct };
    if (/most|majority|huge|tons/.test(lower)) return { productivityGainPct: 0.6 };
    if (/some|bit/.test(lower)) return { productivityGainPct: 0.25 };
  }

  if (nextSlotKey === "avoidedHire") {
    if (/(no|not really|won'?t)/.test(lower)) return { avoidedHireMonth: 999 }; // off-horizon
    const months = readMonths(lower);
    if (months !== null) return { avoidedHireMonth: months };
  }

  if (nextSlotKey === "errorCost") {
    if (/(negligible|none|no errors|n\/a)/.test(lower)) return { annualErrorCost: 0 };
    const n = readMoney(lower);
    if (n !== null) return { annualErrorCost: n, errorReductionPct: 0.5 };
  }

  if (nextSlotKey === "horizonMonths") {
    const n = readNumber(lower);
    if (n !== null && n > 0 && n <= 60) return { horizonMonths: n };
    if (/year/.test(lower)) {
      const yrs = readNumber(lower);
      if (yrs !== null) return { horizonMonths: yrs * 12 };
    }
  }

  return {};
}

function readNumber(s: string): number | null {
  const m = s.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function readMoney(s: string): number | null {
  // $80k, $80,000, 80k, 80000, $1.2m
  const m = s.replace(/[,\s]/g, "").match(/(\$?)(\d+(?:\.\d+)?)(k|m)?/i);
  if (!m) return null;
  let n = Number(m[2]);
  if (!Number.isFinite(n)) return null;
  const unit = (m[3] || "").toLowerCase();
  if (unit === "k") n *= 1_000;
  else if (unit === "m") n *= 1_000_000;
  return n;
}

function readPercent(s: string): number | null {
  const m = s.match(/(\d+(?:\.\d+)?)\s*%/);
  if (m) return Math.min(1, Number(m[1]) / 100);
  // bare number that looks like a percent
  const n = readNumber(s);
  if (n !== null && n > 1 && n <= 100) return n / 100;
  if (n !== null && n >= 0 && n <= 1) return n;
  return null;
}

function readMonths(s: string): number | null {
  const m = s.match(/(\d+)\s*(month|mo)/i);
  if (m) return Number(m[1]);
  const y = s.match(/(\d+)\s*(year|yr)/i);
  if (y) return Number(y[1]) * 12;
  return null;
}

export function mockChatReply(args: {
  messages: ChatMessage[];
  filledSlots: Partial<CalculatorInputs>;
  nextSlotKey: SlotKey | null;
  variant: "hero" | "sidebar";
}): ChatResponse {
  const lastUserMsg = [...args.messages].reverse().find((m) => m.role === "user");
  const slotUpdates = extract(lastUserMsg?.content ?? "", args.nextSlotKey);

  // What slot will we be on AFTER this turn?
  const nextAfterUpdate = computeNextSlot({ ...args.filledSlots, ...slotUpdates });

  // Sidebar variant: just echo back
  if (args.variant === "sidebar") {
    return {
      message: lastUserMsg
        ? `Got it — I updated your numbers. ${Object.keys(slotUpdates).length === 0 ? "Adjust the sliders or tell me a different value." : "Watch the chart re-fit."}`
        : "What would you like to adjust?",
      slotUpdates,
      suggestedChips: ["What if headcount doubles?", "Tighten the ramp", "Show me 36 months"],
      done: false,
    };
  }

  // Hero variant: ask the next required question (or close out)
  if (nextAfterUpdate === null) {
    return {
      message: "Got it — pulling up your projection now.",
      slotUpdates,
      done: true,
    };
  }

  const def = SLOT_DEFS[nextAfterUpdate];
  return {
    message: def.fallbackQuestion,
    slotUpdates,
    suggestedChips: def.fallbackChips,
    done: false,
  };
}

function computeNextSlot(partial: Partial<CalculatorInputs>): SlotKey | null {
  // Mirror getNextSlot but operate on the partial directly.
  const ordered = Object.values(SLOT_DEFS).sort((a, b) => a.priority - b.priority);
  for (const def of ordered) {
    if (!def.required) continue;
    const hasValue = def.fields.some((f) => {
      const v = partial[f];
      if (v === undefined) return false;
      if (def.key === "useCase") return typeof v === "string" && v.trim().length > 0;
      return true;
    });
    if (!hasValue) return def.key;
  }
  return null;
}
