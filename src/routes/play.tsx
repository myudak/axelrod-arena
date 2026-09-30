import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router";
import { MoveChip } from "@/components/move-history";
import { PageMeta } from "@/components/page-meta";
import { PixelIcon } from "@/components/pixel-icon";
import { PixelBadge, PixelButton, PixelPanel, ScreenTitle } from "@/components/retro";
import { ScorePopups, useScorePopups } from "@/components/score-popups";
import { HumanAvatar, type Mood, StrategyAvatar } from "@/components/strategy-avatar";
import { getStrategy, isStrategyId, type Move, type RoundResult, strategies } from "@/lib/game";
import { celebrate, shake } from "@/lib/juice";
import { outcomeCue, playCue } from "@/lib/sound";
import { gradeBlurb, gradeFor, useHumanMatch } from "@/lib/use-human-match";

const outcomeText = (round: RoundResult) =>
  round.moveA === round.moveB
    ? round.moveA === "C"
      ? "MUTUAL TRUST"
      : "MUTUAL DISTRUST"
    : round.moveA === "D"
      ? "YOU EXPLOITED THEM"
      : "YOU WERE EXPLOITED";

/** How each side reacts to the last exchange. */
function moods(round: RoundResult | undefined): { human: Mood; opponent: Mood } {
  if (!round) return { human: "thinking", opponent: "idle" };
  if (round.moveA === "C" && round.moveB === "C") return { human: "happy", opponent: "happy" };
  if (round.moveA === "D" && round.moveB === "D") return { human: "mad", opponent: "mad" };
  return round.moveA === "D"
    ? { human: "smug", opponent: "sad" }
    : { human: "scared", opponent: "smug" };
}

const popupTone = (payoff: number) =>
  payoff === 5 ? "great" : payoff === 3 ? "good" : payoff === 0 ? "bad" : "neutral";

