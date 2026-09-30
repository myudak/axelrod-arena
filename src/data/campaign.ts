import type { RoundResult } from "@/lib/game";
import type { MatchRules, MatchStats } from "@/lib/use-human-match";

export interface MatchSummary {
  opponentId: string;
  rounds: RoundResult[];
  stats: MatchStats;
  /** Human's average payoff per round. */
  average: number;
  /** Opponent's average payoff per round. */
  opponentAverage: number;
}

export interface Goal {
  label: string;
  check: (summary: MatchSummary) => boolean;
}

export interface Stage {
  id: string;
  opponentId: string;
  title: string;
  /** Shown before the match: what to watch for. */
  briefing: string;
  /** Shown after the match: the game-theory lesson. */
  debrief: string;
  /** Paper ids backing the lesson. */
  sources: string[];
  /** goals[0] completes the stage; each met goal is one star. */
  goals: [Goal, Goal, Goal];
}

/** Campaign matches are a little longer so bonus goals are reachable. */
export const CAMPAIGN_RULES: MatchRules = { minRounds: 12, maxRounds: 30, endChance: 0.1 };

const avgAtLeast = (value: number): Goal => ({
  label: `Average ${value.toFixed(1)}+ points per round`,
  check: (summary) => summary.average >= value - 1e-9,
});

const comboAtLeast = (value: number): Goal => ({
  label: `Reach a ${value}-round trust combo`,
  check: (summary) => summary.stats.bestStreak >= value,
});

const count = (rounds: RoundResult[], moveA: "C" | "D", moveB: "C" | "D") =>
  rounds.filter((round) => round.moveA === moveA && round.moveB === moveB).length;

