import type { PixelIconName } from "@/components/pixel-icon";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** Shown while locked; keeps the surprise without being cryptic. */
  hint: string;
  icon: PixelIconName;
  xp: number;
}

export const achievements: Achievement[] = [
  { id: "first-match", title: "FIRST CONTACT", description: "Finish your first match.", hint: "Play any match to the end.", icon: "play", xp: 50 },
  { id: "peacemaker", title: "PEACEMAKER", description: "Hold mutual cooperation for 10 rounds in a row.", hint: "Build a long streak of trust.", icon: "heart", xp: 100 },
  { id: "backstabber", title: "BACKSTABBER", description: "Defect right after 5+ rounds of mutual trust.", hint: "Betray a long friendship.", icon: "bolt", xp: 50 },
  { id: "turn-the-cheek", title: "TURN THE CHEEK", description: "Cooperate right after being suckered, three times in one match.", hint: "Answer betrayal with kindness, repeatedly.", icon: "heart", xp: 75 },
  { id: "grudge-match", title: "GRUDGE MATCH", description: "Trigger Grim Trigger's permanent retaliation.", hint: "Some opponents never forget.", icon: "close", xp: 50 },
  { id: "s-rank", title: "S RANK", description: "Earn an S grade (≥ 2.9 points per round).", hint: "Finish a match near the cooperative optimum.", icon: "star", xp: 100 },
  { id: "marathon", title: "MARATHON", description: "Play 300 rounds in total.", hint: "Keep playing.", icon: "trophy", xp: 100 },
  { id: "extortion-refused", title: "UNBENDING", description: "Hold Extort-2 below 2.5 points per round.", hint: "Stand up to a zero-determinant bully.", icon: "lock", xp: 100 },
  { id: "campaign-clear", title: "LADDER CLEARED", description: "Complete every campaign stage.", hint: "Climb the whole campaign ladder.", icon: "trophy", xp: 250 },
  { id: "perfectionist", title: "PERFECTIONIST", description: "Earn all three stars on every campaign stage.", hint: "Every bonus goal, everywhere.", icon: "star", xp: 500 },
  { id: "oracle", title: "ORACLE", description: "Correctly predict a tournament champion.", hint: "Pick the winner before the tournament runs.", icon: "trophy", xp: 100 },
  { id: "seer", title: "SEER", description: "Predict 80%+ of moves across 20+ rounds of a battle replay.", hint: "Try predict mode in Battle.", icon: "star", xp: 100 },
  { id: "architect", title: "ARCHITECT", description: "Have a custom strategy finish top 3 in a tournament.", hint: "Build a strategy in the Lab.", icon: "bolt", xp: 150 },
  { id: "noise-scientist", title: "NOISE SCIENTIST", description: "Run a tournament where moves are flipped by noise.", hint: "Mistakes change everything.", icon: "dice", xp: 75 },
  { id: "evolutionist", title: "EVOLUTIONIST", description: "Run an ecological simulation for 100 generations.", hint: "Let the population evolve.", icon: "heart", xp: 75 },
  { id: "lab-rat", title: "MACHINE WHISPERER", description: "Put a language model in the arena.", hint: "Visit the LLM Lab.", icon: "bolt", xp: 100 },
];

export const achievementMap = Object.fromEntries(
  achievements.map((achievement) => [achievement.id, achievement]),
) as Record<string, Achievement>;
