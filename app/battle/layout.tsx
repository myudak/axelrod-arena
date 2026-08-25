import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Battle Replay",
  description: "Replay any two classical Prisoner's Dilemma strategies round by round.",
};

export default function BattleLayout({ children }: { children: React.ReactNode }) {
  return children;
}

