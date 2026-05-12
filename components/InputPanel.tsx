"use client";
import { useState } from "react";
import type { CalculatorInputs, ScenarioKey } from "@/types/inputs";
import type { Projection } from "@/types/results";
import { NumberField } from "./inputs/NumberField";
import { PercentSlider } from "./inputs/PercentSlider";
import { ScenarioToggleCard } from "./inputs/ScenarioToggleCard";
import { formatUSDCompact } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface Props {
  inputs: CalculatorInputs;
  onChange: (next: CalculatorInputs) => void;
  projection: Projection;
}

type Section = "scenarios" | "ai" | "team" | "errors" | "horizon";
const SECTIONS: { id: Section; label: string }[] = [
  { id: "scenarios", label: "Scenarios" },
  { id: "ai", label: "AI cost" },
  { id: "team", label: "Team" },
  { id: "errors", label: "Errors" },
  { id: "horizon", label: "Horizon" },
];

export function InputPanel({ inputs, onChange, projection }: Props) {
  const [active, setActive] = useState<Section>("scenarios");

  const set = <K extends keyof CalculatorInputs>(k: K, v: CalculatorInputs[K]) =>
    onChange({ ...inputs, [k]: v });

  const setToggle = (k: ScenarioKey, v: boolean) =>
    onChange({ ...inputs, toggles: { ...inputs.toggles, [k]: v } });

  return (
    <aside className="card-base lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto">
      <div className="border-b p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Inputs</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Adjust any value — the chart and playbook update live.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b p-2">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
              active === s.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-4">
        {active === "scenarios" && (
          <>
            <ScenarioToggleCard
              label="Replace 1 employee"
              description="Direct salary saved by AI taking over a role."
              enabled={inputs.toggles.replace}
              onToggle={(v) => setToggle("replace", v)}
              contribution={`Year 1: ${formatUSDCompact(projection.perScenario.replace.oneYearSavings)}`}
            />
            <ScenarioToggleCard
              label="Augment a team"
              description="% of manual work removed across the team."
              enabled={inputs.toggles.augment}
              onToggle={(v) => setToggle("augment", v)}
              contribution={`Year 1: ${formatUSDCompact(projection.perScenario.augment.oneYearSavings)}`}
            />
            <ScenarioToggleCard
              label="Avoid future hire"
              description="Headcount you don't add because AI handles the load."
              enabled={inputs.toggles.avoidHire}
              onToggle={(v) => setToggle("avoidHire", v)}
              contribution={`Year 1: ${formatUSDCompact(projection.perScenario.avoidHire.oneYearSavings)}`}
            />
            <ScenarioToggleCard
              label="Reduce error / rework"
              description="Operational error cost reduced by AI."
              enabled={inputs.toggles.errorReduction}
              onToggle={(v) => setToggle("errorReduction", v)}
              contribution={`Year 1: ${formatUSDCompact(projection.perScenario.errorReduction.oneYearSavings)}`}
            />
          </>
        )}

        {active === "ai" && (
          <>
            <NumberField
              label="AI build cost (one-time)"
              value={inputs.aiBuildCost}
              onChange={(n) => set("aiBuildCost", n)}
              prefix="$"
              step={1000}
              hint="Engineering, integration, and initial deployment."
            />
            <NumberField
              label="AI monthly opex"
              value={inputs.aiMonthlyOpex}
              onChange={(n) => set("aiMonthlyOpex", n)}
              prefix="$"
              step={100}
              hint="LLM API, hosting, observability."
            />
            <PercentSlider
              label="Maintenance FTE allocation"
              value={inputs.aiMaintenanceFTE}
              onChange={(n) => set("aiMaintenanceFTE", n)}
              max={1}
            />
          </>
        )}

        {active === "team" && (
          <>
            <NumberField
              label="Replace: salary"
              value={inputs.employeeSalary}
              onChange={(n) => set("employeeSalary", n)}
              prefix="$"
              step={5000}
            />
            <NumberField
              label="Replace: count"
              value={inputs.employeeCount}
              onChange={(n) => set("employeeCount", n)}
              min={0}
              step={1}
            />
            <NumberField
              label="Benefits multiplier"
              value={inputs.benefitsMultiplier}
              onChange={(n) => set("benefitsMultiplier", n)}
              step={0.05}
              hint="1.3–1.5x typical (taxes, benefits, overhead)."
            />
            <div className="pt-2 border-t">
              <NumberField
                label="Augment: team size"
                value={inputs.teamSize}
                onChange={(n) => set("teamSize", n)}
                step={1}
              />
              <NumberField
                label="Augment: avg salary"
                value={inputs.teamAvgSalary}
                onChange={(n) => set("teamAvgSalary", n)}
                prefix="$"
                step={5000}
                className="mt-3"
              />
              <PercentSlider
                label="Productivity gained"
                value={inputs.productivityGainPct}
                onChange={(n) => set("productivityGainPct", n)}
              />
            </div>
            <div className="pt-2 border-t">
              <NumberField
                label="Avoided hire: salary"
                value={inputs.avoidedHireSalary}
                onChange={(n) => set("avoidedHireSalary", n)}
                prefix="$"
                step={5000}
              />
              <NumberField
                label="Avoided hire: month"
                value={inputs.avoidedHireMonth}
                onChange={(n) => set("avoidedHireMonth", n)}
                min={0}
                max={inputs.horizonMonths}
                step={1}
                className="mt-3"
              />
            </div>
          </>
        )}

        {active === "errors" && (
          <>
            <NumberField
              label="Annual error / rework cost"
              value={inputs.annualErrorCost}
              onChange={(n) => set("annualErrorCost", n)}
              prefix="$"
              step={5000}
              hint="Cost of mistakes today (rework, refunds, escalations)."
            />
            <PercentSlider
              label="Reduction from AI"
              value={inputs.errorReductionPct}
              onChange={(n) => set("errorReductionPct", n)}
            />
          </>
        )}

        {active === "horizon" && (
          <>
            <NumberField
              label="Horizon (months)"
              value={inputs.horizonMonths}
              onChange={(n) => set("horizonMonths", Math.max(0, Math.floor(n)))}
              min={0}
              max={60}
              step={1}
            />
            <NumberField
              label="Ramp-up days"
              value={inputs.rampUpDays}
              onChange={(n) => set("rampUpDays", Math.max(0, Math.floor(n)))}
              min={0}
              step={5}
              hint="Days until AI hits steady-state value."
            />
            <PercentSlider
              label="Discount rate (annual)"
              value={inputs.discountRateAnnual}
              onChange={(n) => set("discountRateAnnual", n)}
              max={0.3}
            />
            <NumberField
              label="Industry"
              value={0}
              onChange={() => {}}
              className="hidden"
            />
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground/80">Industry</span>
              <input
                className="input-base"
                value={inputs.industry}
                onChange={(e) => set("industry", e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground/80">Use case</span>
              <textarea
                className="input-base h-20 py-2"
                value={inputs.useCase}
                onChange={(e) => set("useCase", e.target.value)}
              />
            </label>
          </>
        )}
      </div>
    </aside>
  );
}
