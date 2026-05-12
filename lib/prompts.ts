import type { CalculatorInputs } from "@/types/inputs";
import type { Summary } from "@/types/results";
import type { ChatMessage } from "@/types/chat";
import { SLOT_DEFS, type SlotKey } from "./slots";

export function buildPlaybookPrompt(inputs: CalculatorInputs, summary: Summary): string {
  const enabledScenarios = Object.entries(inputs.toggles)
    .filter(([, on]) => on)
    .map(([k]) => k);

  return `You are an AI implementation strategist for mid-market companies.

A decision-maker has modeled the following scenario and wants a phased rollout playbook to capture the projected ROI.

## Inputs
- Industry: ${inputs.industry}
- Use case: ${inputs.useCase}
- AI build cost (one-time): $${inputs.aiBuildCost.toLocaleString()}
- AI monthly opex: $${inputs.aiMonthlyOpex.toLocaleString()}
- AI maintenance FTE: ${inputs.aiMaintenanceFTE}
- Team size affected: ${inputs.teamSize}
- Avg loaded salary (benefits ${inputs.benefitsMultiplier}x): $${Math.round(inputs.teamAvgSalary * inputs.benefitsMultiplier).toLocaleString()}
- Productivity gain target: ${(inputs.productivityGainPct * 100).toFixed(0)}%
- Avoided hire planned at month ${inputs.avoidedHireMonth}
- Annual error cost baseline: $${inputs.annualErrorCost.toLocaleString()} (target reduction ${(inputs.errorReductionPct * 100).toFixed(0)}%)
- Horizon: ${inputs.horizonMonths} months
- Enabled scenarios: ${enabledScenarios.join(", ")}

## Computed projections
- Total AI cost over horizon: $${Math.round(summary.totalAICost).toLocaleString()}
- Total savings over horizon: $${Math.round(summary.totalSavings).toLocaleString()}
- Break-even: ${summary.breakEvenDay !== null ? `Day ${summary.breakEvenDay}` : "Not within horizon"}
- Year-1 ROI: ${(summary.oneYearROI * 100).toFixed(1)}%
- Year-3 ROI: ${(summary.threeYearROI * 100).toFixed(1)}%

## Task
Generate a 6–8 phase rollout playbook starting from Week 1 and progressing through Month 6+. Each phase must include:
- timeframe (e.g. "Week 1", "Week 2", "Month 2", "Month 3", "Month 4", "Month 6")
- title (concise action-oriented heading)
- objective (one sentence)
- actions (3–6 concrete steps)
- deliverable (what exists at the end of the phase)
- estCost in USD (sum of contractor/cloud/tooling for that phase only — phases should sum to roughly the AI build cost above)
- owner (a role, e.g. "Ops Lead", "Engineering")
- risks (1–3 specific risks)

Also include:
- successMetrics: 3–5 measurable outcomes to track
- topRisks: 2–4 program-level risks
- summary: 2–3 sentence executive summary

Output ONLY a JSON object matching the schema. No prose, no markdown, no preamble.`;
}

// ---- Chat (onboarding + sidebar) ----

const PERSONA = `You are a pragmatic AI ROI strategist talking with a business decision-maker. You're direct, numbers-driven, and you've seen this play out 100 times. You believe AI isn't a cost — it's leverage. You help executives stop asking "can AI replace one employee?" and start asking "where does AI compound value across my team?".`;

const HERO_RULES = `RULES (onboarding phase):
1. Ask ONE focused question per turn. Never ask 2 things at once.
2. Stay under 60 words.
3. Extract any numbers the user mentioned in their last message into slotUpdates — even if they answered a different question than asked.
4. If the user says "I don't know" or similar, offer an industry benchmark with a cited range, then suggest the median as the value to use.
5. Output suggestedChips (2-4 short tappable answers) every turn except the very last.
6. Set done=true ONLY after you have values for: useCase, currentHeadcount (teamSize or employeeCount), avgSalary (employeeSalary or teamAvgSalary), aiBuildCost. Once done=true, your "message" should be a one-line handoff like "Got it — pulling up your projection now."
7. Output ONLY a JSON object matching the schema.`;

const SIDEBAR_RULES = `RULES (dashboard sidebar):
1. The dashboard is now visible. The user can see their numbers.
2. They may ask "what if" questions ("what if we hire 2 instead?") or want to refine values.
3. When the user gives a new value, extract it into slotUpdates so the dashboard re-renders.
4. You can answer questions about the chart (break-even, ROI). Keep answers under 80 words.
5. Always include slotUpdates as an empty object if the user is just asking a question (don't fabricate updates).
6. Set done=true only if the user explicitly says they're finished. Otherwise leave it false.
7. Output ONLY a JSON object matching the schema.`;

function formatSlotState(filled: Partial<CalculatorInputs>): string {
  if (Object.keys(filled).length === 0) return "  (nothing collected yet)";
  return Object.entries(filled)
    .map(([k, v]) => `  - ${k}: ${JSON.stringify(v)}`)
    .join("\n");
}

function formatNextSlot(nextSlotKey: SlotKey | null): string {
  if (!nextSlotKey) return "(all required slots filled — confirm you're ready to show the dashboard)";
  const def = SLOT_DEFS[nextSlotKey];
  return `${nextSlotKey} — ${def.fallbackQuestion}`;
}

function formatHistory(messages: ChatMessage[]): string {
  // Last 12 turns only, to bound token usage.
  const recent = messages.slice(-12);
  if (recent.length === 0) return "  (no messages yet — write the opening question)";
  return recent.map((m) => `  ${m.role.toUpperCase()}: ${m.content}`).join("\n");
}

export function buildChatPrompt(args: {
  messages: ChatMessage[];
  filledSlots: Partial<CalculatorInputs>;
  nextSlotKey: SlotKey | null;
  variant: "hero" | "sidebar";
}): string {
  const { messages, filledSlots, nextSlotKey, variant } = args;
  const rules = variant === "hero" ? HERO_RULES : SIDEBAR_RULES;

  return `${PERSONA}

${rules}

## What you already know about this user's situation:
${formatSlotState(filledSlots)}

## Next slot to fill (during onboarding):
${formatNextSlot(nextSlotKey)}

## Conversation history (last 12 turns):
${formatHistory(messages)}

Now respond to the user's most recent message. Return ONLY the JSON object.`;
}
