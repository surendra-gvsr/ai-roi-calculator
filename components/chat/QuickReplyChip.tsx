"use client";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  onClick: () => void;
  disabled?: boolean;
}

export function QuickReplyChip({ text, onClick, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full border border-input bg-card px-3 py-1.5 text-xs font-medium",
        "transition-all hover:border-primary hover:bg-secondary hover:shadow-sm",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {text}
    </button>
  );
}
