import { describe, expect, it } from "vitest";
import { computeProjection, dailyEmployeeCost } from "./calculations";
import { DEFAULT_INPUTS } from "@/types/inputs";

describe("dailyEmployeeCost", () => {
  it("computes loaded daily cost", () => {
    expect(dailyEmployeeCost(60_000, 1.4)).toBeCloseTo(230.137, 2);
  });
});

describe("computeProjection — replace-only scenario", () => {
  const inputs = {
    ...DEFAULT_INPUTS,
    toggles: { replace: true, augment: false, avoidHire: false, errorReduction: false },
  };

  it("produces a daily array of length horizonMonths * 30", () => {
    const p = computeProjection(inputs);
    expect(p.daily.length).toBe(inputs.horizonMonths * 30);
  });

  it("finds a break-even day within the horizon for default replace inputs", () => {
    const p = computeProjection(inputs);
    expect(p.summary.breakEvenDay).not.toBeNull();
    expect(p.summary.breakEvenDay!).toBeGreaterThan(60);
    expect(p.summary.breakEvenDay!).toBeLessThan(720);
  });
});

describe("computeProjection — LinkedIn-post replication", () => {
  it("augment(productivityGain=0.286, team=3, salary=60K, benefits=1.4) yields ~$72K year 1 freed labor (post-ramp)", () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      productivityGainPct: 0.286,
      teamSize: 3,
      teamAvgSalary: 60_000,
      benefitsMultiplier: 1.4,
      rampUpDays: 0, // post implies steady-state
      toggles: { replace: false, augment: true, avoidHire: false, errorReduction: false },
    };
    const p = computeProjection(inputs);
    expect(p.perScenario.augment.oneYearSavings).toBeGreaterThan(70_000);
    expect(p.perScenario.augment.oneYearSavings).toBeLessThan(74_000);
  });

  it("avoidHire at month 6, $60K salary, 1.4x — contributes ~$126K over remaining 18 months", () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      avoidedHireMonth: 6,
      avoidedHireSalary: 60_000,
      benefitsMultiplier: 1.4,
      horizonMonths: 24,
      toggles: { replace: false, augment: false, avoidHire: true, errorReduction: false },
    };
    const p = computeProjection(inputs);
    // 18 months ≈ 540 days × 230.137 = $124,274 (within tolerance)
    expect(p.perScenario.avoidHire.totalHorizonSavings).toBeGreaterThan(120_000);
    expect(p.perScenario.avoidHire.totalHorizonSavings).toBeLessThan(128_000);
  });
});

describe("computeProjection — edge cases", () => {
  it("horizonMonths=0 returns empty daily array and zeroed summary, no NaN", () => {
    const p = computeProjection({ ...DEFAULT_INPUTS, horizonMonths: 0 });
    expect(p.daily).toEqual([]);
    expect(p.summary.totalSavings).toBe(0);
    expect(p.summary.totalAICost).toBe(0);
    expect(Number.isFinite(p.summary.npv)).toBe(true);
    expect(Number.isFinite(p.summary.oneYearROI)).toBe(true);
  });

  it("all toggles off → zero savings, AI build still spent", () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      toggles: { replace: false, augment: false, avoidHire: false, errorReduction: false },
    };
    const p = computeProjection(inputs);
    expect(p.summary.totalSavings).toBe(0);
    expect(p.summary.totalAICost).toBeGreaterThan(inputs.aiBuildCost);
    expect(p.summary.breakEvenDay).toBeNull();
  });

  it("monotonic cumulative: each daily point is >= previous", () => {
    const p = computeProjection(DEFAULT_INPUTS);
    for (let i = 1; i < p.daily.length; i++) {
      expect(p.daily[i].cumulativeEmployeeCost).toBeGreaterThanOrEqual(p.daily[i - 1].cumulativeEmployeeCost);
      expect(p.daily[i].cumulativeAICost).toBeGreaterThanOrEqual(p.daily[i - 1].cumulativeAICost);
      expect(p.daily[i].cumulativeSavings).toBeGreaterThanOrEqual(p.daily[i - 1].cumulativeSavings);
    }
  });
});
