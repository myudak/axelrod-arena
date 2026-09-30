import { describe, expect, it } from "vitest";
import { getStrategy, runTournament, scoreRound, simulateMatch } from "@/lib/game";

const rng = () => 0.5;

describe("game engine", () => {
  it("uses the classic 5/3/1/0 payoff matrix", () => {
    expect(scoreRound("C", "C")).toEqual([3, 3]);
    expect(scoreRound("D", "C")).toEqual([5, 0]);
    expect(scoreRound("C", "D")).toEqual([0, 5]);
    expect(scoreRound("D", "D")).toEqual([1, 1]);
  });

  it("Tit for Tat begins nice and mirrors the previous move", () => {
    const tft = getStrategy("tit-for-tat");
    expect(tft.choose({ selfHistory: [], opponentHistory: [], round: 0, rng })).toBe("C");
    expect(tft.choose({ selfHistory: ["C"], opponentHistory: ["D"], round: 1, rng })).toBe("D");
    expect(tft.choose({ selfHistory: ["C", "D"], opponentHistory: ["D", "C"], round: 2, rng })).toBe("C");
  });

  it("Grim Trigger never forgives a prior defection", () => {
    const grim = getStrategy("grim-trigger");
    expect(grim.choose({ selfHistory: ["C"], opponentHistory: ["C"], round: 1, rng })).toBe("C");
    expect(grim.choose({ selfHistory: ["C", "D"], opponentHistory: ["C", "D"], round: 2, rng })).toBe("D");
    expect(grim.choose({ selfHistory: ["C", "D", "D"], opponentHistory: ["C", "D", "C"], round: 3, rng })).toBe("D");
  });

  it("seeded matches are reproducible", () => {
    const first = simulateMatch(getStrategy("random"), getStrategy("joss"), { rounds: 50, seed: "REPEATABLE" });
    const second = simulateMatch(getStrategy("random"), getStrategy("joss"), { rounds: 50, seed: "REPEATABLE" });
    expect(first.rounds).toEqual(second.rounds);
    expect(first.scoreA).toBe(second.scoreA);
    expect(first.scoreB).toBe(second.scoreB);
  });

  it("tournament returns one ranked row per selected strategy", () => {
    const ids = ["always-cooperate", "always-defect", "tit-for-tat"];
    const result = runTournament({ strategyIds: ids, rounds: 20, repetitions: 2, seed: "SMALL-TOURNAMENT" });
    expect(result.rows).toHaveLength(ids.length);
    expect(result.rows.map((row) => row.rank)).toEqual([1, 2, 3]);
    expect(result.matches).toHaveLength(12);
    expect(result.rows.every((row) => Number.isFinite(row.averagePayoff))).toBe(true);
  });
});
