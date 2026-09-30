import { describe, expect, it } from "vitest";
import {
  createRng,
  customStrategy,
  drawMatchLength,
  getStrategy,
  GTFT_FORGIVENESS,
  memoryOnePresets,
  payoffMatrix,
  runTournament,
  scoreRound,
  simulateMatch,
  strategies,
} from "@/lib/game";

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
    expect(result.matchCount).toBe(12);
    expect(result.rows.every((row) => Number.isFinite(row.averagePayoff))).toBe(true);
  });
});

const play = (id: string, self: ("C" | "D")[], opp: ("C" | "D")[]) =>
  getStrategy(id).choose({ selfHistory: self, opponentHistory: opp, round: self.length, rng });

describe("strategy definitions match the literature", () => {
  it("Generous TFT forgives with probability 1/3 for 5/3/1/0 payoffs", () => {
    expect(GTFT_FORGIVENESS).toBeCloseTo(1 / 3, 10);
  });

  it("Tit for Two Tats only retaliates after two consecutive defections", () => {
    expect(play("tit-for-two-tats", ["C"], ["D"])).toBe("C");
    expect(play("tit-for-two-tats", ["C", "C"], ["D", "D"])).toBe("D");
    expect(play("tit-for-two-tats", ["C", "C", "D"], ["D", "D", "C"])).toBe("C");
  });

  it("Pavlov wins-stays and loses-shifts", () => {
    expect(play("pavlov", ["C"], ["C"])).toBe("C");
    expect(play("pavlov", ["C"], ["D"])).toBe("D");
    expect(play("pavlov", ["D"], ["C"])).toBe("D");
    expect(play("pavlov", ["D"], ["D"])).toBe("C");
  });

  it("Gradual punishes the n-th defection with n defections, then calms twice", () => {
    const gradual = getStrategy("gradual");
    const always = (move: "C" | "D") => ({ ...gradual, id: move, choose: () => move });
    // Opponent defects once at round 1 then cooperates: 1 D, then 2 C.
    const opponent = {
      ...gradual,
      id: "once",
      choose: ({ round }: { round: number }) => (round === 1 || round === 6 ? "D" : "C"),
    } as typeof gradual;
    const match = simulateMatch(gradual, opponent, { rounds: 14 });
    expect(match.rounds.map((round) => round.moveA).join("")).toBe("CCDCCCCDDCCCCC");
    // Against Always Defect: punish 1 D, calm 2 C, then 4 D (4 defections seen so far), calm 2 C...
    const vsAllD = simulateMatch(gradual, always("D"), { rounds: 12 });
    expect(vsAllD.rounds.map((round) => round.moveA).join("")).toBe("CDCCDDDDCCDD");
  });

  it("Extort-2 enforces s_X − P = 2(s_Y − P) against an unconditional cooperator", () => {
    const match = simulateMatch(getStrategy("extort-2"), getStrategy("always-cooperate"), {
      rounds: 40000,
      seed: "ZD",
    });
    const sX = match.scoreA / match.rounds.length;
    const sY = match.scoreB / match.rounds.length;
    expect(sX - 1).toBeCloseTo(2 * (sY - 1), 1);
    expect(sX).toBeCloseTo(3.5, 1);
  });

  it("Extort-2 never loses a head-to-head match on average", () => {
    for (const opponent of ["tit-for-tat", "pavlov", "always-cooperate", "generous-tit-for-tat"]) {
      const match = simulateMatch(getStrategy("extort-2"), getStrategy(opponent), {
        rounds: 2000,
        seed: `EXT-${opponent}`,
      });
      expect(match.scoreA).toBeGreaterThanOrEqual(match.scoreB);
    }
  });

  it("memoryOne presets reproduce the hand-written strategies", () => {
    const opponents = ["random", "joss", "detective"];
    for (const preset of memoryOnePresets.filter((item) => item.id !== "extort-2")) {
      const custom = customStrategy({ id: "custom", name: "x", symbol: "X", color: "red", spec: preset.spec });
      for (const opponent of opponents) {
        const original = simulateMatch(getStrategy(preset.id), getStrategy(opponent), { rounds: 60, seed: "M1" });
        const rebuilt = simulateMatch({ ...custom, id: preset.id }, getStrategy(opponent), { rounds: 60, seed: "M1" });
        expect(rebuilt.rounds.map((round) => round.moveA)).toEqual(original.rounds.map((round) => round.moveA));
      }
    }
  });
});