export default function PlayPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("opponent");
  const opponentId = isStrategyId(requested) ? requested : "tit-for-tat";
  const opponent = getStrategy(opponentId);
  const { rounds, finished, play, reset, stats } = useHumanMatch(opponent);
  const arenaRef = useRef<HTMLDivElement>(null);
  const humanPopups = useScorePopups();
  const opponentPopups = useScorePopups();

  const chooseOpponent = (id: string) => {
    playCue("click");
    if (id === opponentId) reset();
    else setSearchParams({ opponent: id }, { replace: true });
  };

  const playMove = useCallback(
    (move: Move) => {
      const result = play(move);
      if (!result) return;
      const { round, ended, rounds: next } = result;
      const streak = next.length ? countStreak(next) : 0;
      playCue(outcomeCue(round.moveA, round.moveB), streak);
      humanPopups.push(`+${round.payoffA}`, popupTone(round.payoffA));
      opponentPopups.push(`+${round.payoffB}`, popupTone(round.payoffB));
      if (round.moveA === "C" && round.moveB === "D") shake(arenaRef.current, "hard");
      else if (round.moveA === "D" && round.moveB === "D") shake(arenaRef.current, "soft");
      if (ended) {
        const human = next.reduce((sum, item) => sum + item.payoffA, 0);
        const rival = next.reduce((sum, item) => sum + item.payoffB, 0);
        const average = human / next.length;
        window.setTimeout(() => {
          const grade = gradeFor(average);
          if (grade === "S" || grade === "A" || human > rival) {
            playCue("win");
            celebrate(grade === "S" ? 1.3 : 0.8);
          } else if (human === rival) {
            playCue("draw");
          } else {
            playCue("lose");
          }
        }, 350);
      }
    },
    [humanPopups, opponentPopups, play],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = event.key.toLowerCase();
      if (!finished && key === "c") playMove("C");
      if (!finished && key === "d") playMove("D");
      if (finished && (key === "r" || key === "enter")) reset();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finished, playMove, reset]);

  const latest = rounds[rounds.length - 1];
  const visibleRounds = rounds.slice(-12);
  const mood = moods(latest);
  const average = rounds.length ? stats.scoreHuman / rounds.length : 0;
  const grade = gradeFor(average);

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

        <PixelPanel className="play-arena">
          <div className="match-strip">
            <PixelBadge tone="cooperate">UNKNOWN HORIZON</PixelBadge>
            {stats.streak >= 3 ? (
              <span className="combo-badge" key={stats.streak}>
                TRUST COMBO ×{stats.streak}
              </span>
            ) : (
              <span>MATCH {opponent.symbol}-01</span>
            )}
            <span>ROUND {rounds.length + (finished ? 0 : 1)}</span>
          </div>

          <div className="play-stage" ref={arenaRef}>
            <div className="play-fighters">
              <div className="play-fighter">
                <div className="fighter-portrait">
                  <StrategyAvatar strategy={opponent} mood={mood.opponent} />
                  <ScorePopups popups={opponentPopups.popups} onDone={opponentPopups.remove} />
                </div>
                <div>
                  <small>OPPONENT</small>
                  <h2>{opponent.shortName}</h2>
                  <strong className="score-counter" key={`o-${stats.scoreOpponent}`}>
                    {stats.scoreOpponent}
                  </strong>
                </div>
              </div>
              <div className="round-marker">{rounds.length || "READY"}</div>
              <div className="play-fighter play-fighter--human">
                <div>
                  <small>PLAYER 1</small>
                  <h2>YOU</h2>
                  <strong className="score-counter" key={`h-${stats.scoreHuman}`}>
                    {stats.scoreHuman}
                  </strong>
                </div>
                <div className="fighter-portrait">
                  <HumanAvatar mood={mood.human} />
                  <ScorePopups popups={humanPopups.popups} onDone={humanPopups.remove} />
                </div>
              </div>
            </div>

            <div className="round-history" aria-label="Recent move history">
              <div className="history-header">
                <span>RECENT HISTORY</span>
                <span>C = COOPERATE · D = DEFECT</span>
              </div>
              <div className="history-row">
                <b>{opponent.symbol}</b>
                {visibleRounds.length === 0 ? (
                  <span className="history-empty">AWAITING FIRST MOVE...</span>
                ) : (
                  visibleRounds.map((round) => (
                    <MoveChip key={`opp-${round.round}`} move={round.moveB} />
                  ))
                )}
              </div>
              <div className="history-row">
                <b>YOU</b>
                {visibleRounds.length === 0 ? (
                  <span className="history-empty">PRESS C OR D</span>
                ) : (
                  visibleRounds.map((round) => (
                    <MoveChip key={`you-${round.round}`} move={round.moveA} />
                  ))
                )}
              </div>
            </div>
          </div>

          {latest && !finished ? (
            <div className={`round-result round-result--${outcomeClass(latest)}`} key={latest.round}>
              <div>
                <span>LAST EXCHANGE</span>
                <strong>{outcomeText(latest)}</strong>
              </div>
              <div className="reveal-card">
                <span>YOU</span>
                <strong className={latest.moveA === "C" ? "cooperate-text" : "defect-text"}>
                  {latest.moveA} +{latest.payoffA}
                </strong>
              </div>
              <div className="reveal-card reveal-card--late">
                <span>THEM</span>
                <strong className={latest.moveB === "C" ? "cooperate-text" : "defect-text"}>
                  {latest.moveB} +{latest.payoffB}
                </strong>
              </div>
            </div>
          ) : null}

          {!finished ? (
            <div className="decision-zone">
              <div>
                <span>YOUR MOVE</span>
                <small>Actions reveal simultaneously</small>
              </div>
              <PixelButton tone="cooperate" onClick={() => playMove("C")}>
                <kbd>C</kbd> COOPERATE
              </PixelButton>
              <PixelButton tone="defect" onClick={() => playMove("D")}>
                <kbd>D</kbd> DEFECT
              </PixelButton>
            </div>
          ) : (
            <div className="match-complete">
              <PixelBadge tone="gold">MATCH COMPLETE</PixelBadge>
              <div className={`grade-stamp grade-stamp--${grade}`} aria-label={`Grade ${grade}`}>
                {grade}
              </div>
              <p className="grade-blurb">{gradeBlurb[grade]}</p>
              <h2>
                {stats.scoreHuman === stats.scoreOpponent
                  ? "DRAW GAME"
                  : stats.scoreHuman > stats.scoreOpponent
                    ? "YOU OUTSCORED THE RIVAL"
                    : `${opponent.shortName} OUTSCORED YOU`}
              </h2>
              <dl className="match-summary">
                <div>
                  <dt>AVG / ROUND</dt>
                  <dd>{average.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>YOUR COOP</dt>
                  <dd>{Math.round(stats.humanCooperation * 100)}%</dd>
                </div>
                <div>
                  <dt>BEST COMBO</dt>
                  <dd>×{stats.bestStreak}</dd>
                </div>
              </dl>
              <p>
                <strong>{opponent.name}:</strong> {opponent.rule}
              </p>
              <div className="complete-actions">
                <PixelButton onClick={() => { playCue("click"); reset(); }}>REMATCH</PixelButton>
                <PixelButton tone="quiet" onClick={() => chooseOpponent("random")}>
                  FIGHT RANDOM
                </PixelButton>
              </div>
            </div>
          )}
        </PixelPanel>
      </div>
    </main>
  );
}

function outcomeClass(round: RoundResult) {
  if (round.moveA === "C" && round.moveB === "C") return "trust";
  if (round.moveA === "D" && round.moveB === "D") return "distrust";
  return round.moveA === "D" ? "exploit" : "betrayed";
}

function countStreak(rounds: RoundResult[]) {
  let streak = 0;
  for (let index = rounds.length - 1; index >= 0; index -= 1) {
    if (rounds[index].moveA !== "C" || rounds[index].moveB !== "C") break;
    streak += 1;
  }
  return streak;
}
