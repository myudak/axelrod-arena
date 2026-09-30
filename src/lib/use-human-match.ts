import { useCallback, useMemo, useRef, useState } from "react";
import { createRng, type Move, type RoundResult, scoreRound, type Strategy } from "@/lib/game";

export interface MatchRules {
  /** The match cannot end before this many rounds. */
  minRounds: number;
  /** Hard cap on match length. */
  maxRounds: number;
  /** Chance the match ends after each round once `minRounds` is reached. */
  endChance: number;
}

/** The free-play default: an unknown horizon averaging roughly 20 rounds. */
export const FREE_PLAY_RULES: MatchRules = { minRounds: 8, maxRounds: 40, endChance: 0.08 };

function makeRandomizers(opponentId: string) {
  const seed = `${opponentId}:${Date.now()}:${Math.random()}`;
  return {
    opponent: createRng(`${seed}:opponent`),
    ending: createRng(`${seed}:ending`),
  };
}

export interface MatchStats {
  scoreHuman: number;
  scoreOpponent: number;
  /** Current run of consecutive mutual-cooperation rounds. */
  streak: number;
  bestStreak: number;
  humanCooperation: number;
  opponentCooperation: number;
}

export function computeStats(rounds: RoundResult[]): MatchStats {
  let streak = 0;
  let bestStreak = 0;
  let scoreHuman = 0;
  let scoreOpponent = 0;
  let humanC = 0;
  let opponentC = 0;
  for (const round of rounds) {
    scoreHuman += round.payoffA;
    scoreOpponent += round.payoffB;
    if (round.moveA === "C") humanC += 1;
    if (round.moveB === "C") opponentC += 1;
    streak = round.moveA === "C" && round.moveB === "C" ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
  }
  return {
    scoreHuman,
    scoreOpponent,
    streak,
    bestStreak,
    humanCooperation: rounds.length ? humanC / rounds.length : 0,
    opponentCooperation: rounds.length ? opponentC / rounds.length : 0,
  };
}

/**
 * Game state for a human (player A) against a strategy (player B).
 * Resets automatically when the opponent changes.
 */
export function useHumanMatch(opponent: Strategy, rules: MatchRules = FREE_PLAY_RULES) {
  const [rounds, setRounds] = useState<RoundResult[]>([]);
  const [finished, setFinished] = useState(false);
  const randomizers = useRef(makeRandomizers(opponent.id));
  const [matchKey, setMatchKey] = useState(`${opponent.id}:${rules.minRounds}:${rules.maxRounds}`);
  const nextKey = `${opponent.id}:${rules.minRounds}:${rules.maxRounds}`;
  if (matchKey !== nextKey) {
    setMatchKey(nextKey);
    setRounds([]);
    setFinished(false);
  }

  const reset = useCallback(() => {
    randomizers.current = makeRandomizers(opponent.id);
    setRounds([]);
    setFinished(false);
  }, [opponent.id]);

  /** Plays one round and returns it (or null when the match is over). */
  const play = useCallback(
    (humanMove: Move): { round: RoundResult; ended: boolean; rounds: RoundResult[] } | null => {
      if (finished) return null;
      const opponentMove = opponent.choose({
        selfHistory: rounds.map((round) => round.moveB),
        opponentHistory: rounds.map((round) => round.moveA),
        round: rounds.length,
        rng: randomizers.current.opponent,
      });
      const [payoffA, payoffB] = scoreRound(humanMove, opponentMove);
      const round: RoundResult = {
        round: rounds.length + 1,
        moveA: humanMove,
        moveB: opponentMove,
        payoffA,
        payoffB,
      };
      const next = [...rounds, round];
      const ended =
        next.length >= rules.minRounds &&
        (next.length >= rules.maxRounds || randomizers.current.ending() < rules.endChance);
      setRounds(next);
      if (ended) setFinished(true);
      return { round, ended, rounds: next };
    },
    [finished, opponent, rounds, rules],
  );

  const stats = useMemo(() => computeStats(rounds), [rounds]);

  return { rounds, finished, play, reset, stats };
}

export type Grade = "S" | "A" | "B" | "C" | "D";

/**
 * Letter grade from average payoff per round. In the IPD "beating" the
 * opponent is the wrong goal: mutual cooperation (3/round) is near the top.
 */
export function gradeFor(average: number): Grade {
  if (average >= 2.9) return "S";
  if (average >= 2.5) return "A";
  if (average >= 2) return "B";
  if (average >= 1.4) return "C";
  return "D";
}

export const gradeBlurb: Record<Grade, string> = {
  S: "Near-perfect partnership. Axelrod would be proud.",
  A: "Strong relationship. A few bumps, mostly trust.",
  B: "Workable, but trust kept breaking down.",
  C: "Mostly conflict. Both of you left points on the table.",
  D: "A war of attrition. Nobody wins these.",
};
