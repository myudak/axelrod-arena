import { achievementMap, achievements } from "@/data/achievements";
import { type MatchSummary, stageMap, stages, starsFor } from "@/data/campaign";
import { playCue } from "@/lib/sound";
import { createPersistentStore, useStore } from "@/lib/store";
import { pushToast } from "@/lib/toasts";
import { gradeFor } from "@/lib/use-human-match";

export interface Progress {
  version: 1;
  xp: number;
  /** Best stars per campaign stage id. */
  stars: Record<string, number>;
  /** Achievement id → unlock timestamp. */
  achievements: Record<string, number>;
  stats: {
    matchesPlayed: number;
    roundsPlayed: number;
    cooperations: number;
    bestStreak: number;
    sRanks: number;
    tournamentsRun: number;
    predictionsMade: number;
    predictionsCorrect: number;
    championPicks: number;
    championPicksCorrect: number;
  };
}

const initialProgress: Progress = {
  version: 1,
  xp: 0,
  stars: {},
  achievements: {},
  stats: {
    matchesPlayed: 0,
    roundsPlayed: 0,
    cooperations: 0,
    bestStreak: 0,
    sRanks: 0,
    tournamentsRun: 0,
    predictionsMade: 0,
    predictionsCorrect: 0,
    championPicks: 0,
    championPicksCorrect: 0,
  },
};

export const progressStore = createPersistentStore<Progress>(
  "axelrod:progress",
  initialProgress,
  (raw, initial) => {
    if (!raw || typeof raw !== "object" || (raw as Progress).version !== 1) return initial;
    const saved = raw as Progress;
    return { ...initial, ...saved, stats: { ...initial.stats, ...saved.stats } };
  },
);

export function useProgress() {
  return useStore(progressStore);
}

export const LEVEL_TITLES = [
  "ROOKIE",
  "BARGAINER",
  "NEGOTIATOR",
  "DIPLOMAT",
  "STRATEGIST",
  "GAME THEORIST",
  "TOURNAMENT VETERAN",
  "AXELROD'S HEIR",
];

/** XP needed to go from level n to n + 1 grows linearly: 150, 250, 350, ... */
export function levelInfo(xp: number) {
  let level = 1;
  let floor = 0;
  let step = 150;
  while (xp >= floor + step) {
    floor += step;
    level += 1;
    step += 100;
  }
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    into: xp - floor,
    needed: step,
    progress: (xp - floor) / step,
  };
}

function grantXp(amount: number) {
  if (amount <= 0) return;
  const before = levelInfo(progressStore.get().xp).level;
  progressStore.set((current) => ({ ...current, xp: current.xp + amount }));
  const after = levelInfo(progressStore.get().xp);
  if (after.level > before) {
    playCue("levelup");
    pushToast({ title: `LEVEL ${after.level}!`, body: after.title, icon: "star", tone: "gold" });
  }
}

export function unlock(id: string) {
  const achievement = achievementMap[id];
  if (!achievement || progressStore.get().achievements[id]) return false;
  progressStore.set((current) => ({
    ...current,
    achievements: { ...current.achievements, [id]: Date.now() },
  }));
  playCue("unlock");
  pushToast({
    title: achievement.title,
    body: `${achievement.description} +${achievement.xp} XP`,
    icon: achievement.icon,
    tone: "gold",
  });
  grantXp(achievement.xp);
  return true;
}

function matchAchievements(summary: MatchSummary) {
  const { rounds, stats } = summary;
  const earned: string[] = ["first-match"];
  if (stats.bestStreak >= 10) earned.push("peacemaker");
  let streak = 0;
  let cheeks = 0;
  rounds.forEach((round, index) => {
    if (streak >= 5 && round.moveA === "D") earned.push("backstabber");
    streak = round.moveA === "C" && round.moveB === "C" ? streak + 1 : 0;
    const previous = rounds[index - 1];
    if (previous && previous.moveA === "C" && previous.moveB === "D" && round.moveA === "C") cheeks += 1;
  });
  if (cheeks >= 3) earned.push("turn-the-cheek");
  if (summary.opponentId === "grim-trigger" && rounds.some((round) => round.moveA === "D")) {
    earned.push("grudge-match");
  }
  if (gradeFor(summary.average) === "S") earned.push("s-rank");
  if (summary.opponentId === "extort-2" && summary.opponentAverage < 2.5) earned.push("extortion-refused");
  return earned;
}

