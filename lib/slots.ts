import { DEFAULT_INPUTS, type CalculatorInputs } from "@/types/inputs";

/**
 * A "slot" is one piece of information the chatbot needs to extract from the
 * user before the dashboard is meaningful. Each slot maps 1:1 to a field on
 * CalculatorInputs (or a small set of related fields).
 */
export type SlotKey =
  | "useCase"
  | "currentHeadcount"
  | "avgSalary"
  | "aiBuildCost"
  | "productivityGainPct"
  | "avoidedHire"
  | "errorCost"
  | "horizonMonths";

export interface SlotDefinition {
  key: SlotKey;
  required: boolean;
  /** Lower = asked sooner. Required slots come first by convention. */
  priority: number;
  /** The default question text the bot can fall back on if the LLM is offline. */
  fallbackQuestion: string;
  /** Quick-reply chips presented with the fallback question. */
  fallbackChips?: string[];
  /** Which CalculatorInputs field(s) this slot fills. */
  fields: (keyof CalculatorInputs)[];
}

export const SLOT_DEFS: Record<SlotKey, SlotDefinition> = {
  useCase: {
    key: "useCase",
    required: true,
    priority: 1,
    fallbackQuestion:
      "What are you thinking of using AI for? Tell me in your own words — replace a role, speed up a team, prevent costly errors, anything.",
    fallbackChips: [
      "Replace our support tier",
      "Speed up our ops team",
      "Prevent claims processing errors",
    ],
    fields: ["useCase", "industry"],
  },
  currentHeadcount: {
    key: "currentHeadcount",
    required: true,
    priority: 2,
    fallbackQuestion:
      "How many people on your team handle this work today?",
    fallbackChips: ["1", "3", "5", "10+"],
    fields: ["teamSize", "employeeCount"],
  },
  avgSalary: {
    key: "avgSalary",
    required: true,
    priority: 3,
    fallbackQuestion:
      "What's a typical base salary for that role? (Loaded cost with benefits comes after — just the salary.)",
    fallbackChips: ["$50K", "$65K", "$85K", "$120K"],
    fields: ["employeeSalary", "teamAvgSalary", "avoidedHireSalary"],
  },
  aiBuildCost: {
    key: "aiBuildCost",
    required: true,
    priority: 4,
    fallbackQuestion:
      "Roughly what do you expect the AI build to cost? If you don't know, I can use a typical mid-market range of $60–120K.",
    fallbackChips: ["$40K", "$80K (typical)", "$150K", "Not sure"],
    fields: ["aiBuildCost", "aiMonthlyOpex"],
  },
  productivityGainPct: {
    key: "productivityGainPct",
    required: false,
    priority: 5,
    fallbackQuestion:
      "How much of their day goes to this work? AI typically reclaims 30–50% of that.",
    fallbackChips: ["20%", "40%", "60%", "Most of it"],
    fields: ["productivityGainPct"],
  },
  avoidedHire: {
    key: "avoidedHire",
    required: false,
    priority: 6,
    fallbackQuestion:
      "Would you have hired another person on this team in the next year if AI didn't handle the load?",
    fallbackChips: ["Yes, in ~6 months", "Yes, in ~12 months", "No"],
    fields: ["avoidedHireMonth", "avoidedHireSalary"],
  },
  errorCost: {
    key: "errorCost",
    required: false,
    priority: 7,
    fallbackQuestion:
      "Do errors or rework on this work cost real money today? Even a rough annual number helps.",
    fallbackChips: ["$25K/yr", "$100K/yr", "$500K/yr", "Negligible"],
    fields: ["annualErrorCost", "errorReductionPct"],
  },
  horizonMonths: {
    key: "horizonMonths",
    required: false,
    priority: 8,
    fallbackQuestion:
      "Over what time horizon should I model this? Most leaders use 24 months.",
    fallbackChips: ["12 months", "24 months", "36 months"],
    fields: ["horizonMonths"],
  },
};

const ORDERED: SlotDefinition[] = Object.values(SLOT_DEFS).sort((a, b) => a.priority - b.priority);