describe("match options", () => {
  it("random match length has mean ≈ 1 / (1 − w)", () => {
    const random = createRng("lengths");
    const samples = Array.from({ length: 4000 }, () => drawMatchLength(0.9, random));
    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    expect(mean).toBeGreaterThan(9.3);
    expect(mean).toBeLessThan(10.7);
  });

  it("noise flips moves and marks them", () => {
    const match = simulateMatch(getStrategy("always-cooperate"), getStrategy("always-cooperate"), {
      rounds: 1000,
      noise: 0.1,
      seed: "NOISY",
    });
    const flips = match.rounds.filter((round) => round.flippedA).length;
    expect(flips).toBeGreaterThan(60);
    expect(flips).toBeLessThan(140);
    expect(match.rounds.filter((round) => round.flippedA).every((round) => round.moveA === "D")).toBe(true);
  });

  it("noise-free matches are unchanged by the noise option", () => {
    const a = simulateMatch(getStrategy("joss"), getStrategy("pavlov"), { rounds: 100, seed: "S" });
    const b = simulateMatch(getStrategy("joss"), getStrategy("pavlov"), { rounds: 100, seed: "S", noise: 0 });
    expect(a.rounds).toEqual(b.rounds);
  });
});

describe("tournament", () => {
  it("shares one drawn match length per repetition across all pairings", () => {
    const result = runTournament({
      strategyIds: ["tit-for-tat", "always-defect"],
      repetitions: 3,
      continuation: 0.95,
      seed: "W",
      includeMatches: true,
    });
    expect(result.matchLengths).toHaveLength(3);
    result.matches!.forEach((match, index) => {
      expect(match.rounds.length).toBe(result.matchLengths[index % 3]);
    });
  });

  it("accepts custom strategies", () => {
    const result = runTournament({
      strategyIds: ["tit-for-tat", "my-bot"],
      customs: [{ id: "my-bot", name: "My Bot", symbol: "MB", color: "red", spec: memoryOnePresets[0].spec }],
      rounds: 10,
      repetitions: 1,
    });
    expect(result.rows.map((row) => row.strategyId).sort()).toEqual(["my-bot", "tit-for-tat"]);
  });

  it("payoff matrix is per-turn and bounded by 0..5", () => {
    const result = runTournament({ rounds: 50, repetitions: 1 });
    const { ids, matrix } = payoffMatrix(result);
    expect(ids).toHaveLength(strategies.length);
    expect(matrix["always-defect"]["always-cooperate"]).toBe(5);
    expect(matrix["always-cooperate"]["always-defect"]).toBe(0);
    expect(matrix["tit-for-tat"]["tit-for-tat"]).toBe(3);
  });

  it("default Axelrod-style tournament ranking is stable (regression)", () => {
    const result = runTournament();
    expect(result.rows.map((row) => row.strategyId)).toMatchInlineSnapshot(`
      [
        "generous-tit-for-tat",
        "gradual",
        "tit-for-tat",
        "tit-for-two-tats",
        "pavlov",
        "always-cooperate",
        "detective",
        "grim-trigger",
        "random",
        "suspicious-tit-for-tat",
        "joss",
        "always-defect",
        "extort-2",
      ]
    `);
    const tft = result.rows.find((row) => row.strategyId === "tit-for-tat")!;
    expect(tft.wins).toBe(0);
  });
});
