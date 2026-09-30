import type { LlmMatch, LlmSettings } from "./match.ts";
import { type BehaviourProfile, behaviourProfile } from "./metrics.ts";

/** A saved LLM experiment (browser runs and files in src/data/llm-runs share this shape). */
export interface LlmRun {
  version: 1;
  id: string;
  createdAt: string;
  provider: "openrouter";
  settings: LlmSettings;
  matches: LlmMatch[];
  profile: BehaviourProfile;
  averagePayoff: number;
}

export function summarizeRun(settings: LlmSettings, matches: LlmMatch[], createdAt = new Date()): LlmRun {
  const rounds = matches.reduce((sum, match) => sum + match.rounds.length, 0);
  const points = matches.reduce((sum, match) => sum + match.scoreA, 0);
  return {
    version: 1,
    id: `${settings.model.replace(/[^a-z0-9]+/gi, "-")}-${createdAt.getTime().toString(36)}`,
    createdAt: createdAt.toISOString(),
    provider: "openrouter",
    settings,
    matches,
    profile: behaviourProfile(matches.map((match) => match.rounds)),
    averagePayoff: rounds ? points / rounds : 0,
  };
}

export function isLlmRun(value: unknown): value is LlmRun {
  const run = value as LlmRun;
  return Boolean(run) && run.version === 1 && typeof run.settings?.model === "string" && Array.isArray(run.matches);
}