/**
 * Tracks which slots have been answered. We don't store the raw answer here —
 * the answers go directly into the partial CalculatorInputs. We just flip a
 * boolean so the bot knows what's been asked.
 */
export type FilledSlots = Partial<Record<SlotKey, boolean>>;

export function getNextSlot(filled: FilledSlots): SlotDefinition | null {
  return ORDERED.find((s) => !filled[s.key]) ?? null;
}

/** True once all required slots are filled. */
export function isReadyForDashboard(filled: FilledSlots): boolean {
  return ORDERED.filter((s) => s.required).every((s) => filled[s.key]);
}

/**
 * Given a partial CalculatorInputs collected from chat, fill any missing
 * fields with sensible defaults so the projection math never sees NaN.
 *
 * Also derives fields the chat doesn't directly ask about (e.g. aiMonthlyOpex
 * is roughly 10% of build cost / 12).
 */
export function applyBenchmarks(partial: Partial<CalculatorInputs>): CalculatorInputs {
  const merged: CalculatorInputs = { ...DEFAULT_INPUTS, ...partial };

  // Use case "halo" defaults: bump productivity gain higher for clearly automatable use cases.
  const uc = (merged.useCase || "").toLowerCase();
  if (!("productivityGainPct" in partial) || partial.productivityGainPct === undefined) {
    if (/support|ticket|inbox/.test(uc)) merged.productivityGainPct = 0.4;
    else if (/data\s*entry|report|reconcil/.test(uc)) merged.productivityGainPct = 0.55;
    else if (/claim|underwrit|review/.test(uc)) merged.productivityGainPct = 0.35;
  }

  // Maintenance opex defaults to ~10% of build cost spread monthly, unless user gave us a number.
  if (!("aiMonthlyOpex" in partial) || partial.aiMonthlyOpex === undefined) {
    merged.aiMonthlyOpex = Math.round((merged.aiBuildCost * 0.10) / 12);
  }

  // If a single salary was provided via avgSalary slot, propagate to all roles.
  if (partial.employeeSalary !== undefined) {
    if (merged.teamAvgSalary === DEFAULT_INPUTS.teamAvgSalary) merged.teamAvgSalary = partial.employeeSalary;
    if (merged.avoidedHireSalary === DEFAULT_INPUTS.avoidedHireSalary) merged.avoidedHireSalary = partial.employeeSalary;
  }

  // If headcount was given but teamSize wasn't, mirror it.
  if (partial.employeeCount !== undefined && partial.teamSize === undefined) {
    merged.teamSize = partial.employeeCount;
  }

  // Sanitize: clamp percents into [0, 1], non-negative everything that should be.
  merged.productivityGainPct = clamp01(merged.productivityGainPct);
  merged.errorReductionPct = clamp01(merged.errorReductionPct);
  merged.aiMaintenanceFTE = clamp01(merged.aiMaintenanceFTE);
  merged.benefitsMultiplier = Math.max(1, merged.benefitsMultiplier);
  merged.horizonMonths = Math.max(1, Math.floor(merged.horizonMonths));
  merged.aiBuildCost = Math.max(0, merged.aiBuildCost);
  merged.aiMonthlyOpex = Math.max(0, merged.aiMonthlyOpex);

  return merged;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Given values the LLM extracted into `slotUpdates`, derive which SlotKeys are
 * now considered "answered". The LLM extracts at the field level (e.g. `teamSize`)
 * but we track at the slot level.
 */
export function filledSlotsFrom(partial: Partial<CalculatorInputs>): FilledSlots {
  const out: FilledSlots = {};
  for (const def of Object.values(SLOT_DEFS)) {
    if (def.fields.some((f) => partial[f] !== undefined)) {
      out[def.key] = true;
    }
  }
  // useCase is only "filled" if the actual text is non-empty
  if (out.useCase && !(partial.useCase && partial.useCase.trim().length > 0)) {
    out.useCase = false;
  }
  return out;
}
