import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Play",
  description: "Play the Iterated Prisoner's Dilemma against a classical Axelrod strategy.",
};

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return children;
}

