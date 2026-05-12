import type { CalculatorInputs, ScenarioKey } from "@/types/inputs";
import type { DailyPoint, Projection, ScenarioResult, Summary } from "@/types/results";

const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

export function dailyEmployeeCost(annualSalary: number, benefitsMultiplier: number): number {
  return (annualSalary * benefitsMultiplier) / DAYS_PER_YEAR;
}

export function dailyAIRunCost(
  monthlyOpex: number,
  maintFTE: number,
  refSalary: number,
  benefitsMultiplier: number,
): number {
  // Build cost is amortized separately as a one-time day-0 capex. This is the recurring run cost.
  return (monthlyOpex * 12) / DAYS_PER_YEAR + maintFTE * dailyEmployeeCost(refSalary, benefitsMultiplier);
}

export function rampFactor(day: number, rampUpDays: number): number {
  if (rampUpDays <= 0) return 1;
  return Math.min(1, day / rampUpDays);
}

interface ScenarioDailyFn {
  (day: number, inputs: CalculatorInputs): number;
}

const replaceDaily: ScenarioDailyFn = (day, i) => {
  const ramp = rampFactor(day, i.rampUpDays);
  return ramp * dailyEmployeeCost(i.employeeSalary, i.benefitsMultiplier) * i.employeeCount;
};

const augmentDaily: ScenarioDailyFn = (day, i) => {
  const ramp = rampFactor(day, i.rampUpDays);
  return ramp * i.productivityGainPct * i.teamSize * dailyEmployeeCost(i.teamAvgSalary, i.benefitsMultiplier);
};

const avoidHireDaily: ScenarioDailyFn = (day, i) => {
  const startDay = i.avoidedHireMonth * DAYS_PER_MONTH;
  if (day < startDay) return 0;
  return dailyEmployeeCost(i.avoidedHireSalary, i.benefitsMultiplier);
};

const errorReductionDaily: ScenarioDailyFn = (day, i) => {
  const ramp = rampFactor(day, i.rampUpDays);
  return ramp * (i.annualErrorCost * i.errorReductionPct) / DAYS_PER_YEAR;
};

const SCENARIO_FNS: Record<ScenarioKey, ScenarioDailyFn> = {
  replace: replaceDaily,
  augment: augmentDaily,
  avoidHire: avoidHireDaily,
  errorReduction: errorReductionDaily,
};

const SCENARIO_KEYS: ScenarioKey[] = ["replace", "augment", "avoidHire", "errorReduction"];

export function computeProjection(inputs: CalculatorInputs): Projection {
  const horizonDays = Math.max(0, Math.floor(inputs.horizonMonths * DAYS_PER_MONTH));

  if (horizonDays === 0) {
    return {
      daily: [],
      perScenario: emptyScenarioResults(),
      summary: {
        breakEvenDay: null,
        oneYearROI: 0,
        threeYearROI: 0,
        npv: 0,
        totalAICost: 0,
        totalSavings: 0,
        horizonDays: 0,
      },
    };
  }

  const dailyAIRun = dailyAIRunCost(
    inputs.aiMonthlyOpex,
    inputs.aiMaintenanceFTE,
    inputs.employeeSalary,
    inputs.benefitsMultiplier,
  );
  const dailyEmployeeBase = dailyEmployeeCost(inputs.employeeSalary, inputs.benefitsMultiplier) * inputs.employeeCount;

  const daily: DailyPoint[] = [];
  const perScenarioCumTotals: Record<ScenarioKey, number> = {
    replace: 0, augment: 0, avoidHire: 0, errorReduction: 0,
  };
  let cumulativeEmployeeCost = 0;
  let cumulativeAICost = inputs.aiBuildCost; // build cost paid up front
  let cumulativeSavings = 0;
  let breakEvenDay: number | null = null;
  let npv = 0;

  for (let day = 1; day <= horizonDays; day++) {
    cumulativeEmployeeCost += dailyEmployeeBase;
    cumulativeAICost += dailyAIRun;

    let daySavings = 0;
    for (const key of SCENARIO_KEYS) {
      if (!inputs.toggles[key]) continue;
      const v = SCENARIO_FNS[key](day, inputs);
      perScenarioCumTotals[key] += v;
      daySavings += v;
    }
    cumulativeSavings += daySavings;

    // NPV — discount net cashflow (savings - aiRun) for this day, plus day-1 build outflow once.
    const netDayCashflow = daySavings - dailyAIRun - (day === 1 ? inputs.aiBuildCost : 0);
    const discount = Math.pow(1 + inputs.discountRateAnnual, day / DAYS_PER_YEAR);
    npv += netDayCashflow / discount;

    if (breakEvenDay === null && cumulativeSavings >= cumulativeAICost) {
      breakEvenDay = day;
    }

    daily.push({
      day,
      cumulativeEmployeeCost,
      cumulativeAICost,
      cumulativeSavings,
      perScenarioCumulative: { ...perScenarioCumTotals },
    });
  }

  const perScenario = buildPerScenarioResults(inputs, horizonDays);

  const oneYearROI = roiAtDay(daily, Math.min(DAYS_PER_YEAR, horizonDays));
  const threeYearROI = roiAtDay(daily, Math.min(DAYS_PER_YEAR * 3, horizonDays));

  const summary: Summary = {
    breakEvenDay,
    oneYearROI,
    threeYearROI,
    npv,
    totalAICost: cumulativeAICost,
    totalSavings: cumulativeSavings,
    horizonDays,
  };

  return { daily, perScenario, summary };
}

function roiAtDay(daily: DailyPoint[], targetDay: number): number {
  if (targetDay <= 0 || daily.length === 0) return 0;
  const idx = Math.min(targetDay, daily.length) - 1;
  const point = daily[idx];
  if (point.cumulativeAICost === 0) return 0;
  return (point.cumulativeSavings - point.cumulativeAICost) / point.cumulativeAICost;
}

function buildPerScenarioResults(inputs: CalculatorInputs, horizonDays: number): Record<ScenarioKey, ScenarioResult> {
  const out = {} as Record<ScenarioKey, ScenarioResult>;
  for (const key of SCENARIO_KEYS) {
    const enabled = inputs.toggles[key];
    let oneYear = 0;
    let threeYear = 0;
    let total = 0;
    if (enabled) {
      const oneYearLimit = Math.min(DAYS_PER_YEAR, horizonDays);
      const threeYearLimit = Math.min(DAYS_PER_YEAR * 3, horizonDays);
      for (let d = 1; d <= horizonDays; d++) {
        const v = SCENARIO_FNS[key](d, inputs);
        total += v;
        if (d <= oneYearLimit) oneYear += v;
        if (d <= threeYearLimit) threeYear += v;
      }
    }
    out[key] = {
      enabled,
      oneYearSavings: oneYear,
      threeYearSavings: threeYear,
      totalHorizonSavings: total,
    };
  }
  return out;
}

function emptyScenarioResults(): Record<ScenarioKey, ScenarioResult> {
  return {
    replace: { enabled: false, oneYearSavings: 0, threeYearSavings: 0, totalHorizonSavings: 0 },
    augment: { enabled: false, oneYearSavings: 0, threeYearSavings: 0, totalHorizonSavings: 0 },
    avoidHire: { enabled: false, oneYearSavings: 0, threeYearSavings: 0, totalHorizonSavings: 0 },
    errorReduction: { enabled: false, oneYearSavings: 0, threeYearSavings: 0, totalHorizonSavings: 0 },
  };
}
