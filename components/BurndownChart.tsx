"use client";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint, Summary } from "@/types/results";
import { formatUSDCompact } from "@/lib/formatters";

interface Props {
  daily: DailyPoint[];
  summary: Summary;
}

function dayTickFormatter(day: number): string {
  if (day === 0) return "Day 0";
  const months = day / 30;
  if (months < 12) return `M${months.toFixed(0)}`;
  return `Y${(months / 12).toFixed(1)}`;
}

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadItem[]; label?: number }) {
  if (!active || !payload?.length) return null;
  const day = label ?? 0;
  return (
    <div className="card-base p-3 text-xs shadow-lg">
      <div className="mb-1 font-medium">Day {day} · {(day / 30).toFixed(1)} months</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </span>
          <span className="font-medium tabular-nums">{formatUSDCompact(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
}

export function BurndownChart({ daily, summary }: Props) {
  // Down-sample to ~180 points for smooth rendering
  const targetPoints = 180;
  const stride = Math.max(1, Math.floor(daily.length / targetPoints));
  const sampled = daily.filter((_, i) => i % stride === 0 || i === daily.length - 1);

  return (
    <div className="card-base p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-semibold">Cumulative cost over time</h3>
          <p className="text-xs text-muted-foreground">
            Employee baseline vs. AI investment, day by day. Break-even shown where savings overtake AI cost.
          </p>
        </div>
      </div>
      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={sampled} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradEmployee" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-employee))" stopOpacity={0.45} />
                <stop offset="100%" stopColor="hsl(var(--chart-employee))" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradAI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-ai))" stopOpacity={0.45} />
                <stop offset="100%" stopColor="hsl(var(--chart-ai))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="day"
              tickFormatter={dayTickFormatter}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
            />
            <YAxis
              tickFormatter={(v) => formatUSDCompact(v)}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              stroke="hsl(var(--border))"
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "12px", paddingTop: 8 }} />
            <Area
              type="monotone"
              dataKey="cumulativeEmployeeCost"
              name="Keep employee (cumulative)"
              stroke="hsl(var(--chart-employee))"
              strokeWidth={2}
              fill="url(#gradEmployee)"
            />
            <Area
              type="monotone"
              dataKey="cumulativeAICost"
              name="AI cost (cumulative)"
              stroke="hsl(var(--chart-ai))"
              strokeWidth={2}
              fill="url(#gradAI)"
            />
            <Line
              type="monotone"
              dataKey="cumulativeSavings"
              name="Savings (cumulative)"
              stroke="hsl(var(--chart-savings))"
              strokeWidth={2.5}
              dot={false}
            />
            {summary.breakEvenDay !== null && (
              <ReferenceLine
                x={summary.breakEvenDay}
                stroke="hsl(var(--chart-savings))"
                strokeDasharray="4 4"
                label={{
                  value: `Break-even · Day ${summary.breakEvenDay}`,
                  position: "top",
                  fill: "hsl(var(--chart-savings))",
                  fontSize: 11,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
