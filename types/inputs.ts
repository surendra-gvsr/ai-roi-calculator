export type ScenarioKey = "replace" | "augment" | "avoidHire" | "errorReduction";

export type ScenarioToggles = Record<ScenarioKey, boolean>;

export interface CalculatorInputs {
  // AI cost side
  aiBuildCost: number;
  aiMonthlyOpex: number;
  aiMaintenanceFTE: number;

  // Replace scenario
  employeeSalary: number;
  benefitsMultiplier: number;
  employeeCount: number;

  // Augment scenario
  productivityGainPct: number;
  teamSize: number;
  teamAvgSalary: number;

  // Avoid-hire scenario
  avoidedHireSalary: number;
  avoidedHireMonth: number;

  // Error reduction scenario
  annualErrorCost: number;
  errorReductionPct: number;

  // Horizon / discounting
  horizonMonths: number;
  discountRateAnnual: number;
  rampUpDays: number;

  // Industry context (used only by the LLM playbook generator)
  industry: string;
  useCase: string;

  toggles: ScenarioToggles;
}

export const DEFAULT_INPUTS: CalculatorInputs = {
  aiBuildCost: 80_000,
  aiMonthlyOpex: 2_000,
  aiMaintenanceFTE: 0.1,

  employeeSalary: 60_000,
  benefitsMultiplier: 1.4,
  employeeCount: 1,

  productivityGainPct: 0.4,
  teamSize: 3,
  teamAvgSalary: 60_000,

  avoidedHireSalary: 60_000,
  avoidedHireMonth: 6,

  annualErrorCost: 50_000,
  errorReductionPct: 0.6,

  horizonMonths: 24,
  discountRateAnnual: 0.1,
  rampUpDays: 60,

  industry: "Operations",
  useCase: "Automate manual data entry and reporting",

  toggles: {
    replace: true,
    augment: true,
    avoidHire: true,
    errorReduction: true,
  },
};
