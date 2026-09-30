import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { MoveChip } from "@/components/move-history";
import { PixelBadge, PixelButton, PixelPanel } from "@/components/retro";
import { ScorePopups, useScorePopups } from "@/components/score-popups";
import { HumanAvatar, type Mood, StrategyAvatar } from "@/components/strategy-avatar";
import type { MatchSummary } from "@/data/campaign";
import type { Move, RoundResult, Strategy } from "@/lib/game";
import { celebrate, shake } from "@/lib/juice";
import { outcomeCue, playCue } from "@/lib/sound";
import { FREE_PLAY_RULES, type MatchRules, useHumanMatch } from "@/lib/use-human-match";

export type Celebration = "great" | "good" | "neutral" | "bad";

const outcomeText = (round: RoundResult) =>
  round.moveA === round.moveB
    ? round.moveA === "C"
      ? "MUTUAL TRUST"
      : "MUTUAL DISTRUST"
    : round.moveA === "D"
      ? "YOU EXPLOITED THEM"
      : "YOU WERE EXPLOITED";

function outcomeClass(round: RoundResult) {
  if (round.moveA === "C" && round.moveB === "C") return "trust";
  if (round.moveA === "D" && round.moveB === "D") return "distrust";
  return round.moveA === "D" ? "exploit" : "betrayed";
}

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

function countStreak(rounds: RoundResult[]) {
  let streak = 0;
  for (let index = rounds.length - 1; index >= 0; index -= 1) {
    if (rounds[index].moveA !== "C" || rounds[index].moveB !== "C") break;
    streak += 1;
  }
  return streak;
}

export function summarize(opponentId: string, rounds: RoundResult[], stats: MatchSummary["stats"]): MatchSummary {
  return {
    opponentId,
    rounds,
    stats,
    average: rounds.length ? stats.scoreHuman / rounds.length : 0,
    opponentAverage: rounds.length ? stats.scoreOpponent / rounds.length : 0,
  };
}

/**
 * The human-vs-strategy arena: fighters, history, reveal, move buttons and
 * all the juice. The caller decides what happens when the match ends.
 */
export function MatchArena({
  opponent,
  rules = FREE_PLAY_RULES,
  label,
  onFinish,
  renderComplete,
}: {
  opponent: Strategy;
  rules?: MatchRules;
  label?: ReactNode;
  /** Called once when the match ends; return how loudly to celebrate. */
  onFinish?: (summary: MatchSummary) => Celebration | void;
  renderComplete: (summary: MatchSummary, controls: { reset: () => void }) => ReactNode;
}) {
  const { rounds, finished, play, reset, stats } = useHumanMatch(opponent, rules);
  const stageRef = useRef<HTMLDivElement>(null);
  const humanPopups = useScorePopups();
  const opponentPopups = useScorePopups();

  const playMove = useCallback(
    (move: Move) => {
      const result = play(move);
      if (!result) return;
      const { round, ended, rounds: next } = result;
      playCue(outcomeCue(round.moveA, round.moveB), countStreak(next));
      humanPopups.push(`+${round.payoffA}`, popupTone(round.payoffA));
      opponentPopups.push(`+${round.payoffB}`, popupTone(round.payoffB));
      if (round.moveA === "C" && round.moveB === "D") shake(stageRef.current, "hard");
      else if (round.moveA === "D" && round.moveB === "D") shake(stageRef.current, "soft");
      if (!ended) return;
      let human = 0;
      let rival = 0;
      let streak = 0;
      let bestStreak = 0;
      let humanC = 0;
      let opponentC = 0;
      for (const item of next) {
        human += item.payoffA;
        rival += item.payoffB;
        if (item.moveA === "C") humanC += 1;
        if (item.moveB === "C") opponentC += 1;
        streak = item.moveA === "C" && item.moveB === "C" ? streak + 1 : 0;
        bestStreak = Math.max(bestStreak, streak);
      }
      const summary = summarize(opponent.id, next, {
        scoreHuman: human,
        scoreOpponent: rival,
        streak,
        bestStreak,
        humanCooperation: humanC / next.length,
        opponentCooperation: opponentC / next.length,
      });
      const tier = onFinish?.(summary) ?? (human > rival ? "good" : human === rival ? "neutral" : "bad");
      window.setTimeout(() => {
        if (tier === "great" || tier === "good") {
          playCue("win");
          celebrate(tier === "great" ? 1.3 : 0.8);
        } else if (tier === "neutral") {
          playCue("draw");
        } else {
          playCue("lose");
        }
      }, 350);
    },
    [humanPopups, onFinish, opponent.id, opponentPopups, play],
  );

  const restart = useCallback(() => {
    playCue("click");
    reset();
  }, [reset]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a, [contenteditable='true']") && event.key === "Enter") return;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      const key = event.key.toLowerCase();
      if (!finished && key === "c") playMove("C");
      if (!finished && key === "d") playMove("D");
      if (finished && (key === "r" || key === "enter")) restart();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finished, playMove, restart]);

  const latest = rounds[rounds.length - 1];
  const visibleRounds = rounds.slice(-12);
  const mood = moods(latest);

  return (
    <PixelPanel className="play-arena">
      <div className="match-strip">
        <PixelBadge tone="cooperate">UNKNOWN HORIZON</PixelBadge>
        {stats.streak >= 3 ? (
          <span className="combo-badge" key={stats.streak}>
            TRUST COMBO ×{stats.streak}
          </span>
        ) : (
          <span>{label ?? `MATCH ${opponent.symbol}-01`}</span>
        )}
        <span>ROUND {rounds.length + (finished ? 0 : 1)}</span>
      </div>

      <div className="play-stage" ref={stageRef}>
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
              visibleRounds.map((round) => <MoveChip key={`opp-${round.round}`} move={round.moveB} />)
            )}
          </div>
          <div className="history-row">
            <b>YOU</b>
            {visibleRounds.length === 0 ? (
              <span className="history-empty">PRESS C OR D</span>
            ) : (
              visibleRounds.map((round) => <MoveChip key={`you-${round.round}`} move={round.moveA} />)
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
          {renderComplete(summarize(opponent.id, rounds, stats), { reset: restart })}
        </div>
      )}
    </PixelPanel>
  );
}
