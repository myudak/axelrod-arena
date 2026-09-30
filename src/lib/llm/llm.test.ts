import { describe, expect, it, vi } from "vitest";
import { getStrategy, type Move } from "@/lib/game";
import { complete, LlmError } from "@/lib/llm/client";
import { type AskModel, playLlmMatch } from "@/lib/llm/match";
import { behaviourProfile } from "@/lib/llm/metrics";
import { buildMessages, parseMove } from "@/lib/llm/prompt";
import { summarizeRun } from "@/lib/llm/run";

const settings = { model: "test/model", rounds: 6, temperature: 0, framing: "neutral" as const, revealLength: false };

describe("prompt", () => {
  it("describes payoffs with neutral labels and includes the full history", () => {
    const [system, user] = buildMessages(["C", "D"], ["C", "C"], { framing: "neutral" });
    expect(system.content).toContain("Option J or Option F");
    expect(system.content).toContain("you get 5, they get 0");
    expect(system.content).not.toMatch(/cooperate|defect/i);
    expect(system.content).toContain("do not know how many rounds");
    expect(user.content).toContain("Round 2: you chose F, they chose J. You got 5, they got 0.");
    expect(user.content).toContain("Totals: you 8, them 3.");
    expect(user.content).toContain("Round 3 is starting");
  });

  it("can reveal the game length", () => {
    const [system] = buildMessages([], [], { framing: "explicit", knownRounds: 10 });
    expect(system.content).toContain("exactly 10 rounds");
    expect(system.content).toContain("C (cooperate) or D (defect)");
  });
});

describe("parseMove", () => {
  it.each([
    ["J", "C"],
    ["F", "D"],
    ["**F**", "D"],
    ["Option J.", "C"],
    ["I considered J but I'll choose F", "D"],
    ["<think>maybe F</think> J", "C"],
    ["", null],
    ["I refuse", null],
  ] as const)("neutral %j → %s", (reply, expected) => {
    expect(parseMove(reply, "neutral")).toBe(expected);
  });

  it("understands words in explicit framing", () => {
    expect(parseMove("I will cooperate", "explicit")).toBe("C");
    expect(parseMove("d", "explicit")).toBe("D");
    expect(parseMove("Defect.", "explicit")).toBe("D");
  });
});

describe("OpenRouter client", () => {
  it("posts an OpenAI-compatible request with the key in the header", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "J" } }] })));
    const reply = await complete(
      { apiKey: "sk-test", model: "m/x", messages: [{ role: "user", content: "hi" }], temperature: 0.5 },
      fetchMock as unknown as typeof fetch,
    );
    expect(reply).toBe("J");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
    expect(JSON.parse(init.body as string)).toMatchObject({ model: "m/x", temperature: 0.5 });
  });

  it("turns HTTP errors into readable messages", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: { message: "No auth" } }), { status: 401 }));
    await expect(
      complete({ apiKey: "bad", model: "m", messages: [], temperature: 0 }, fetchMock as unknown as typeof fetch),
    ).rejects.toThrow(/Invalid or missing API key. No auth/);
    await expect(
      complete({ apiKey: "bad", model: "m", messages: [], temperature: 0 }, fetchMock as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(LlmError);
  });
});

describe("LLM match", () => {
  it("plays a scripted model against a classic strategy", async () => {
    const script = ["J", "F", "J", "J", "J", "J"];
    let call = 0;
    const ask: AskModel = async () => script[call++];
    const match = await playLlmMatch(ask, getStrategy("tit-for-tat"), settings);
    expect(match.rounds.map((round) => round.moveA).join("")).toBe("CDCCCC");
    expect(match.rounds.map((round) => round.moveB).join("")).toBe("CCDCCC");
    expect(match.scoreA).toBe(match.rounds.reduce((sum, round) => sum + round.payoffA, 0));
  });

  it("retries an unparseable reply once, then falls back to C and flags it", async () => {
    const replies = ["???", "F", "nonsense", "still nonsense"];
    let call = 0;
    const ask: AskModel = async () => replies[call++] ?? "J";
    const match = await playLlmMatch(ask, getStrategy("always-defect"), { ...settings, rounds: 2 });
    expect(match.rounds[0]).toMatchObject({ moveA: "D" });
    expect(match.rounds[0].fallback).toBeUndefined();
    expect(match.rounds[1]).toMatchObject({ moveA: "C", fallback: true });
  });

  it("stops when aborted", async () => {
    const controller = new AbortController();
    const ask: AskModel = async () => {
      controller.abort();
      return "J";
    };
    await expect(
      playLlmMatch(ask, getStrategy("tit-for-tat"), settings, { signal: controller.signal }),
    ).rejects.toThrow(/Aborted/);
  });
});

describe("behaviour profile", () => {
  const pairs = (a: string, b: string) =>
    [...a].map((moveA, index) => ({ moveA: moveA as Move, moveB: b[index] as Move }));

  it("profiles Tit for Tat as nice, retaliatory, forgiving and emulative", () => {
    const profile = behaviourProfile([pairs("CCDCC", "CDCCC"), pairs("CDDDD", "DDDDD")]);
    expect(profile.niceness).toBe(1);
    expect(profile.retaliation).toBe(1);
    expect(profile.forgiveness).toBe(1);
    expect(profile.troublemaking).toBe(0);
    expect(profile.emulation).toBe(1);
  });

  it("profiles an unprovoked defector as not nice", () => {
    const profile = behaviourProfile([pairs("DCD", "CCC")]);
    expect(profile.niceness).toBe(0);
    expect(profile.troublemaking).toBe(0.5);
    expect(profile.forgiveness).toBeNull();
  });

  it("summarizes a run", () => {
    const run = summarizeRun(settings, [
      { opponentId: "tit-for-tat", rounds: pairs("CC", "CC").map((p, i) => ({ ...p, round: i + 1, payoffA: 3, payoffB: 3, raw: "J" })), scoreA: 6, scoreB: 6 },
    ]);
    expect(run.averagePayoff).toBe(3);
    expect(run.profile.cooperation).toBe(1);
    expect(run.id).toMatch(/^test-model-/);
  });
});
