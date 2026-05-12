import { describe, expect, it } from "vitest";
import {
  applyBenchmarks,
  filledSlotsFrom,
  getNextSlot,
  isReadyForDashboard,
  SLOT_DEFS,
} from "./slots";
import { DEFAULT_INPUTS } from "@/types/inputs";
import { computeProjection } from "./calculations";

describe("getNextSlot", () => {
  it("returns useCase first when nothing is filled", () => {
    expect(getNextSlot({})?.key).toBe("useCase");
  });

  it("returns null when all slots are filled", () => {
    const all = Object.fromEntries(Object.keys(SLOT_DEFS).map((k) => [k, true]));
    expect(getNextSlot(all)).toBeNull();
  });

  it("skips already-filled slots in priority order", () => {
    expect(getNextSlot({ useCase: true })?.key).toBe("currentHeadcount");
    expect(getNextSlot({ useCase: true, currentHeadcount: true })?.key).toBe("avgSalary");
  });
});

describe("isReadyForDashboard", () => {
  it("requires the 4 required slots to be filled", () => {
    expect(isReadyForDashboard({})).toBe(false);
    expect(isReadyForDashboard({ useCase: true })).toBe(false);
    expect(
      isReadyForDashboard({
        useCase: true,
        currentHeadcount: true,
        avgSalary: true,
        aiBuildCost: true,
      }),
    ).toBe(true);
  });

  it("does not require optional slots", () => {
    const ready = {
      useCase: true,
      currentHeadcount: true,
      avgSalary: true,
      aiBuildCost: true,
    };
    expect(isReadyForDashboard(ready)).toBe(true);
    // adding an optional doesn't change it
    expect(isReadyForDashboard({ ...ready, errorCost: true })).toBe(true);
  });
});

describe("applyBenchmarks", () => {
  it("returns a fully-typed CalculatorInputs from an empty partial", () => {
    const merged = applyBenchmarks({});
    expect(merged.aiBuildCost).toBe(DEFAULT_INPUTS.aiBuildCost);
    expect(merged.toggles).toEqual(DEFAULT_INPUTS.toggles);
  });

  it("derives aiMonthlyOpex as ~10% of build cost / 12 when not provided", () => {
    const merged = applyBenchmarks({ aiBuildCost: 120_000 });
    expect(merged.aiMonthlyOpex).toBeCloseTo(1000, 0); // 120K * 0.10 / 12 = 1000
  });

  it("propagates a single salary into team and avoided-hire roles when those weren't set", () => {
    const merged = applyBenchmarks({ employeeSalary: 80_000 });
    expect(merged.teamAvgSalary).toBe(80_000);
    expect(merged.avoidedHireSalary).toBe(80_000);
  });

  it("clamps percentages and never produces NaN", () => {
    const merged = applyBenchmarks({
      productivityGainPct: 1.5,
      errorReductionPct: -0.2,
      aiMaintenanceFTE: NaN,
      benefitsMultiplier: 0.5,
    });
    expect(merged.productivityGainPct).toBe(1);
    expect(merged.errorReductionPct).toBe(0);
    expect(merged.aiMaintenanceFTE).toBe(0);
    expect(merged.benefitsMultiplier).toBe(1); // clamped to >= 1
  });

  it("works as input to computeProjection without NaN", () => {
    const merged = applyBenchmarks({
      useCase: "Replace our support tier",
      employeeSalary: 65_000,
      employeeCount: 3,
      aiBuildCost: 80_000,
    });
    const p = computeProjection(merged);
    expect(Number.isFinite(p.summary.npv)).toBe(true);
    expect(Number.isFinite(p.summary.oneYearROI)).toBe(true);
    expect(p.daily.length).toBeGreaterThan(0);
  });

  it("bumps productivity gain higher for 'data entry / reporting' use cases", () => {
    const support = applyBenchmarks({ useCase: "Customer support inbox triage" });
    const dataEntry = applyBenchmarks({ useCase: "Manual data entry and reporting" });
    expect(dataEntry.productivityGainPct).toBeGreaterThan(support.productivityGainPct);
  });
});

describe("filledSlotsFrom", () => {
  it("marks slot useCase as filled only when text is non-empty", () => {
    expect(filledSlotsFrom({ useCase: "" }).useCase).toBeFalsy();
    expect(filledSlotsFrom({ useCase: "support team" }).useCase).toBe(true);
  });

  it("marks avgSalary slot from any of the three salary fields", () => {
    expect(filledSlotsFrom({ employeeSalary: 65_000 }).avgSalary).toBe(true);
    expect(filledSlotsFrom({ teamAvgSalary: 65_000 }).avgSalary).toBe(true);
  });

  it("marks currentHeadcount from teamSize or employeeCount", () => {
    expect(filledSlotsFrom({ teamSize: 3 }).currentHeadcount).toBe(true);
    expect(filledSlotsFrom({ employeeCount: 1 }).currentHeadcount).toBe(true);
  });

  it("after a realistic 4-turn extraction, isReadyForDashboard flips true", () => {
    const partial = {
      useCase: "Customer support",
      teamSize: 3,
      teamAvgSalary: 65_000,
      aiBuildCost: 80_000,
    };
    expect(isReadyForDashboard(filledSlotsFrom(partial))).toBe(true);
  });
});
