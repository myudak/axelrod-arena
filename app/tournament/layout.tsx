import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tournament",
  description: "Run a deterministic round-robin Axelrod tournament and explore the leaderboard.",
};

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
  return children;
}

