
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { MoveChip } from "@/components/move-history";
import { PageMeta } from "@/components/page-meta";
import { PixelBadge, PixelButton, PixelPanel, ScreenTitle } from "@/components/retro";
import { HumanAvatar, StrategyAvatar } from "@/components/strategy-avatar";
import {
  createRng,
  getStrategy,
  type Move,
  type RoundResult,
  scoreRound,
  strategies,
} from "@/lib/game";

function makeRandomizers(opponentId: string) {
  const seed = `${opponentId}:${Date.now()}:${Math.random()}`;
  return {
    opponent: createRng(`${seed}:opponent`),
    ending: createRng(`${seed}:ending`),
  };
}

export default function PlayPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("opponent");
  const opponentId =
    requested && strategies.some((strategy) => strategy.id === requested)
      ? requested
      : "tit-for-tat";
  const [rounds, setRounds] = useState<RoundResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [flash, setFlash] = useState(0);
  const randomizers = useRef(makeRandomizers(opponentId));
  const opponent = getStrategy(opponentId);

  const reset = useCallback((nextOpponentId = opponentId) => {
    setRounds([]);
    setFinished(false);
    setFlash(0);
    randomizers.current = makeRandomizers(nextOpponentId);
  }, [opponentId]);

  const chooseOpponent = (id: string) => {
    setSearchParams({ opponent: id }, { replace: true });
    reset(id);
  };

  const playMove = useCallback((humanMove: Move) => {
    if (finished) return;
    const humanHistory = rounds.map((round) => round.moveA);
    const opponentHistory = rounds.map((round) => round.moveB);
    const opponentMove = opponent.choose({
      selfHistory: opponentHistory,
      opponentHistory: humanHistory,
      round: rounds.length,
      rng: randomizers.current.opponent,
    });
    const [payoffA, payoffB] = scoreRound(humanMove, opponentMove);
    const nextRound: RoundResult = {
      round: rounds.length + 1,
      moveA: humanMove,
      moveB: opponentMove,
      payoffA,
      payoffB,
    };
    const nextRounds = [...rounds, nextRound];
    setRounds(nextRounds);
    setFlash((value) => value + 1);
    const shouldEnd =
      nextRounds.length >= 8 &&
      (nextRounds.length >= 40 || randomizers.current.ending() < 0.08);
    if (shouldEnd) setFinished(true);
  }, [finished, opponent, rounds]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || finished) return;
      if (event.key.toLowerCase() === "c") playMove("C");
      if (event.key.toLowerCase() === "d") playMove("D");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [finished, playMove]);

  const scores = useMemo(
    () => ({
      human: rounds.reduce((sum, round) => sum + round.payoffA, 0),
      opponent: rounds.reduce((sum, round) => sum + round.payoffB, 0),
    }),
    [rounds],
  );
  const latest = rounds[rounds.length - 1];
  const visibleRounds = rounds.slice(-12);
  const humanCooperation = rounds.length
    ? rounds.filter((round) => round.moveA === "C").length / rounds.length
    : 0;

  return (
    <main className="app-shell">
      <PageMeta
        title="Play"
        description="Play the Iterated Prisoner's Dilemma against a classical Axelrod strategy."
      />
      <ScreenTitle
        title="YOU ENTER THE ARENA"
        description="Choose a rival, then build a relationship one simultaneous decision at a time. The ending is unknown—there is always a possible next round."
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
                onClick={() => chooseOpponent(strategy.id)}
              >
                <StrategyAvatar strategy={strategy} size="small" />
                <span>
                  <strong>{strategy.shortName}</strong>
                  <small>{strategy.tagline}</small>
                </span>
                <i aria-hidden="true">{strategy.id === opponentId ? "▶" : ""}</i>
              </button>
            ))}
          </div>
        </PixelPanel>

        <PixelPanel className="play-arena">
          <div className="match-strip">
            <PixelBadge tone="cooperate">UNKNOWN HORIZON</PixelBadge>
            <span>MATCH {opponent.symbol}-01</span>
            <span>ROUND {rounds.length + (finished ? 0 : 1)}</span>
          </div>

          <div className="play-fighters">
            <div className="play-fighter">
              <StrategyAvatar strategy={opponent} />
              <div>
                <small>OPPONENT</small>
                <h2>{opponent.shortName}</h2>
                <strong>{scores.opponent}</strong>
              </div>
            </div>
            <div className="round-marker">{rounds.length || "READY"}</div>
            <div className="play-fighter play-fighter--human">
              <div>
                <small>PLAYER 1</small>
                <h2>YOU</h2>
                <strong>{scores.human}</strong>
              </div>
              <HumanAvatar />
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

          {latest && !finished ? (
            <div className="round-result" key={flash}>
              <div>
                <span>LAST EXCHANGE</span>
                <strong>
                  {latest.moveA === latest.moveB
                    ? latest.moveA === "C"
                      ? "MUTUAL TRUST"
                      : "MUTUAL DISTRUST"
                    : latest.moveA === "D"
                      ? "YOU EXPLOITED THEM"
                      : "YOU WERE EXPLOITED"}
                </strong>
              </div>
              <div>
                <span>YOU</span>
                <strong className={latest.moveA === "C" ? "cooperate-text" : "defect-text"}>
                  {latest.moveA} +{latest.payoffA}
                </strong>
              </div>
              <div>
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
                C · COOPERATE
              </PixelButton>
              <PixelButton tone="defect" onClick={() => playMove("D")}>
                D · DEFECT
              </PixelButton>
            </div>
          ) : (
            <div className="match-complete">
              <PixelBadge tone="gold">MATCH COMPLETE</PixelBadge>
              <h2>
                {scores.human === scores.opponent
                  ? "DRAW GAME"
                  : scores.human > scores.opponent
                    ? "YOU OUTSCORED THE RIVAL"
                    : `${opponent.shortName} OUTSCORED YOU`}
              </h2>
              <p>
                <strong>{opponent.name}:</strong> {opponent.rule} You cooperated in{" "}
                {Math.round(humanCooperation * 100)}% of {rounds.length} rounds.
              </p>
              <div className="complete-actions">
                <PixelButton onClick={() => reset()}>REMATCH</PixelButton>
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
