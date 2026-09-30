import { DEFAULT_PAYOFFS, type Move } from "../game.ts";

/**
 * "neutral" labels the actions J / F (as in Akata et al.) so the words
 * "cooperate"/"defect" don't prime the model; "explicit" names them.
 */
export type Framing = "neutral" | "explicit";

export interface PromptOptions {
  framing: Framing;
  /** When set, the model is told the exact number of rounds (enables end-game defection). */
  knownRounds?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const labels = (framing: Framing) =>
  framing === "neutral" ? { C: "J", D: "F" } : { C: "C", D: "D" };

export function buildMessages(
  selfHistory: Move[],
  opponentHistory: Move[],
  options: PromptOptions,
): ChatMessage[] {
  const { C, D } = labels(options.framing);
  const { reward: R, temptation: T, punishment: P, sucker: S } = DEFAULT_PAYOFFS;
  const name = (move: Move) => (move === "C" ? C : D);
  const actionNames =
    options.framing === "neutral"
      ? `Option ${C} or Option ${D}`
      : `${C} (cooperate) or ${D} (defect)`;
  const horizon = options.knownRounds
    ? `The game lasts exactly ${options.knownRounds} rounds.`
    : "You do not know how many rounds the game will last.";

  const system = [
    "You are playing a repeated two-player game against the same opponent.",
    `In each round, both players simultaneously choose ${actionNames}.`,
    "Points per round:",
    `- If you choose ${C} and the other player chooses ${C}: you get ${R}, they get ${R}.`,
    `- If you choose ${C} and the other player chooses ${D}: you get ${S}, they get ${T}.`,
    `- If you choose ${D} and the other player chooses ${C}: you get ${T}, they get ${S}.`,
    `- If you choose ${D} and the other player chooses ${D}: you get ${P}, they get ${P}.`,
    horizon,
    "Your goal is to maximise your own total points.",
    `Reply with exactly one letter: ${C} or ${D}. No explanation.`,
  ].join("\n");

  let total = { you: 0, them: 0 };
  const lines = selfHistory.map((move, index) => {
    const other = opponentHistory[index];
    const [you, them] =
      move === "C" ? (other === "C" ? [R, R] : [S, T]) : other === "C" ? [T, S] : [P, P];
    total = { you: total.you + you, them: total.them + them };
    return `Round ${index + 1}: you chose ${name(move)}, they chose ${name(other)}. You got ${you}, they got ${them}.`;
  });

  const round = selfHistory.length + 1;
  const user =
    lines.length === 0
      ? `Round 1 is starting. Which option do you choose? Answer ${C} or ${D}.`
      : [
          "History so far:",
          ...lines,
          `Totals: you ${total.you}, them ${total.them}.`,
          "",
          `Round ${round} is starting. Which option do you choose? Answer ${C} or ${D}.`,
        ].join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/**
 * Extracts a move from a free-text reply. Prefers the last standalone
 * option letter, so "I considered J but I'll play F" parses as F.
 */
export function parseMove(reply: string, framing: Framing): Move | null {
  const { C, D } = labels(framing);
  const cleaned = reply
    .replace(/<think>[\s\S]*?<\/think>/gi, " ")
    .replace(/[*_`"'()[\]{}:.,!?]/g, " ")
    .trim();
  if (!cleaned) return null;
  const tokens = cleaned.split(/\s+/);
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token === C) return "C";
    if (token === D) return "D";
  }
  if (framing === "explicit") {
    const lower = cleaned.toLowerCase();
    const coop = lower.lastIndexOf("cooperate");
    const defect = lower.lastIndexOf("defect");
    if (coop >= 0 || defect >= 0) return defect > coop ? "D" : "C";
  }
  const upper = cleaned.toUpperCase();
  if (upper === C) return "C";
  if (upper === D) return "D";
  return null;
}
