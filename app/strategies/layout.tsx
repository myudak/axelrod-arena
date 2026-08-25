import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strategy Encyclopedia",
  description: "Explore ten classical Iterated Prisoner's Dilemma strategies and their decision rules.",
};

export default function StrategiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
