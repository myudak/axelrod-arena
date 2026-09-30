import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { MatchArena } from "@/components/match-arena";
import { MatchResult } from "@/components/match-result";
import { PageMeta } from "@/components/page-meta";
import { PixelIcon } from "@/components/pixel-icon";
import { PixelButton, PixelPanel, ScreenTitle } from "@/components/retro";
import { StrategyAvatar } from "@/components/strategy-avatar";
import { getStrategy, isStrategyId, strategies } from "@/lib/game";
import { recordMatch } from "@/lib/progress";
import { playCue } from "@/lib/sound";
import { gradeFor } from "@/lib/use-human-match";

export default function PlayPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("opponent");
  const opponentId = isStrategyId(requested) ? requested : "tit-for-tat";
  const opponent = getStrategy(opponentId);
  const [lastXp, setLastXp] = useState(0);
  const [matchNumber, setMatchNumber] = useState(0);

  const chooseOpponent = (id: string) => {
    playCue("click");
    if (id === opponentId) setMatchNumber((value) => value + 1);
    else setSearchParams({ opponent: id }, { replace: true });
  };

  return (
    <main className="app-shell">
      <PageMeta
        title="Play"
        description="Play the Iterated Prisoner's Dilemma against a classical Axelrod strategy."
      />
      <ScreenTitle
        title="YOU ENTER THE ARENA"
        description="Choose a rival, then build a relationship one simultaneous decision at a time. The ending is unknown: there is always a possible next round."
      />
      <p className="mode-callout">
        <PixelIcon name="trophy" size={14} /> New here? The{" "}
        <Link to="/campaign" className="text-link">CAMPAIGN</Link> teaches each rival one lesson at a time.
      </p>

      <div className="play-layout">
        <PixelPanel className="opponent-picker">
          <div className="panel-heading">
            <span>SELECT OPPONENT</span>
            <b>{strategies.length} READY</b>
          </div>
          <div className="opponent-list">
            {strategies.map((strategy) => (
              <button
                key={strategy.id}
                className={strategy.id === opponentId ? "is-selected" : ""}
                aria-pressed={strategy.id === opponentId}
                onClick={() => chooseOpponent(strategy.id)}
              >
                <StrategyAvatar strategy={strategy} size="small" />
                <span>
                  <strong>{strategy.shortName}</strong>
                  <small>{strategy.tagline}</small>
                </span>
                <i aria-hidden="true">
                  {strategy.id === opponentId ? <PixelIcon name="play" size={12} /> : null}
                </i>
              </button>
            ))}
          </div>
        </PixelPanel>

        <MatchArena
          key={`${opponentId}:${matchNumber}`}
          opponent={opponent}
          onFinish={(summary) => {
            const result = recordMatch(summary);
            setLastXp(result.xp);
            const grade = gradeFor(summary.average);
            return grade === "S" ? "great" : grade === "A" || summary.stats.scoreHuman > summary.stats.scoreOpponent ? "good" : grade === "B" ? "neutral" : "bad";
          }}
          renderComplete={(summary, { reset }) => (
            <MatchResult summary={summary} opponentName={opponent.shortName} xp={lastXp}>
              <p>
                <strong>{opponent.name}:</strong> {opponent.rule}
              </p>
              <div className="complete-actions">
                <PixelButton onClick={reset}>
                  <kbd>R</kbd> REMATCH
                </PixelButton>
                <PixelButton tone="quiet" onClick={() => chooseOpponent("random")}>
                  FIGHT RANDOM
                </PixelButton>
              </div>
            </MatchResult>
          )}
        />
      </div>
    </main>
  );
}
