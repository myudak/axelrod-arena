import assert from "node:assert/strict";
import test from "node:test";
import {
  getStrategy,
  runTournament,
  scoreRound,
  simulateMatch,
} from "../lib/game.ts";

test("uses the classic 5/3/1/0 payoff matrix", () => {
  assert.deepEqual(scoreRound("C", "C"), [3, 3]);
  assert.deepEqual(scoreRound("D", "C"), [5, 0]);
  assert.deepEqual(scoreRound("C", "D"), [0, 5]);
  assert.deepEqual(scoreRound("D", "D"), [1, 1]);
});

test("Tit for Tat begins nice and mirrors the previous move", () => {
  const tft = getStrategy("tit-for-tat");
  const rng = () => 0.5;
  assert.equal(tft.choose({ selfHistory: [], opponentHistory: [], round: 0, rng }), "C");
  assert.equal(tft.choose({ selfHistory: ["C"], opponentHistory: ["D"], round: 1, rng }), "D");
  assert.equal(tft.choose({ selfHistory: ["C", "D"], opponentHistory: ["D", "C"], round: 2, rng }), "C");
});

test("Grim Trigger never forgives a prior defection", () => {
  const grim = getStrategy("grim-trigger");
  const rng = () => 0.5;
  assert.equal(grim.choose({ selfHistory: ["C"], opponentHistory: ["C"], round: 1, rng }), "C");
  assert.equal(grim.choose({ selfHistory: ["C", "D"], opponentHistory: ["C", "D"], round: 2, rng }), "D");
  assert.equal(grim.choose({ selfHistory: ["C", "D", "D"], opponentHistory: ["C", "D", "C"], round: 3, rng }), "D");
});

test("seeded matches are reproducible", () => {
  const first = simulateMatch(getStrategy("random"), getStrategy("joss"), {
    rounds: 50,
    seed: "REPEATABLE",
  });
  const second = simulateMatch(getStrategy("random"), getStrategy("joss"), {
    rounds: 50,
    seed: "REPEATABLE",
  });
  assert.deepEqual(first.rounds, second.rounds);
  assert.equal(first.scoreA, second.scoreA);
  assert.equal(first.scoreB, second.scoreB);
});

test("tournament returns one ranked row per selected strategy", () => {
  const ids = ["always-cooperate", "always-defect", "tit-for-tat"];
  const result = runTournament({
    strategyIds: ids,
    rounds: 20,
    repetitions: 2,
    seed: "SMALL-TOURNAMENT",
  });
  assert.equal(result.rows.length, ids.length);
  assert.deepEqual(result.rows.map((row) => row.rank), [1, 2, 3]);
  assert.equal(result.matches.length, 12);
  assert.ok(result.rows.every((row) => Number.isFinite(row.averagePayoff)));
});
