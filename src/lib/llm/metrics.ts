import type { Move } from "../game.ts";

/**
 * Behavioural profile adapted from Fontana, Pierri & Aiello (2025).
 * Each value is a probability in [0, 1], or null when the situation never arose.
 */
export interface BehaviourProfile {
  /** Share of matches in which the model never defected before its opponent did. */
  niceness: number | null;
  /** P(model defects | opponent defected last round). */
  retaliation: number | null;
  /** P(model cooperates | opponent defected two rounds ago but cooperated last round). */
  forgiveness: number | null;
  /** P(model defects | opponent cooperated last round): unprovoked defection. */
  troublemaking: number | null;
  /** P(model repeats the opponent's previous move). */
  emulation: number | null;
  cooperation: number;
}

export interface MovePair {
  moveA: Move;
  moveB: Move;
}

const ratio = (hits: number, total: number) => (total ? hits / total : null);

export function behaviourProfile(matches: MovePair[][]): BehaviourProfile {
  let nice = 0;
  let retaliationHits = 0;
  let retaliationTotal = 0;
  let forgiveHits = 0;
  let forgiveTotal = 0;
  let troubleHits = 0;
  let troubleTotal = 0;
  let emulateHits = 0;
  let emulateTotal = 0;
  let cooperations = 0;
  let moves = 0;

  for (const rounds of matches) {
    const firstSelfD = rounds.findIndex((round) => round.moveA === "D");
    const firstOppD = rounds.findIndex((round) => round.moveB === "D");
    if (firstSelfD === -1 || (firstOppD !== -1 && firstOppD < firstSelfD)) nice += 1;

    rounds.forEach((round, t) => {
      moves += 1;
      if (round.moveA === "C") cooperations += 1;
      if (t === 0) return;
      const previous = rounds[t - 1];
      emulateTotal += 1;
      if (round.moveA === previous.moveB) emulateHits += 1;
      if (previous.moveB === "D") {
        retaliationTotal += 1;
        if (round.moveA === "D") retaliationHits += 1;
      } else {
        troubleTotal += 1;
        if (round.moveA === "D") troubleHits += 1;
      }
      if (t >= 2 && rounds[t - 2].moveB === "D" && previous.moveB === "C") {
        forgiveTotal += 1;
        if (round.moveA === "C") forgiveHits += 1;
      }
    });
  }

  return {
    niceness: ratio(nice, matches.length),
    retaliation: ratio(retaliationHits, retaliationTotal),
    forgiveness: ratio(forgiveHits, forgiveTotal),
    troublemaking: ratio(troubleHits, troubleTotal),
    emulation: ratio(emulateHits, emulateTotal),
    cooperation: moves ? cooperations / moves : 0,
  };
}
