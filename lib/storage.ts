import type { CalculatorInputs } from "@/types/inputs";

const KEY = "ai-roi-calculator:inputs:v1";

export function saveInputs(inputs: CalculatorInputs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(inputs));
  } catch {
    // ignore (private mode, quota, etc.)
  }
}

export function loadInputs(): CalculatorInputs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CalculatorInputs;
  } catch {
    return null;
  }
}

export function clearInputs(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
