import { beforeEach, describe, expect, it } from "vitest";
import { type MatchSummary, stageMap, stages, starsFor } from "@/data/campaign";
import { getStrategy, type Move, simulateMatch, type Strategy } from "@/lib/game";
import { isStageUnlocked, levelInfo, progressStore, recordMatch, resetProgress } from "@/lib/progress";
import { computeStats } from "@/lib/use-human-match";

function policy(id: string, choose: Strategy["choose"]): Strategy {
  return { ...getStrategy("tit-for-tat"), id, choose };
}

const alternate = policy("alt", ({ round }) => (round % 2 === 0 ? "D" : "C") as Move);
const retaliateOnce = policy("probe-back", ({ round, opponentHistory }) =>
  round === 2 ? "D" : round < 2 ? "C" : opponentHistory[opponentHistory.length - 1],
);

function summaryOf(human: Strategy, opponentId: string, rounds = 20, seed = "camp"): MatchSummary {
  const match = simulateMatch(human, getStrategy(opponentId), { rounds, seed });
  const stats = computeStats(match.rounds);
  return {
    opponentId,
    rounds: match.rounds,
    stats,
    average: stats.scoreHuman / match.rounds.length,
    opponentAverage: stats.scoreOpponent / match.rounds.length,
  };
}

describe("campaign goals are reachable with the intended lesson", () => {
  const cases: [string, Strategy, number][] = [
    ["pushover", getStrategy("always-defect"), 3],
    ["bully", getStrategy("always-defect"), 3],
    ["coin", getStrategy("always-defect"), 1],
    ["mirror", getStrategy("always-cooperate"), 3],
    ["grudge", getStrategy("always-cooperate"), 3],
    ["cynic", getStrategy("always-cooperate"), 3],
    ["saint", alternate, 3],
    ["conditioner", getStrategy("always-defect"), 2],
    ["detective", retaliateOnce, 3],
    ["escalator", getStrategy("always-cooperate"), 3],
    ["diplomat", getStrategy("always-cooperate"), 3],
    ["extortionist", getStrategy("always-defect"), 2],
  ];
  it.each(cases)("%s", (stageId, human, expected) => {
    const { stars } = starsFor(stageMap[stageId], summaryOf(human, stageMap[stageId].opponentId));
    expect(stars).toBeGreaterThanOrEqual(expected);
  });

  it("naive play fails the lesson stages", () => {
    expect(starsFor(stageMap.pushover, summaryOf(getStrategy("always-cooperate"), "always-cooperate")).stars).toBe(0);
    expect(starsFor(stageMap.detective, summaryOf(getStrategy("always-cooperate"), "detective")).stars).toBe(0);
    expect(starsFor(stageMap.grudge, summaryOf(getStrategy("always-defect"), "grim-trigger")).stars).toBe(0);
  });

  it("every stage has a distinct opponent", () => {
    expect(new Set(stages.map((stage) => stage.opponentId)).size).toBe(stages.length);
  });
});

describe("progress", () => {
  beforeEach(() => resetProgress());

  it("levels up on a growing curve", () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, into: 0, needed: 150 });
    expect(levelInfo(150)).toMatchObject({ level: 2, into: 0, needed: 250 });
    expect(levelInfo(400).level).toBe(3);
  });

  it("records stars, unlocks the next stage and awards achievements", () => {
    expect(isStageUnlocked("bully", progressStore.get())).toBe(false);
    const result = recordMatch(summaryOf(getStrategy("always-defect"), "always-cooperate"), "pushover");
    expect(result.stars).toBe(3);
    const progress = progressStore.get();
    expect(progress.stars.pushover).toBe(3);
    expect(isStageUnlocked("bully", progress)).toBe(true);
    expect(progress.achievements["first-match"]).toBeTruthy();
    expect(progress.xp).toBeGreaterThan(0);
  });

  it("keeps the best star count", () => {
    recordMatch(summaryOf(getStrategy("always-defect"), "always-cooperate"), "pushover");
    recordMatch(summaryOf(getStrategy("always-cooperate"), "always-cooperate"), "pushover");
    expect(progressStore.get().stars.pushover).toBe(3);
  });

  it("unlocks behaviour achievements", () => {
    recordMatch(summaryOf(getStrategy("always-cooperate"), "tit-for-tat", 20));
    expect(progressStore.get().achievements.peacemaker).toBeTruthy();
    expect(progressStore.get().achievements["s-rank"]).toBeTruthy();
    recordMatch(summaryOf(getStrategy("always-defect"), "grim-trigger", 20));
    expect(progressStore.get().achievements["grudge-match"]).toBeTruthy();
  });
});
