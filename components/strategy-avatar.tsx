import { Blobatar } from "@blobatar/react";
import {
  happy,
  idle,
  mad,
  smug,
  surprised,
  thinking,
  unsure,
  wink,
} from "blobatar/expression";
import "blobatar/motion.css";
import type { Strategy } from "@/lib/game";

const expressions = {
  "always-cooperate": happy,
  "always-defect": mad,
  random: surprised,
  "tit-for-tat": idle,
  "suspicious-tit-for-tat": unsure,
  "grim-trigger": mad,
  "generous-tit-for-tat": happy,
  pavlov: smug,
  joss: wink,
  detective: thinking,
} as const;

export function StrategyAvatar({
  strategy,
  size = "large",
}: {
  strategy: Strategy;
  size?: "small" | "medium" | "large";
}) {
  return (
    <div
      className={`strategy-avatar strategy-avatar--${size}`}
      aria-label={`${strategy.name} portrait`}
      role="img"
    >
      <Blobatar
        name={`axelrod:${strategy.id}`}
        expression={expressions[strategy.id as keyof typeof expressions] ?? idle}
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

export function HumanAvatar() {
  return (
    <div className="strategy-avatar strategy-avatar--large human-avatar" aria-label="Your player portrait" role="img">
      <Blobatar
        name="axelrod:human-player"
        expression={thinking}
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
