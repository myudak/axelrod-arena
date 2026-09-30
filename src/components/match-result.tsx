import type { ReactNode } from "react";
import { PixelBadge } from "@/components/retro";
import type { MatchSummary } from "@/data/campaign";
import { gradeBlurb, gradeFor } from "@/lib/use-human-match";

export function MatchResult({
  summary,
  opponentName,
  xp,
  children,
}: {
  summary: MatchSummary;
  opponentName: string;
  xp?: number;
  children?: ReactNode;
}) {
  const grade = gradeFor(summary.average);
  const { scoreHuman, scoreOpponent } = summary.stats;
  return (
    <>
      <PixelBadge tone="gold">MATCH COMPLETE</PixelBadge>
      <div className={`grade-stamp grade-stamp--${grade}`} aria-label={`Grade ${grade}`}>
        {grade}
      </div>
      <p className="grade-blurb">
        {summary.average > 3.05
          ? "Ruthless. Above 3 per round only comes from exploiting their trust."
          : gradeBlurb[grade]}
      </p>
      <h2>
        {scoreHuman === scoreOpponent
          ? `EVEN AT ${scoreHuman}–${scoreOpponent}`
          : scoreHuman > scoreOpponent
            ? `YOU OUTSCORED ${opponentName} ${scoreHuman}–${scoreOpponent}`
            : `${opponentName} OUTSCORED YOU ${scoreOpponent}–${scoreHuman}`}
      </h2>
      <dl className="match-summary">
        <div>
          <dt>AVG / ROUND</dt>
          <dd>{summary.average.toFixed(2)}</dd>
        </div>
        <div>
          <dt>YOUR COOP</dt>
          <dd>{Math.round(summary.stats.humanCooperation * 100)}%</dd>
        </div>
        <div>
          <dt>BEST COMBO</dt>
          <dd>×{summary.stats.bestStreak}</dd>
        </div>
      </dl>
      {xp ? <p className="xp-gain">+{xp} XP</p> : null}
      {children}
    </>
  );
}
