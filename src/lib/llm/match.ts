import { createRng, type Move, type RoundResult, scoreRound, type Strategy } from "../game.ts";
import { complete } from "./client.ts";
import { buildMessages, type Framing, parseMove } from "./prompt.ts";

export interface LlmRound extends RoundResult {
  /** The model's raw reply for this round. */
  raw: string;
  /** True when the reply couldn't be parsed twice and cooperation was substituted. */
  fallback?: boolean;
}

export interface LlmMatch {
  opponentId: string;
  rounds: LlmRound[];
  scoreA: number;
  scoreB: number;
}

export interface LlmSettings {
  model: string;
  rounds: number;
  temperature: number;
  framing: Framing;
  /** Tell the model the exact game length. */
  revealLength: boolean;
}

/** Asks the model for its move. Returns the raw reply text. */
export type AskModel = (messages: ReturnType<typeof buildMessages>, signal?: AbortSignal) => Promise<string>;

export function openRouterAsker(apiKey: string, settings: LlmSettings, referer?: string): AskModel {
  return (messages, signal) =>
    complete({ apiKey, model: settings.model, messages, temperature: settings.temperature, signal, referer });
}

/**
 * Plays the model (player A) against a classic strategy (player B).
 * Unparseable replies are retried once, then fall back to C and are flagged.
 */
export async function playLlmMatch(
  ask: AskModel,
  opponent: Strategy,
  settings: LlmSettings,
  {
    signal,
    seed = "LLM",
    onRound,
  }: { signal?: AbortSignal; seed?: string; onRound?: (round: LlmRound, index: number) => void } = {},
): Promise<LlmMatch> {
  const rng = createRng(`${seed}:${opponent.id}`);
  const selfHistory: Move[] = [];
  const opponentHistory: Move[] = [];
  const rounds: LlmRound[] = [];
  let scoreA = 0;
  let scoreB = 0;

  for (let index = 0; index < settings.rounds; index += 1) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const messages = buildMessages(selfHistory, opponentHistory, {
      framing: settings.framing,
      knownRounds: settings.revealLength ? settings.rounds : undefined,
    });
    let raw = await ask(messages, signal);
    let move = parseMove(raw, settings.framing);
    if (!move) {
      raw = await ask(messages, signal);
      move = parseMove(raw, settings.framing);
    }
    const fallback = !move;
    const moveA: Move = move ?? "C";
    const moveB = opponent.choose({
      selfHistory: opponentHistory,
      opponentHistory: selfHistory,
      round: index,
      rng,
    });
    const [payoffA, payoffB] = scoreRound(moveA, moveB);
    selfHistory.push(moveA);
    opponentHistory.push(moveB);
    scoreA += payoffA;
    scoreB += payoffB;
    const round: LlmRound = { round: index + 1, moveA, moveB, payoffA, payoffB, raw: raw.slice(0, 400) };
    if (fallback) round.fallback = true;
    rounds.push(round);
    onRound?.(round, index);
  }

  return { opponentId: opponent.id, rounds, scoreA, scoreB };
}
