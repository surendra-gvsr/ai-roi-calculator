import type { ScenarioKey } from "./inputs";

export interface DailyPoint {
  day: number;
  cumulativeEmployeeCost: number;
  cumulativeAICost: number;
  cumulativeSavings: number;
  perScenarioCumulative: Record<ScenarioKey, number>;
}

export interface ScenarioResult {
  enabled: boolean;
  oneYearSavings: number;
  threeYearSavings: number;
  totalHorizonSavings: number;
}

export interface Summary {
  breakEvenDay: number | null;
  oneYearROI: number;
  threeYearROI: number;
  npv: number;
  totalAICost: number;
  totalSavings: number;
  horizonDays: number;
}

export interface Projection {
  daily: DailyPoint[];
  perScenario: Record<ScenarioKey, ScenarioResult>;
  summary: Summary;
}
