export type Move = "C" | "D";

export type StrategyCategory = "BEGINNER" | "CLASSIC" | "ADVANCED";

export interface StrategyContext {
  selfHistory: Move[];
  opponentHistory: Move[];
  round: number;
  rng: () => number;
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
  choose: (context: StrategyContext) => Move;
}

export interface RoundResult {
  round: number;
  moveA: Move;
  moveB: Move;
  payoffA: number;
  payoffB: number;
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
  versus: Record<
    string,
    {
      payoff: number;
      opponentPayoff: number;
      cooperationRate: number;
      rounds: number;
    }
  >;
}

export interface TournamentResult {
  seed: string;
  roundsPerMatch: number;
  repetitions: number;
  rows: TournamentRow[];
  matches: MatchResult[];
  totalRounds: number;
}

export const DEFAULT_PAYOFFS = {
  reward: 3,
  temptation: 5,
  punishment: 1,
  sucker: 0,
} as const;

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
      "Cooperates or defects with equal probability. It has no memory, intention, or stable relationship with its opponent.",
    rule: "Choose C or D with equal probability.",
    traits: ["Unpredictable", "Memoryless", "Neutral"],
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
      "Begins with cooperation, then mirrors the opponent's previous move. A single friendly action restores cooperation after a punishment.",
    rule: "Start with C, then copy the opponent's previous move.",
    traits: ["Nice", "Retaliatory", "Forgiving"],
    choose: ({ opponentHistory }) =>
      opponentHistory.length === 0 ? "C" : last(opponentHistory),
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
      "Uses the Tit for Tat rule but defects on the opening round. That initial suspicion can trap another reciprocal player in conflict.",
    rule: "Start with D, then copy the opponent's previous move.",
    traits: ["Suspicious", "Retaliatory", "Forgiving"],
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
      "Cooperates until the opponent defects once. From that moment onward it defects forever, making its deterrent powerful and its mistakes costly.",
    rule: "Choose C until the opponent defects once; then always choose D.",
    traits: ["Nice", "Harsh", "Unforgiving"],
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
      "Copies cooperation, but occasionally forgives a defection. The small chance of grace helps escape retaliation loops caused by accidents.",
    rule: "Copy C; after D, forgive with a 20% chance.",
    traits: ["Nice", "Retaliatory", "Generous"],
    choose: ({ opponentHistory, rng }) => {
      if (opponentHistory.length === 0) return "C";
      return last(opponentHistory) === "D" && rng() >= 0.2 ? "D" : "C";
    },
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
      "Repeats its previous move after a rewarding result and switches after a poor result. It can repair mutual defection without unconditional forgiveness.",
    rule: "Start with C. Repeat after scores 3 or 5; otherwise switch.",
    traits: ["Adaptive", "Recovering", "Exploitative"],
    choose: ({ selfHistory, opponentHistory }) => {
      if (selfHistory.length === 0) return "C";
      const ownLast = last(selfHistory);
      const [payoff] = scoreRound(ownLast, last(opponentHistory));
      return payoff === 3 || payoff === 5 ? ownLast : opposite(ownLast);
    },
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
      "Usually mirrors the opponent, but occasionally defects after cooperation. These surprise betrayals test how well opponents recover.",
    rule: "Play Tit for Tat, with a 10% chance to defect after cooperation.",
    traits: ["Retaliatory", "Provocative", "Stochastic"],
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
      "Tests the opponent with C, D, C, C. If the opponent retaliates it becomes Tit for Tat; if not, it exploits them by defecting forever.",
    rule: "Probe C-D-C-C; then use Tit for Tat if punished, otherwise defect.",
    traits: ["Probing", "Adaptive", "Exploitative"],
    choose: ({ opponentHistory, round }) => {
      const probe: Move[] = ["C", "D", "C", "C"];
      if (round < probe.length) return probe[round];
      const opponentRetaliated = opponentHistory.slice(0, 4).includes("D");
      return opponentRetaliated ? last(opponentHistory) : "D";
    },
  },
];

export const strategyMap = Object.fromEntries(
  strategies.map((strategy) => [strategy.id, strategy]),
) as Record<string, Strategy>;

export function getStrategy(id: string) {
  return strategyMap[id] ?? strategyMap["tit-for-tat"];
}

