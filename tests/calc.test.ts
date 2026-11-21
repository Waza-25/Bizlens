import { describe, expect, it } from "vitest";
import { grossProfit, linesTotal, round2, weightedAverageCost } from "@/lib/calc";

describe("weightedAverageCost", () => {
  it("averages 10 @ K40 with 10 @ K50 to K45", () => {
    expect(weightedAverageCost(10, 40, 10, 50)).toBe(45);
  });

  it("uses the incoming cost when there is no stock yet", () => {
    expect(weightedAverageCost(0, 0, 8, 12.5)).toBe(12.5);
  });

  it("keeps 4 decimal places", () => {
    expect(weightedAverageCost(3, 10, 4, 11)).toBe(10.5714);
  });
});

describe("linesTotal", () => {
  it("adds quantity x price for each line", () => {
    expect(linesTotal([{ quantity: 5, price: 60 }, { quantity: 2, price: 7.25 }])).toBe(314.5);
  });

  it("is zero for no lines", () => {
    expect(linesTotal([])).toBe(0);
  });
});

describe("grossProfit", () => {
  it("matches the blueprint example: sales K300, cost K225", () => {
    expect(grossProfit(300, 225)).toEqual({ profit: 75, margin: 25 });
  });

  it("has no margin when there are no sales", () => {
    expect(grossProfit(0, 0)).toEqual({ profit: 0, margin: null });
  });
});

describe("round2", () => {
  it("rounds half up for money", () => {
    expect(round2(1.005)).toBe(1.01);
  });
});
