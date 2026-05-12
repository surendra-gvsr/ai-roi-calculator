"use client";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  contribution?: string;
}

export function ScenarioToggleCard({ label, description, enabled, onToggle, contribution }: Props) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className={cn(
        "flex w-full flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
        enabled ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50",
      )}
      aria-pressed={enabled}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span
          className={cn(
            "h-4 w-7 rounded-full transition-colors relative",
            enabled ? "bg-primary" : "bg-secondary",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-3 w-3 rounded-full bg-background shadow transition-all",
              enabled ? "left-3.5" : "left-0.5",
            )}
          />
        </span>
      </div>
      <span className="text-[11px] text-muted-foreground">{description}</span>
      {contribution && (
        <span className="mt-1 text-xs font-medium text-foreground/70">{contribution}</span>
      )}
    </button>
  );
}
