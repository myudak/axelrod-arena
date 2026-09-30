export type Move = "C" | "D";

export type StrategyCategory = "BEGINNER" | "CLASSIC" | "ADVANCED" | "CUSTOM";

export interface StrategyContext {
  selfHistory: Move[];
  opponentHistory: Move[];
  round: number;
  rng: () => number;
}

/**
 * A memory-one strategy: the probability of cooperating given the previous
 * round's outcome, written from this player's point of view (self, opponent).
 */
export interface MemoryOneSpec {
  /** Probability of cooperating on the first move. */
  p0: number;
  pCC: number;
  pCD: number;
  pDC: number;
  pDD: number;
}

export interface Strategy {
  id: string;
  name: string;
  shortName: string;
  category: StrategyCategory;
  symbol: string;
  color: string;
  tagline: string;
  description: string;
  rule: string;
  traits: string[];
  /** Paper ids from `src/data/papers.ts`. */
  sources: string[];
  memoryOne?: MemoryOneSpec;
  choose: (context: StrategyContext) => Move;
}

/** Serializable definition of a player-built strategy (safe to store and post to workers). */
export interface CustomStrategyDef {
  id: string;
  name: string;
  symbol: string;
  color: string;
  spec: MemoryOneSpec;
}

export interface RoundResult {
  round: number;
  moveA: Move;
  moveB: Move;
  payoffA: number;
  payoffB: number;
  /** True when noise flipped the intended move. */
  flippedA?: boolean;
  flippedB?: boolean;
}

export interface MatchResult {
  id: string;
  strategyA: string;
  strategyB: string;
  seed: string;
  rounds: RoundResult[];
  scoreA: number;
  scoreB: number;
  cooperationA: number;
  cooperationB: number;
}

export interface VersusRecord {
  payoff: number;
  opponentPayoff: number;
  cooperationRate: number;
  rounds: number;
}

export interface TournamentRow {
  strategyId: string;
  rank: number;
  totalPayoff: number;
  totalRounds: number;
  averagePayoff: number;
  cooperationRate: number;
  wins: number;
  draws: number;
  losses: number;
  matches: number;
  versus: Record<string, VersusRecord>;
}

export interface TournamentOptions {
  strategyIds?: string[];
  customs?: CustomStrategyDef[];
  /** Fixed match length. Ignored when `continuation` is set. */
  rounds?: number;
  repetitions?: number;
  seed?: string;
  /** Probability that each intended move is flipped by mistake. */
  noise?: number;
  /** Probability w that the match continues after each round (random match length). */
  continuation?: number;
  /** Keep every round of every match in the result (large). */
  includeMatches?: boolean;
}

export interface TournamentResult {
  seed: string;
  roundsPerMatch: number;
  repetitions: number;
  noise: number;
  continuation?: number;
  rows: TournamentRow[];
  matchCount: number;
  matches?: MatchResult[];
  totalRounds: number;
  /** Lengths drawn per repetition when `continuation` is set. */
  matchLengths: number[];
}

export const DEFAULT_PAYOFFS = {
  reward: 3,
  temptation: 5,
  punishment: 1,
  sucker: 0,
} as const;

/** Continuation probability used in Axelrod's second tournament. */
export const AXELROD_SECOND_W = 0.99654;
export const MAX_MATCH_ROUNDS = 2000;

