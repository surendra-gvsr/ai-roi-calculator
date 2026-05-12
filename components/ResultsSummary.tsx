"use client";
import type { Summary } from "@/types/results";
import { formatPercent, formatUSDCompact } from "@/lib/formatters";

interface Props {
  summary: Summary;
}

function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneCls =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : "text-foreground";
  return (
    <div className="card-base p-4">
      <div className="stat-label">{label}</div>
      <div className={`stat-value mt-1 ${toneCls}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function formatBreakEven(day: number | null): { value: string; sub: string } {
  if (day === null) return { value: "—", sub: "Not within horizon" };
  if (day < 30) return { value: `Day ${day}`, sub: "Less than a month" };
  const months = day / 30;
  if (months < 12) return { value: `Month ${months.toFixed(1)}`, sub: `Day ${day}` };
  return { value: `Year ${(months / 12).toFixed(1)}`, sub: `Day ${day}` };
}

export function ResultsSummary({ summary }: Props) {
  const be = formatBreakEven(summary.breakEvenDay);
  const netGain = summary.totalSavings - summary.totalAICost;

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Break-even"
        value={be.value}
        sub={be.sub}
        tone={summary.breakEvenDay !== null ? "positive" : "negative"}
      />
      <StatCard
        label="1-year ROI"
        value={formatPercent(summary.oneYearROI)}
        sub={summary.oneYearROI > 0 ? "Net positive at 12 months" : "Still investing"}
        tone={summary.oneYearROI > 0 ? "positive" : "negative"}
      />
      <StatCard
        label="3-year ROI"
        value={formatPercent(summary.threeYearROI)}
        sub={`NPV ${formatUSDCompact(summary.npv)}`}
        tone={summary.threeYearROI > 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Net horizon gain"
        value={formatUSDCompact(netGain)}
        sub={`Savings ${formatUSDCompact(summary.totalSavings)} − AI cost ${formatUSDCompact(summary.totalAICost)}`}
        tone={netGain > 0 ? "positive" : "negative"}
      />
    </section>
  );
}
