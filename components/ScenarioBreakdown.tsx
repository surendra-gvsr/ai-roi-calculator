"use client";
import type { Projection } from "@/types/results";
import type { ScenarioKey } from "@/types/inputs";
import { formatUSDCompact } from "@/lib/formatters";

const ROW_LABELS: Record<ScenarioKey, { label: string; blurb: string }> = {
  replace: { label: "Replace 1 employee", blurb: "Salary saved by full role automation" },
  augment: { label: "Augment a team", blurb: "% of manual work removed × team cost" },
  avoidHire: { label: "Avoid future hire", blurb: "Headcount cost not added" },
  errorReduction: { label: "Reduce errors", blurb: "Operational rework cost prevented" },
};

const KEYS: ScenarioKey[] = ["replace", "augment", "avoidHire", "errorReduction"];

export function ScenarioBreakdown({ projection }: { projection: Projection }) {
  return (
    <div className="card-base overflow-hidden">
      <div className="border-b p-4">
        <h3 className="text-base font-semibold">Scenario contribution</h3>
        <p className="text-xs text-muted-foreground">How each lever stacks. Toggle them on the left to see ROI shift.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Scenario</th>
              <th className="px-4 py-2 text-right font-medium">Year 1</th>
              <th className="px-4 py-2 text-right font-medium">Year 3</th>
              <th className="px-4 py-2 text-right font-medium">Total horizon</th>
            </tr>
          </thead>
          <tbody>
            {KEYS.map((k) => {
              const r = projection.perScenario[k];
              const meta = ROW_LABELS[k];
              return (
                <tr
                  key={k}
                  className={`border-t ${r.enabled ? "" : "opacity-40"}`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">{meta.blurb}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatUSDCompact(r.oneYearSavings)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatUSDCompact(r.threeYearSavings)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatUSDCompact(r.totalHorizonSavings)}</td>
                </tr>
              );
            })}
            <tr className="border-t bg-secondary/40">
              <td className="px-4 py-3 font-semibold">Total</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold">
                {formatUSDCompact(KEYS.reduce((s, k) => s + (projection.perScenario[k].enabled ? projection.perScenario[k].oneYearSavings : 0), 0))}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold">
                {formatUSDCompact(KEYS.reduce((s, k) => s + (projection.perScenario[k].enabled ? projection.perScenario[k].threeYearSavings : 0), 0))}
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold">
                {formatUSDCompact(projection.summary.totalSavings)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