export function simulateMatch(
  strategyA: Strategy,
  strategyB: Strategy,
  options: { rounds?: number; seed?: string; noise?: number } = {},
): MatchResult {
  const totalRounds = options.rounds ?? 200;
  const seed = options.seed ?? "AXELROD-1984";
  const noise = options.noise ?? 0;
  const rngA = createRng(`${seed}:${strategyA.id}:A`);
  const rngB = createRng(`${seed}:${strategyB.id}:B`);
  const noiseRng = createRng(`${seed}:noise`);
  const historyA: Move[] = [];
  const historyB: Move[] = [];
  const roundResults: RoundResult[] = [];

  for (let round = 0; round < totalRounds; round += 1) {
    const intendedA = strategyA.choose({
      selfHistory: [...historyA],
      opponentHistory: [...historyB],
      round,
      rng: rngA,
    });
    const intendedB = strategyB.choose({
      selfHistory: [...historyB],
      opponentHistory: [...historyA],
      round,
      rng: rngB,
    });
    const moveA = noiseRng() < noise ? opposite(intendedA) : intendedA;
    const moveB = noiseRng() < noise ? opposite(intendedB) : intendedB;
    const [payoffA, payoffB] = scoreRound(moveA, moveB);
    historyA.push(moveA);
    historyB.push(moveB);
    roundResults.push({ round: round + 1, moveA, moveB, payoffA, payoffB });
  }

  const scoreA = roundResults.reduce((sum, round) => sum + round.payoffA, 0);
  const scoreB = roundResults.reduce((sum, round) => sum + round.payoffB, 0);
  const cooperationA =
    roundResults.filter((round) => round.moveA === "C").length / totalRounds;
  const cooperationB =
    roundResults.filter((round) => round.moveB === "C").length / totalRounds;

  return {
    id: `${strategyA.id}--${strategyB.id}--${seed}`,
    strategyA: strategyA.id,
    strategyB: strategyB.id,
    seed,
    rounds: roundResults,
    scoreA,
    scoreB,
    cooperationA,
    cooperationB,
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

export function runTournament(options: {
  strategyIds?: string[];
  rounds?: number;
  repetitions?: number;
  seed?: string;
  noise?: number;
} = {}): TournamentResult {
  const selected = (options.strategyIds ?? strategies.map((strategy) => strategy.id))
    .map(getStrategy)
    .filter(Boolean);
  const roundsPerMatch = options.rounds ?? 200;
  const repetitions = options.repetitions ?? 5;
  const seed = options.seed ?? "AXELROD-1984";
  const rows = Object.fromEntries(
    selected.map((strategy) => [strategy.id, createTournamentRow(strategy.id)]),
  ) as Record<string, MutableTournamentRow>;
  const matches: MatchResult[] = [];

  for (let first = 0; first < selected.length; first += 1) {
    for (let second = first; second < selected.length; second += 1) {
      const strategyA = selected[first];
      const strategyB = selected[second];
      for (let repetition = 0; repetition < repetitions; repetition += 1) {
        const match = simulateMatch(strategyA, strategyB, {
          rounds: roundsPerMatch,
          seed: `${seed}:${first}:${second}:${repetition}`,
          noise: options.noise,
        });
        matches.push(match);

        const rowA = rows[strategyA.id];
        const rowB = rows[strategyB.id];
        const cooperationsA = match.rounds.filter((round) => round.moveA === "C").length;
        const cooperationsB = match.rounds.filter((round) => round.moveB === "C").length;

        rowA.totalPayoff += match.scoreA;
        rowA.totalRounds += roundsPerMatch;
        rowA.cooperationCount += cooperationsA;
        rowA.matches += 1;
        updateVersus(
          rowA,
          strategyB.id,
          match.scoreA,
          match.scoreB,
          cooperationsA,
          roundsPerMatch,
        );

        rowB.totalPayoff += match.scoreB;
        rowB.totalRounds += roundsPerMatch;
        rowB.cooperationCount += cooperationsB;
        rowB.matches += 1;
        updateVersus(
          rowB,
          strategyA.id,
          match.scoreB,
          match.scoreA,
          cooperationsB,
          roundsPerMatch,
        );

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
      rank: 0,
      averagePayoff: row.totalPayoff / row.totalRounds,
      cooperationRate: row.cooperationCount / row.totalRounds,
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
    rows: rankedRows,
    matches,
    totalRounds: matches.length * roundsPerMatch,
  };
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
