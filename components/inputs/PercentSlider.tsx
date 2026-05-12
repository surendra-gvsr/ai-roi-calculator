"use client";

interface Props {
  label: string;
  value: number; // 0..1
  onChange: (n: number) => void;
  min?: number; // 0..1
  max?: number; // 0..1
  step?: number;
}

export function PercentSlider({ label, value, onChange, min = 0, max = 1, step = 0.01 }: Props) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between text-xs font-medium text-foreground/80">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">{(value * 100).toFixed(0)}%</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
      />
    </label>
  );
}