export const stages: Stage[] = [
  {
    id: "pushover",
    opponentId: "always-cooperate",
    title: "THE PUSHOVER",
    briefing:
      "This one cooperates no matter what you do. There is no reputation to protect and no retaliation to fear.",
    debrief:
      "Unconditional kindness invites exploitation. That is why the winning strategies in Axelrod's tournaments were nice and also retaliatory.",
    sources: ["axelrod1984"],
    goals: [avgAtLeast(3.5), avgAtLeast(4.2), avgAtLeast(4.8)],
  },
  {
    id: "bully",
    opponentId: "always-defect",
    title: "THE BULLY",
    briefing: "It defects every single round. Every cooperation you offer is a free 5 points for it.",
    debrief:
      "Against a pure defector, the only rational reply is to defect too. Retaliation limits your losses; it doesn't punish them into changing.",
    sources: ["axelrod1984"],
    goals: [
      { label: "Get suckered at most once", check: (s) => count(s.rounds, "C", "D") <= 1 },
      avgAtLeast(0.9),
      { label: "Never cooperate at all", check: (s) => s.stats.humanCooperation === 0 },
    ],
  },
  {
    id: "coin",
    opponentId: "random",
    title: "THE COIN",
    briefing: "It flips a coin every round. It has no memory, so your kindness buys you nothing next round.",
    debrief:
      "Reciprocity only works on someone who remembers. Against a memoryless player, defection strictly dominates. Axelrod entered RANDOM in both tournaments as the baseline.",
    sources: ["axelrod1980a"],
    goals: [avgAtLeast(2.0), avgAtLeast(2.4), avgAtLeast(2.7)],
  },
  {
    id: "mirror",
    opponentId: "tit-for-tat",
    title: "THE MIRROR",
    briefing:
      "Tit for Tat opens with C, then copies your last move. Whatever you send out comes straight back.",
    debrief:
      "You can never outscore Tit for Tat head-to-head, yet it won both of Axelrod's tournaments. It succeeds by eliciting cooperation, not by beating anyone.",
    sources: ["axelrod1980a", "axelrod1980b"],
    goals: [avgAtLeast(2.7), comboAtLeast(8), avgAtLeast(3.0)],
  },
  {
    id: "grudge",
    opponentId: "grim-trigger",
    title: "THE GRUDGE",
    briefing: "Grim Trigger cooperates until you defect once. After that it defects forever. No second chances.",
    debrief:
      "Permanent punishment is a powerful deterrent (Friedman 1971), but one accident ends the relationship for good. In noisy worlds, grim strategies collapse.",
    sources: ["friedman1971"],
    goals: [
      { label: "Never trigger the grudge", check: (s) => s.rounds.every((round) => round.moveB === "C") },
      comboAtLeast(10),
      comboAtLeast(14),
    ],
  },
  {
    id: "cynic",
    opponentId: "suspicious-tit-for-tat",
    title: "THE CYNIC",
    briefing:
      "Suspicious Tit for Tat copies you like Tit for Tat, but it opens with a defection. Answer in kind and you'll echo forever.",
    debrief:
      "Two reciprocators can lock into alternating retaliation. Someone has to absorb one hit to break the echo; that's the case for forgiveness.",
    sources: ["boyd-lorberbaum1987"],
    goals: [comboAtLeast(3), avgAtLeast(2.5), avgAtLeast(2.8)],
  },
  {
    id: "saint",
    opponentId: "tit-for-two-tats",
    title: "THE SAINT",
    briefing: "Tit for Two Tats only retaliates after two defections in a row. How patient is too patient?",
    debrief:
      "Tit for Two Tats would have won Axelrod's first tournament. In the second, entrants knew about it and exploited its patience by defecting every other move, exactly as you just did.",
    sources: ["axelrod1980a", "axelrod1980b"],
    goals: [avgAtLeast(3.3), avgAtLeast(3.7), avgAtLeast(3.9)],
  },
  {
    id: "sneak",
    opponentId: "joss",
    title: "THE SNEAK",
    briefing: "Joss mirrors you but slips in a surprise defection 10% of the time. Can you keep the peace?",
    debrief:
      "Joss's sneaky defections set off long echoes of retaliation with Tit for Tat. It finished near the bottom of Axelrod's first tournament: exploiting a partner often costs more than it gains.",
    sources: ["axelrod1980a"],
    goals: [avgAtLeast(2.3), avgAtLeast(2.6), comboAtLeast(6)],
  },
  {
    id: "conditioner",
    opponentId: "pavlov",
    title: "THE CONDITIONER",
    briefing:
      "Pavlov repeats a move that scored well (3 or 5) and switches after a bad one (0 or 1). After mutual defection, it offers peace.",
    debrief:
      "Win-stay, lose-shift repairs mistakes between two Pavlovs, which is why it beats Tit for Tat under noise. Its weakness is that it keeps returning to cooperation against a defector.",
    sources: ["nowak-sigmund1993"],
    goals: [
      avgAtLeast(2.7),
      {
        label: "Recover from mutual defection to mutual trust",
        check: (s) => {
          const firstDD = s.rounds.findIndex((round) => round.moveA === "D" && round.moveB === "D");
          return firstDD >= 0 && s.rounds.slice(firstDD + 1).some((round) => round.moveA === "C" && round.moveB === "C");
        },
      },
      avgAtLeast(3.0),
    ],
  },
  {
    id: "detective",
    opponentId: "detective",
    title: "THE DETECTIVE",
    briefing:
      "It probes you with C, D, C, C. If you never hit back during the probe, it concludes you're a pushover and defects forever.",
    debrief:
      "Retaliation is a signal. By showing you won't be exploited, you turned the Detective into a Tit for Tat partner.",
    sources: ["case2017"],
    goals: [
      {
        label: "Retaliate during the probe and average 2.4+",
        check: (s) => s.rounds.slice(0, 4).some((round) => round.moveA === "D") && s.average >= 2.4,
      },
      avgAtLeast(2.7),
      avgAtLeast(2.9),
    ],
  },
  {
    id: "escalator",
    opponentId: "gradual",
    title: "THE ESCALATOR",
    briefing:
      "Gradual answers your n-th defection with n defections, then offers two cooperations. Every betrayal costs more than the last.",
    debrief:
      "Gradual's escalating punishments make repeated exploitation unprofitable while still forgiving. It beat Tit for Tat in its authors' tournaments.",
    sources: ["beaufils1996"],
    goals: [avgAtLeast(2.6), avgAtLeast(2.85), avgAtLeast(3.0)],
  },
  {
    id: "diplomat",
    opponentId: "generous-tit-for-tat",
    title: "THE DIPLOMAT",
    briefing:
      "Generous Tit for Tat retaliates, but forgives a defection one time in three. Trust it and it trusts you.",
    debrief:
      "One-in-three forgiveness is the optimal generosity for these payoffs (Nowak & Sigmund 1992): enough to escape accidental feuds, not enough to be worth exploiting.",
    sources: ["nowak-sigmund1992"],
    goals: [avgAtLeast(2.8), comboAtLeast(10), avgAtLeast(3.0)],
  },
  {
    id: "extortionist",
    opponentId: "extort-2",
    title: "THE EXTORTIONIST",
    briefing:
      "Extort-2 is a zero-determinant strategy: whatever you do, its surplus over mutual defection is twice yours. You cannot outscore it. Can you refuse to feed it?",
    debrief:
      "Press & Dyson showed memory-one players can enforce linear score relations. Full cooperation maximises your own score, but it feeds the extortioner. Refusing costs you too. In evolving populations extortion loses (Stewart & Plotkin 2013).",
    sources: ["press-dyson2012", "stewart-plotkin2012", "stewart-plotkin2013"],
    goals: [
      { label: "Hold Extort-2 under 2.5 per round", check: (s) => s.opponentAverage < 2.5 },
      {
        label: "…while you average 1.8+",
        check: (s) => s.opponentAverage < 2.5 && s.average >= 1.8,
      },
      { label: "Hold Extort-2 under 1.5 per round", check: (s) => s.opponentAverage < 1.5 },
    ],
  },
];

export function starsFor(stage: Stage, summary: MatchSummary) {
  const met = stage.goals.map((goal) => goal.check(summary));
  return { met, stars: met[0] ? met.filter(Boolean).length : 0 };
}

export const stageMap = Object.fromEntries(stages.map((stage) => [stage.id, stage])) as Record<string, Stage>;
