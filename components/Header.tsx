"use client";
import { useEffect, useState } from "react";

interface Props {
  onReset: () => void;
}

export function Header({ onReset }: Props) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("ai-roi-theme") : null;
    const prefers = stored === "dark" || (stored === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(prefers);
    document.documentElement.classList.toggle("dark", prefers);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("ai-roi-theme", next ? "dark" : "light");
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">AI vs Employee ROI Calculator</h1>
          <p className="text-xs text-muted-foreground">
            Day-by-day cost burndown + phased rollout playbook for decision makers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={onReset}>
            Reset
          </button>
          <button className="btn-ghost" onClick={toggleTheme} aria-label="Toggle theme">
            {dark ? "Light" : "Dark"}
          </button>
        </div>
      </div>
    </header>
  );
}
