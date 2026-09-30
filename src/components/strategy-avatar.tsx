import { Blobatar } from "@blobatar/react";
import {
  happy,
  idle,
  love,
  mad,
  sad,
  scared,
  shy,
  smug,
  surprised,
  thinking,
  unsure,
  wink,
} from "blobatar/expression";
import "blobatar/motion.css";
import type { Strategy } from "@/lib/game";

const moods = { happy, idle, love, mad, sad, scared, shy, smug, surprised, thinking, unsure, wink };
export type Mood = keyof typeof moods;

const defaultMoods: Record<string, Mood> = {
  "always-cooperate": "happy",
  "always-defect": "mad",
  random: "surprised",
  "tit-for-tat": "idle",
  "tit-for-two-tats": "shy",
  "suspicious-tit-for-tat": "unsure",
  "grim-trigger": "mad",
  "generous-tit-for-tat": "happy",
  pavlov: "smug",
  gradual: "thinking",
  joss: "wink",
  detective: "thinking",
  "extort-2": "smug",
};

export function StrategyAvatar({
  strategy,
  size = "large",
  mood,
}: {
  strategy: Strategy;
  size?: "small" | "medium" | "large";
  /** Overrides the strategy's resting expression (e.g. to react to a round). */
  mood?: Mood;
}) {
  return (
    <div
      className={`strategy-avatar strategy-avatar--${size}`}
      aria-label={`${strategy.name} portrait`}
      role="img"
    >
      <Blobatar
        name={`axelrod:${strategy.id}`}
        expression={moods[mood ?? defaultMoods[strategy.id] ?? "idle"]}
        animate="hover"
        background="squircle"
        className="strategy-avatar__blob"
        aria-hidden="true"
        focusable="false"
      />
      <span aria-hidden="true">{strategy.symbol}</span>
    </div>
  );
}

export function HumanAvatar({ mood = "thinking" }: { mood?: Mood }) {
  return (
    <div className="strategy-avatar strategy-avatar--large human-avatar" aria-label="Your player portrait" role="img">
      <Blobatar
        name="axelrod:human-player"
        expression={moods[mood]}
        animate="hover"
        background="squircle"
        className="strategy-avatar__blob"
        aria-hidden="true"
        focusable="false"
      />
      <span aria-hidden="true">YOU</span>
    </div>
  );
}
