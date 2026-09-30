import { describe, expect, it } from "vitest";
import { runEvolution } from "@/lib/evolution";
import { payoffMatrix, runTournament } from "@/lib/game";

describe("ecological simulation", () => {
  it("keeps shares normalised every generation", () => {
    const { ids, matrix } = payoffMatrix(runTournament({ rounds: 50, repetitions: 1 }));
    const result = runEvolution(ids, matrix, 50);
    expect(result.shares).toHaveLength(51);
    for (const row of result.shares) {
      expect(row.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 9);
    }
  });

  it("reproduces Axelrod & Hamilton: defectors boom, then starve; reciprocators take over", () => {
    const ids = ["always-cooperate", "always-defect", "tit-for-tat"];
    const { matrix } = payoffMatrix(runTournament({ strategyIds: ids, rounds: 200, repetitions: 1 }));
    const result = runEvolution(ids, matrix, 300, { "always-cooperate": 1, "always-defect": 1, "tit-for-tat": 1 });
    const order = result.ids;
    const alld = order.indexOf("always-defect");
    const tft = order.indexOf("tit-for-tat");
    const peak = Math.max(...result.shares.map((row) => row[alld]));
    expect(peak).toBeGreaterThan(result.shares[0][alld]);
    expect(result.shares.at(-1)![alld]).toBe(0);
    expect(result.extinctAt["always-defect"]).toBeGreaterThan(0);
    expect(result.shares.at(-1)![tft]).toBeGreaterThan(0.5);
  });

  it("respects initial shares and zero-share starts", () => {
    const ids = ["a", "b"];
    const matrix = { a: { a: 3, b: 3 }, b: { a: 3, b: 3 } };
    const result = runEvolution(ids, matrix, 5, { a: 3, b: 1 });
    expect(result.shares[0]).toEqual([0.75, 0.25]);
    expect(result.shares[5][0]).toBeCloseTo(0.75);
    expect(runEvolution(ids, matrix, 2, { a: 1, b: 0 }).extinctAt.b).toBe(0);
  });
});
