"use client";
import { useState } from "react";
import type { Playbook } from "@/types/playbook";
import type { CalculatorInputs } from "@/types/inputs";
import type { Summary } from "@/types/results";
import { formatUSDCompact } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface Props {
  inputs: CalculatorInputs;
  summary: Summary;
}

export function PlaybookView({ inputs, summary }: Props) {
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);

  async function generate(useMock = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/playbook${useMock ? "?mock=1" : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, summary }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      setPlaybook(data.playbook);
      setSource(data.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-base">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b p-4">
        <div>
          <h3 className="text-base font-semibold">Day-by-day implementation playbook</h3>
          <p className="text-xs text-muted-foreground">
            AI-generated rollout: Week 1 → Month 6+, with cost, owner, and risks per phase.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => generate(true)}
            disabled={loading}
          >
            Use sample
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => generate(false)}
            disabled={loading}
          >
            {loading ? "Generating…" : playbook ? "Regenerate" : "Generate playbook"}
          </button>
        </div>
      </div>

      <div className="p-4">
        {!playbook && !error && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Click <span className="font-medium text-foreground">Generate playbook</span> to produce a phased rollout
            tailored to your industry, team size, and budget — or click <span className="font-medium text-foreground">Use sample</span> to preview without an API call.
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <div className="font-medium">Couldn&apos;t generate the playbook</div>
            <div className="mt-1 text-xs opacity-80">{error}</div>
            <button className="btn-ghost mt-2" onClick={() => generate(true)}>
              Show sample instead
            </button>
          </div>
        )}
        {playbook && (
          <>
            <div className="mb-4 rounded-lg border bg-secondary/30 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Executive summary {source === "mock" && <span className="ml-1 text-amber-600">(sample)</span>}
              </div>
              <p className="mt-1 text-sm">{playbook.summary}</p>
            </div>

            <ol className="space-y-3">
              {playbook.phases.map((phase, idx) => (
                <li key={phase.id} className="card-base p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-sm font-semibold">{phase.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {phase.timeframe} · Owner: {phase.owner}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">
                      {formatUSDCompact(phase.estCost)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground/80">{phase.objective}</p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {phase.actions.map((a, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <div className="rounded-md bg-emerald-50 p-2 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
                      <div className="font-medium">Deliverable</div>
                      <div>{phase.deliverable}</div>
                    </div>
                    {phase.risks.length > 0 && (
                      <div className="rounded-md bg-rose-50 p-2 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                        <div className="font-medium">Risks</div>
                        <ul>
                          {phase.risks.map((r, i) => (
                            <li key={i}>· {r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="card-base p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Success metrics</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {playbook.successMetrics.map((m, i) => (
                    <li key={i} className={cn("flex gap-2")}>
                      <span className="text-emerald-600">✓</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card-base p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Top program risks</div>
                <ul className="mt-2 space-y-1 text-sm">
                  {playbook.topRisks.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-amber-600">!</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