export function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRng(seed: string | number) {
  let state = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function opposite(move: Move): Move {
  return move === "C" ? "D" : "C";
}

export function scoreRound(moveA: Move, moveB: Move) {
  if (moveA === "C" && moveB === "C") {
    return [DEFAULT_PAYOFFS.reward, DEFAULT_PAYOFFS.reward] as const;
  }
  if (moveA === "D" && moveB === "C") {
    return [DEFAULT_PAYOFFS.temptation, DEFAULT_PAYOFFS.sucker] as const;
  }
  if (moveA === "C" && moveB === "D") {
    return [DEFAULT_PAYOFFS.sucker, DEFAULT_PAYOFFS.temptation] as const;
  }
  return [DEFAULT_PAYOFFS.punishment, DEFAULT_PAYOFFS.punishment] as const;
}

function last<T>(values: T[]) {
  return values[values.length - 1];
}

/** Draws a match length from a geometric distribution with continuation probability `w`. */
export function drawMatchLength(w: number, rng: () => number, max = MAX_MATCH_ROUNDS) {
  let length = 1;
  while (length < max && rng() < w) length += 1;
  return length;
}

export function memoryOne(spec: MemoryOneSpec) {
  return ({ selfHistory, opponentHistory, rng }: StrategyContext): Move => {
    const probability =
      selfHistory.length === 0
        ? spec.p0
        : last(selfHistory) === "C"
          ? last(opponentHistory) === "C"
            ? spec.pCC
            : spec.pCD
          : last(opponentHistory) === "C"
            ? spec.pDC
            : spec.pDD;
    if (probability >= 1) return "C";
    if (probability <= 0) return "D";
    return rng() < probability ? "C" : "D";
  };
}

/** Generous Tit for Tat forgiveness for the active payoffs (Nowak & Sigmund 1992). */
export const GTFT_FORGIVENESS = (() => {
  const { temptation: T, reward: R, punishment: P, sucker: S } = DEFAULT_PAYOFFS;
  return Math.min(1 - (T - R) / (R - S), (R - P) / (T - P));
})();

/** Gradual: punish the n-th defection with n defections, then two calming cooperations. */
function gradualMove(opponentHistory: Move[]): Move {
  let defections = 0;
  let punish = 0;
  let calm = 0;
  let move: Move = "C";
  for (let round = 0; round <= opponentHistory.length; round += 1) {
    const previous = round > 0 ? opponentHistory[round - 1] : undefined;
    if (previous === "D") defections += 1;
    if (punish > 0) {
      move = "D";
      punish -= 1;
      if (punish === 0) calm = 2;
    } else if (calm > 0) {
      move = "C";
      calm -= 1;
    } else if (previous === "D") {
      move = "D";
      punish = defections - 1;
      if (punish === 0) calm = 2;
    } else {
      move = "C";
    }
  }
  return move;
}

const TFT_SPEC: MemoryOneSpec = { p0: 1, pCC: 1, pCD: 0, pDC: 1, pDD: 0 };
const GTFT_SPEC: MemoryOneSpec = {
  p0: 1,
  pCC: 1,
  pCD: GTFT_FORGIVENESS,
  pDC: 1,
  pDD: GTFT_FORGIVENESS,
};
const PAVLOV_SPEC: MemoryOneSpec = { p0: 1, pCC: 1, pCD: 0, pDC: 0, pDD: 1 };
const EXTORT2_SPEC: MemoryOneSpec = { p0: 1, pCC: 8 / 9, pCD: 1 / 2, pDC: 1 / 3, pDD: 0 };

export const memoryOnePresets: { id: string; label: string; spec: MemoryOneSpec }[] = [
  { id: "tit-for-tat", label: "Tit for Tat", spec: TFT_SPEC },
  { id: "generous-tit-for-tat", label: "Generous TFT", spec: GTFT_SPEC },
  { id: "pavlov", label: "Win-Stay Lose-Shift", spec: PAVLOV_SPEC },
  { id: "extort-2", label: "Extort-2", spec: EXTORT2_SPEC },
  { id: "always-cooperate", label: "Always C", spec: { p0: 1, pCC: 1, pCD: 1, pDC: 1, pDD: 1 } },
  { id: "always-defect", label: "Always D", spec: { p0: 0, pCC: 0, pCD: 0, pDC: 0, pDD: 0 } },
];

export const strategies: Strategy[] = [
  {
    id: "always-cooperate",
    name: "Always Cooperate",
    shortName: "COOPERATE",
    category: "BEGINNER",
    symbol: "AC",
    color: "mint",
    tagline: "Kind to a fault.",
    description:
      "Offers cooperation every round, even after repeated betrayal. Creates maximum welfare with another cooperator and becomes an easy target for defectors.",
    rule: "Always choose C.",
    traits: ["Nice", "Forgiving", "Exploitable"],
    sources: ["axelrod1984"],
    memoryOne: { p0: 1, pCC: 1, pCD: 1, pDC: 1, pDD: 1 },
    choose: () => "C",
  },
  {
    id: "always-defect",
    name: "Always Defect",
    shortName: "DEFECTOR",
    category: "BEGINNER",
    symbol: "AD",
    color: "red",
    tagline: "Trust nobody.",
    description:
      "Defects every round. It harvests naive cooperators but cannot build the repeated mutual gains that reciprocal strategies can.",
    rule: "Always choose D.",
    traits: ["Aggressive", "Clear", "Unforgiving"],
    sources: ["axelrod1984"],
    memoryOne: { p0: 0, pCC: 0, pCD: 0, pDC: 0, pDD: 0 },
    choose: () => "D",
  },
  {
    id: "random",
    name: "Random",
    shortName: "RANDOM",
    category: "BEGINNER",
    symbol: "??",
    color: "violet",
    tagline: "A coin with commitment issues.",
    description:
      "Cooperates or defects with equal probability. Axelrod entered it in both tournaments as a baseline with no memory or intention.",
    rule: "Choose C or D with equal probability.",
    traits: ["Unpredictable", "Memoryless", "Neutral"],
    sources: ["axelrod1980a"],
    memoryOne: { p0: 0.5, pCC: 0.5, pCD: 0.5, pDC: 0.5, pDD: 0.5 },
    choose: ({ rng }) => (rng() < 0.5 ? "C" : "D"),
  },
  {
    id: "tit-for-tat",
    name: "Tit for Tat",
    shortName: "TIT FOR TAT",
    category: "CLASSIC",
    symbol: "TFT",
    color: "cyan",
    tagline: "Nice. Retaliatory. Forgiving. Clear.",
    description:
      "Anatol Rapoport's entry and the winner of both Axelrod tournaments. Begins with cooperation, then mirrors the opponent's previous move. It never outscores an opponent head-to-head, yet it tops the table.",
    rule: "Start with C, then copy the opponent's previous move.",
    traits: ["Nice", "Retaliatory", "Forgiving"],
    sources: ["axelrod1980a", "axelrod1980b"],
    memoryOne: TFT_SPEC,
    choose: ({ opponentHistory }) =>
      opponentHistory.length === 0 ? "C" : last(opponentHistory),
  },
  {
    id: "tit-for-two-tats",
    name: "Tit for Two Tats",
    shortName: "TF2T",
    category: "CLASSIC",
    symbol: "T2T",
    color: "teal",
    tagline: "Slow to anger.",
    description:
      "Only retaliates after two defections in a row. Axelrod noted it would have won the first tournament had anyone entered it, but in the second tournament entrants learned to exploit its patience.",
    rule: "Defect only if the opponent defected in both of the last two rounds.",
    traits: ["Nice", "Patient", "Exploitable"],
    sources: ["axelrod1980a", "axelrod1980b"],
    choose: ({ opponentHistory }) =>
      opponentHistory.length >= 2 &&
      opponentHistory[opponentHistory.length - 1] === "D" &&
      opponentHistory[opponentHistory.length - 2] === "D"
        ? "D"
        : "C",
  },
  {
    id: "suspicious-tit-for-tat",
    name: "Suspicious Tit for Tat",
    shortName: "SUSPICIOUS",
    category: "CLASSIC",
    symbol: "STF",
    color: "amber",
    tagline: "Reciprocity without first trust.",
    description:
      "Uses the Tit for Tat rule but defects on the opening round. That initial suspicion can trap another reciprocal player in an endless echo of retaliation.",
    rule: "Start with D, then copy the opponent's previous move.",
    traits: ["Suspicious", "Retaliatory", "Forgiving"],
    sources: ["boyd-lorberbaum1987"],
    memoryOne: { p0: 0, pCC: 1, pCD: 0, pDC: 1, pDD: 0 },
    choose: ({ opponentHistory }) =>
      opponentHistory.length === 0 ? "D" : last(opponentHistory),
  },
  {
    id: "grim-trigger",
    name: "Grim Trigger",
    shortName: "GRIM",
    category: "CLASSIC",
    symbol: "GT",
    color: "slate",
    tagline: "One betrayal. Permanent consequences.",
    description:
      "Cooperates until the opponent defects once, then defects forever. Entered in Axelrod's first tournament as FRIEDMAN. Its deterrent is powerful and its mistakes are costly.",
    rule: "Choose C until the opponent defects once; then always choose D.",
    traits: ["Nice", "Harsh", "Unforgiving"],
    sources: ["friedman1971", "axelrod1980a"],
    choose: ({ opponentHistory }) =>
      opponentHistory.includes("D") ? "D" : "C",
  },
  {
    id: "generous-tit-for-tat",
    name: "Generous Tit for Tat",
    shortName: "GENEROUS TFT",
    category: "ADVANCED",
    symbol: "GTF",
    color: "green",
    tagline: "Reciprocity with a little grace.",
    description:
      "Copies cooperation, but forgives a defection one time in three. That is the optimal generosity for 5/3/1/0 payoffs, and it lets the strategy escape retaliation loops caused by mistakes.",
    rule: "Start with C. Copy C; after D, still cooperate with probability 1/3.",
    traits: ["Nice", "Retaliatory", "Generous"],
    sources: ["nowak-sigmund1992", "wu-axelrod1995"],
    memoryOne: GTFT_SPEC,
    choose: memoryOne(GTFT_SPEC),
  },
  {
    id: "pavlov",
    name: "Pavlov",
    shortName: "PAVLOV",
    category: "ADVANCED",
    symbol: "PV",
    color: "blue",
    tagline: "Win-stay, lose-shift.",
    description:
      "Repeats its previous move after a good result (3 or 5) and switches after a bad one (0 or 1). It repairs accidental defection between two Pavlovs and exploits unconditional cooperators.",
    rule: "Start with C. Repeat after scoring 3 or 5; otherwise switch.",
    traits: ["Adaptive", "Recovering", "Exploitative"],
    sources: ["nowak-sigmund1993"],
    memoryOne: PAVLOV_SPEC,
    choose: memoryOne(PAVLOV_SPEC),
  },
  {
    id: "gradual",
    name: "Gradual",
    shortName: "GRADUAL",
    category: "ADVANCED",
    symbol: "GR",
    color: "indigo",
    tagline: "Punishment that escalates.",
    description:
      "Cooperates until betrayed. After the opponent's n-th defection it defects n times in a row, then cooperates twice to calm things down. Repeat offenders face longer punishments.",
    rule: "Answer the n-th defection with n defections, then two cooperations.",
    traits: ["Nice", "Escalating", "Forgiving"],
    sources: ["beaufils1996"],
    choose: ({ opponentHistory }) => gradualMove(opponentHistory),
  },
  {
    id: "joss",
    name: "Joss",
    shortName: "JOSS",
    category: "ADVANCED",
    symbol: "JS",
    color: "pink",
    tagline: "Tit for Tat with a mean streak.",
    description:
      "Johann Joss's entry in Axelrod's first tournament. Usually mirrors the opponent, but sneaks in a defection 10% of the time after cooperation, which sets off long retaliation chains.",
    rule: "Play Tit for Tat, with a 10% chance to defect after cooperation.",
    traits: ["Retaliatory", "Provocative", "Stochastic"],
    sources: ["axelrod1980a"],
    memoryOne: { p0: 1, pCC: 0.9, pCD: 0, pDC: 0.9, pDD: 0 },
    choose: ({ opponentHistory, rng }) => {
      if (opponentHistory.length === 0) return "C";
      return last(opponentHistory) === "D" || rng() < 0.1 ? "D" : "C";
    },
  },
  {
    id: "detective",
    name: "Detective",
    shortName: "DETECTIVE",
    category: "ADVANCED",
    symbol: "DT",
    color: "orange",
    tagline: "Probe first. Exploit weakness later.",
    description:
      "From Nicky Case's The Evolution of Trust. Opens C, D, C, C. If the opponent ever retaliates it becomes Tit for Tat; if not, it exploits them by defecting forever.",
    rule: "Probe C-D-C-C; then use Tit for Tat if punished, otherwise defect.",
    traits: ["Probing", "Adaptive", "Exploitative"],
    sources: ["case2017"],
    choose: ({ opponentHistory, round }) => {
      const probe: Move[] = ["C", "D", "C", "C"];
      if (round < probe.length) return probe[round];
      const opponentRetaliated = opponentHistory.slice(0, 4).includes("D");
      return opponentRetaliated ? last(opponentHistory) : "D";
    },
  },
  {
    id: "extort-2",
    name: "Extort-2",
    shortName: "EXTORT-2",
    category: "ADVANCED",
    symbol: "EX2",
    color: "crimson",
    tagline: "Your gain is my gain, times two.",
    description:
      "A zero-determinant strategy. Its memory-one rule forces its surplus over mutual defection to be exactly twice yours. It never loses a head-to-head match, yet it earns little against players who refuse to be extorted.",
    rule: "Cooperate with probability 8/9, 1/2, 1/3, 0 after CC, CD, DC, DD.",
    traits: ["Extortionate", "Stochastic", "Unbeatable head-to-head"],
    sources: ["press-dyson2012", "stewart-plotkin2012", "stewart-plotkin2013"],
    memoryOne: EXTORT2_SPEC,
    choose: memoryOne(EXTORT2_SPEC),
  },
];

export function customStrategy(def: CustomStrategyDef): Strategy {
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  return {
    id: def.id,
    name: def.name,
    shortName: def.name.toUpperCase().slice(0, 16),
    category: "CUSTOM",
    symbol: def.symbol.toUpperCase().slice(0, 3),
    color: def.color,
    tagline: "Built in your lab.",
    description: "A memory-one strategy designed by you.",
    rule: `First move C ${percent(def.spec.p0)}. Then P(C) after CC ${percent(def.spec.pCC)}, CD ${percent(def.spec.pCD)}, DC ${percent(def.spec.pDC)}, DD ${percent(def.spec.pDD)}.`,
    traits: ["Custom", "Memory-one"],
    sources: [],
    memoryOne: def.spec,
    choose: memoryOne(def.spec),
  };
}

export function buildRoster(customs: CustomStrategyDef[] = []): Strategy[] {
  return [...strategies, ...customs.map(customStrategy)];
}

export const strategyMap = Object.fromEntries(
  strategies.map((strategy) => [strategy.id, strategy]),
) as Record<string, Strategy>;

export function getStrategy(id: string, roster: Strategy[] = strategies) {
  return roster.find((strategy) => strategy.id === id) ?? strategyMap[id] ?? strategyMap["tit-for-tat"];
}

export function isStrategyId(id: string | null | undefined, roster: Strategy[] = strategies): id is string {
  return Boolean(id) && roster.some((strategy) => strategy.id === id);
}

export interface MatchOptions {
  /** Fixed match length (default 200). Ignored when `continuation` is set. */
  rounds?: number;
  seed?: string;
  noise?: number;
  continuation?: number;
}

export function simulateMatch(
  strategyA: Strategy,
  strategyB: Strategy,
  options: MatchOptions = {},
): MatchResult {
  const seed = options.seed ?? "AXELROD-1984";
  const noise = options.noise ?? 0;
  const totalRounds =
    options.continuation !== undefined
      ? drawMatchLength(options.continuation, createRng(`${seed}:length`))
      : (options.rounds ?? 200);
  const rngA = createRng(`${seed}:${strategyA.id}:A`);
  const rngB = createRng(`${seed}:${strategyB.id}:B`);
  const noiseRng = createRng(`${seed}:noise`);
  const historyA: Move[] = [];
  const historyB: Move[] = [];
  const roundResults: RoundResult[] = [];
  let scoreA = 0;
  let scoreB = 0;
  let cooperationsA = 0;
  let cooperationsB = 0;

  for (let round = 0; round < totalRounds; round += 1) {
    const intendedA = strategyA.choose({
      selfHistory: historyA,
      opponentHistory: historyB,
      round,
      rng: rngA,
    });
    const intendedB = strategyB.choose({
      selfHistory: historyB,
      opponentHistory: historyA,
      round,
      rng: rngB,
    });
    const flippedA = noise > 0 && noiseRng() < noise;
    const flippedB = noise > 0 && noiseRng() < noise;
    const moveA = flippedA ? opposite(intendedA) : intendedA;
    const moveB = flippedB ? opposite(intendedB) : intendedB;
    const [payoffA, payoffB] = scoreRound(moveA, moveB);
    historyA.push(moveA);
    historyB.push(moveB);
    scoreA += payoffA;
    scoreB += payoffB;
    if (moveA === "C") cooperationsA += 1;
    if (moveB === "C") cooperationsB += 1;
    const result: RoundResult = { round: round + 1, moveA, moveB, payoffA, payoffB };
    if (flippedA) result.flippedA = true;
    if (flippedB) result.flippedB = true;
    roundResults.push(result);
  }

  return {
    id: `${strategyA.id}--${strategyB.id}--${seed}`,
    strategyA: strategyA.id,
    strategyB: strategyB.id,
    seed,
    rounds: roundResults,
    scoreA,
    scoreB,
    cooperationA: cooperationsA / totalRounds,
    cooperationB: cooperationsB / totalRounds,
  };
}

type MutableTournamentRow = Omit<TournamentRow, "rank" | "averagePayoff" | "cooperationRate"> & {
  cooperationCount: number;
};

function createTournamentRow(strategyId: string): MutableTournamentRow {
  return {
    strategyId,
    totalPayoff: 0,
    totalRounds: 0,
    cooperationCount: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    matches: 0,
    versus: {},
  };
}

function updateVersus(
  row: MutableTournamentRow,
  opponentId: string,
  payoff: number,
  opponentPayoff: number,
  cooperationCount: number,
  rounds: number,
) {
  const previous = row.versus[opponentId] ?? {
    payoff: 0,
    opponentPayoff: 0,
    cooperationRate: 0,
    rounds: 0,
  };
  const previousCooperations = previous.cooperationRate * previous.rounds;
  row.versus[opponentId] = {
    payoff: previous.payoff + payoff,
    opponentPayoff: previous.opponentPayoff + opponentPayoff,
    cooperationRate:
      (previousCooperations + cooperationCount) / (previous.rounds + rounds),
    rounds: previous.rounds + rounds,
  };
}

export function runTournament(options: TournamentOptions = {}): TournamentResult {
  const roster = buildRoster(options.customs);
  const selected = (options.strategyIds ?? strategies.map((strategy) => strategy.id))
    .filter((id) => isStrategyId(id, roster))
    .map((id) => getStrategy(id, roster));
  const roundsPerMatch = options.rounds ?? 200;
  const repetitions = options.repetitions ?? 5;
  const seed = options.seed ?? "AXELROD-1984";
  const noise = options.noise ?? 0;
  const lengthRng = createRng(`${seed}:lengths`);
  // As in Axelrod's second tournament, every pairing shares the same drawn length per repetition.
  const matchLengths = Array.from({ length: repetitions }, () =>
    options.continuation !== undefined
      ? drawMatchLength(options.continuation, lengthRng)
      : roundsPerMatch,
  );
  const rows = Object.fromEntries(
    selected.map((strategy) => [strategy.id, createTournamentRow(strategy.id)]),
  ) as Record<string, MutableTournamentRow>;
  const matches: MatchResult[] = [];
  let matchCount = 0;
  let totalRounds = 0;

  for (let first = 0; first < selected.length; first += 1) {
    for (let second = first; second < selected.length; second += 1) {
      const strategyA = selected[first];
      const strategyB = selected[second];
      for (let repetition = 0; repetition < repetitions; repetition += 1) {
        const match = simulateMatch(strategyA, strategyB, {
          rounds: matchLengths[repetition],
          seed: `${seed}:${first}:${second}:${repetition}`,
          noise,
        });
        const length = match.rounds.length;
        matchCount += 1;
        totalRounds += length;
        if (options.includeMatches) matches.push(match);

        const rowA = rows[strategyA.id];
        const rowB = rows[strategyB.id];
        const cooperationsA = Math.round(match.cooperationA * length);
        const cooperationsB = Math.round(match.cooperationB * length);

        rowA.totalPayoff += match.scoreA;
        rowA.totalRounds += length;
        rowA.cooperationCount += cooperationsA;
        rowA.matches += 1;
        updateVersus(rowA, strategyB.id, match.scoreA, match.scoreB, cooperationsA, length);

        rowB.totalPayoff += match.scoreB;
        rowB.totalRounds += length;
        rowB.cooperationCount += cooperationsB;
        rowB.matches += 1;
        updateVersus(rowB, strategyA.id, match.scoreB, match.scoreA, cooperationsB, length);

        if (strategyA.id !== strategyB.id) {
          if (match.scoreA > match.scoreB) {
            rowA.wins += 1;
            rowB.losses += 1;
          } else if (match.scoreB > match.scoreA) {
            rowB.wins += 1;
            rowA.losses += 1;
          } else {
            rowA.draws += 1;
            rowB.draws += 1;
          }
        }
      }
    }
  }

  const rankedRows = Object.values(rows)
    .map((row) => ({
      ...row,
      averagePayoff: row.totalRounds ? row.totalPayoff / row.totalRounds : 0,
      cooperationRate: row.totalRounds ? row.cooperationCount / row.totalRounds : 0,
    }))
    .sort((left, right) =>
      right.averagePayoff === left.averagePayoff
        ? right.cooperationRate - left.cooperationRate
        : right.averagePayoff - left.averagePayoff,
    )
    .map((row, index): TournamentRow => ({
      strategyId: row.strategyId,
      rank: index + 1,
      totalPayoff: row.totalPayoff,
      totalRounds: row.totalRounds,
      averagePayoff: row.averagePayoff,
      cooperationRate: row.cooperationRate,
      wins: row.wins,
      draws: row.draws,
      losses: row.losses,
      matches: row.matches,
      versus: row.versus,
    }));

  return {
    seed,
    roundsPerMatch,
    repetitions,
    noise,
    continuation: options.continuation,
    rows: rankedRows,
    matchCount,
    matches: options.includeMatches ? matches : undefined,
    totalRounds,
    matchLengths,
  };
}

/**
 * Average per-turn payoff of each row strategy against each column strategy.
 * `matrix[a][b]` is what `a` earns per turn when facing `b`.
 */
export function payoffMatrix(result: TournamentResult) {
  const ids = result.rows.map((row) => row.strategyId);
  const matrix: Record<string, Record<string, number>> = {};
  for (const row of result.rows) {
    matrix[row.strategyId] = {};
    for (const id of ids) {
      const record = row.versus[id];
      matrix[row.strategyId][id] = record && record.rounds ? record.payoff / record.rounds : 0;
    }
  }
  return { ids, matrix };
}

export function summarizeRounds(rounds: RoundResult[], cursor = rounds.length) {
  const visible = rounds.slice(0, cursor);
  return {
    scoreA: visible.reduce((sum, round) => sum + round.payoffA, 0),
    scoreB: visible.reduce((sum, round) => sum + round.payoffB, 0),
    cooperationA:
      visible.length === 0
        ? 0
        : visible.filter((round) => round.moveA === "C").length / visible.length,
    cooperationB:
      visible.length === 0
        ? 0
        : visible.filter((round) => round.moveB === "C").length / visible.length,
  };
}

/** Describes one exchange from player A's perspective. */
export function outcomeLabel(moveA: Move, moveB: Move) {
  if (moveA === "C" && moveB === "C") return "MUTUAL TRUST";
  if (moveA === "D" && moveB === "D") return "MUTUAL DISTRUST";
  return moveA === "D" ? "EXPLOIT" : "SUCKER";
}