const GRADE_XP = { S: 60, A: 35, B: 20, C: 8, D: 0 } as const;

/**
 * Records a finished human match: stats, XP, achievements and (for campaign
 * matches) stars. Returns what changed so the UI can celebrate it.
 */
export function recordMatch(summary: MatchSummary, stageId?: string) {
  const { rounds, stats } = summary;
  const grade = gradeFor(summary.average);
  const previousStars = stageId ? (progressStore.get().stars[stageId] ?? 0) : 0;
  const stageResult = stageId ? starsFor(stageMap[stageId], summary) : undefined;
  const newStars = stageResult ? Math.max(0, stageResult.stars - previousStars) : 0;

  progressStore.set((current) => ({
    ...current,
    stars:
      stageId && stageResult && stageResult.stars > previousStars
        ? { ...current.stars, [stageId]: stageResult.stars }
        : current.stars,
    stats: {
      ...current.stats,
      matchesPlayed: current.stats.matchesPlayed + 1,
      roundsPlayed: current.stats.roundsPlayed + rounds.length,
      cooperations: current.stats.cooperations + rounds.filter((round) => round.moveA === "C").length,
      bestStreak: Math.max(current.stats.bestStreak, stats.bestStreak),
      sRanks: current.stats.sRanks + (grade === "S" ? 1 : 0),
    },
  }));

  const xp = rounds.length + GRADE_XP[grade] + newStars * 40 + (previousStars === 0 && newStars > 0 ? 60 : 0);
  grantXp(xp);

  for (const id of matchAchievements(summary)) unlock(id);
  const progress = progressStore.get();
  if (progress.stats.roundsPlayed >= 300) unlock("marathon");
  if (stages.every((stage) => (progress.stars[stage.id] ?? 0) >= 1)) unlock("campaign-clear");
  if (stages.every((stage) => (progress.stars[stage.id] ?? 0) >= 3)) unlock("perfectionist");

  return { xp, grade, stars: stageResult?.stars ?? 0, met: stageResult?.met, newStars };
}

/** Records predictions from battle predict mode; the Seer badge is judged per session. */
export function recordPredictions(made: number, correct: number, session: { made: number; correct: number }) {
  progressStore.set((current) => ({
    ...current,
    stats: {
      ...current.stats,
      predictionsMade: current.stats.predictionsMade + made,
      predictionsCorrect: current.stats.predictionsCorrect + correct,
    },
  }));
  grantXp(correct);
  if (session.made >= 40 && session.correct / session.made >= 0.8) unlock("seer");
}

export function recordTournament({
  pick,
  champion,
  customTop3,
  noisy,
}: {
  pick?: string | null;
  champion: string;
  customTop3: boolean;
  noisy: boolean;
}) {
  const correct = Boolean(pick) && pick === champion;
  progressStore.set((current) => ({
    ...current,
    stats: {
      ...current.stats,
      tournamentsRun: current.stats.tournamentsRun + 1,
      championPicks: current.stats.championPicks + (pick ? 1 : 0),
      championPicksCorrect: current.stats.championPicksCorrect + (correct ? 1 : 0),
    },
  }));
  grantXp(10 + (correct ? 40 : 0));
  if (correct) unlock("oracle");
  if (customTop3) unlock("architect");
  if (noisy) unlock("noise-scientist");
  return { correct };
}

export function isStageUnlocked(stageId: string, progress: Progress) {
  const index = stages.findIndex((stage) => stage.id === stageId);
  return index <= 0 || (progress.stars[stages[index - 1].id] ?? 0) >= 1;
}

export function resetProgress() {
  progressStore.set(initialProgress);
}

export const totalAchievements = achievements.length;
