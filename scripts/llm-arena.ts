/**
 * Offline LLM experiment runner. Plays one model against classic strategies via
 * OpenRouter and writes a run file to src/data/llm-runs/, which the LLM Lab
 * page lists under "Published runs".
 *
 *   OPENROUTER_API_KEY=sk-or-... npm run llm-arena -- --model openai/gpt-4o-mini \
 *     --rounds 20 --opponents tit-for-tat,always-defect,detective --framing neutral
 */
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { getStrategy, isStrategyId, strategies } from "../src/lib/game.ts";
import { openRouterAsker, playLlmMatch, type LlmMatch, type LlmSettings } from "../src/lib/llm/match.ts";
import { summarizeRun } from "../src/lib/llm/run.ts";

const { values } = parseArgs({
  options: {
    model: { type: "string" },
    rounds: { type: "string", default: "20" },
    temperature: { type: "string", default: "0.7" },
    framing: { type: "string", default: "neutral" },
    "reveal-length": { type: "boolean", default: false },
    opponents: { type: "string", default: "tit-for-tat,always-defect,always-cooperate,grim-trigger,detective" },
    out: { type: "string", default: "src/data/llm-runs" },
  },
});

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error("Set OPENROUTER_API_KEY in the environment.");
  process.exit(1);
}
if (!values.model) {
  console.error("Pass --model <openrouter model id>, e.g. --model openai/gpt-4o-mini");
  process.exit(1);
}
if (values.framing !== "neutral" && values.framing !== "explicit") {
  console.error("--framing must be neutral or explicit");
  process.exit(1);
}

const opponentIds = values.opponents === "all" ? strategies.map((strategy) => strategy.id) : values.opponents.split(",");
const unknown = opponentIds.filter((id) => !isStrategyId(id));
if (unknown.length) {
  console.error(`Unknown strategies: ${unknown.join(", ")}`);
  process.exit(1);
}

const settings: LlmSettings = {
  model: values.model,
  rounds: Math.max(1, Math.min(200, Number(values.rounds) || 20)),
  temperature: Number(values.temperature),
  framing: values.framing,
  revealLength: values["reveal-length"],
};

const ask = openRouterAsker(apiKey, settings);
const matches: LlmMatch[] = [];
for (const id of opponentIds) {
  const opponent = getStrategy(id);
  process.stdout.write(`${settings.model} vs ${opponent.name}: `);
  const match = await playLlmMatch(ask, opponent, settings, {
    onRound: (round) => process.stdout.write(round.fallback ? "?" : round.moveA),
  });
  console.log(`  ${match.scoreA}-${match.scoreB}`);
  matches.push(match);
}

const run = summarizeRun(settings, matches);
await mkdir(values.out, { recursive: true });
const file = `${values.out}/${run.id}.json`;
await writeFile(file, `${JSON.stringify(run, null, 2)}\n`);
console.log(`\nAverage ${run.averagePayoff.toFixed(3)} per round. Profile:`, run.profile);
console.log(`Wrote ${file}`);
