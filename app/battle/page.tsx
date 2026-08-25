"use client";

import { useEffect, useMemo, useState } from "react";
import { MoveChip } from "@/components/move-history";
import { PixelBadge, PixelButton, PixelPanel, ScreenTitle } from "@/components/retro";
import { StrategyAvatar } from "@/components/strategy-avatar";
import { getStrategy, simulateMatch, strategies, summarizeRounds } from "@/lib/game";

const speeds = [1, 4, 20] as const;

export default function BattlePage() {
  const [strategyAId, setStrategyAId] = useState("tit-for-tat");
  const [strategyBId, setStrategyBId] = useState("joss");
  const [roundCount, setRoundCount] = useState(50);
  const [seed, setSeed] = useState("BATTLE-001");
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof speeds)[number]>(4);
  const strategyA = getStrategy(strategyAId);
  const strategyB = getStrategy(strategyBId);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedA = params.get("a");
    const requestedB = params.get("b");
    const frame = window.requestAnimationFrame(() => {
      if (requestedA && strategies.some((strategy) => strategy.id === requestedA)) {
        setStrategyAId(requestedA);
      }
      if (requestedB && strategies.some((strategy) => strategy.id === requestedB)) {
        setStrategyBId(requestedB);
      }
      setCursor(0);
      setPlaying(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const match = useMemo(
    () =>
      simulateMatch(strategyA, strategyB, {
        rounds: roundCount,
        seed,
      }),
    [roundCount, seed, strategyA, strategyB],
  );

  useEffect(() => {
    if (!playing || cursor >= match.rounds.length) return;
    const delay = speed === 1 ? 520 : speed === 4 ? 145 : 42;
    const timer = window.setTimeout(() => {
      const next = Math.min(cursor + 1, match.rounds.length);
      setCursor(next);
      if (next >= match.rounds.length) setPlaying(false);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [cursor, match.rounds.length, playing, speed]);

  const resetPlayback = () => {
    setCursor(0);
    setPlaying(false);
  };

  const summary = summarizeRounds(match.rounds, cursor);
  const latest = cursor > 0 ? match.rounds[cursor - 1] : undefined;
  const visible = match.rounds.slice(Math.max(0, cursor - 14), cursor);

  const randomizeSeed = () => {
    setSeed(`BATTLE-${Math.floor(Math.random() * 99999).toString().padStart(5, "0")}`);
    resetPlayback();
  };

  return (
    <main className="app-shell">
      <ScreenTitle
        title="STRATEGY VS STRATEGY"
        description="Put any two classical players into the same repeated game. Pause, step through every exchange, or accelerate through the full relationship."
      />

      <PixelPanel className="battle-controls">
        <label>
          <span>PLAYER A</span>
          <select value={strategyAId} onChange={(event) => { setStrategyAId(event.target.value); resetPlayback(); }}>
            {strategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>{strategy.name}</option>
            ))}
          </select>
        </label>
        <button
          className="swap-button"
          onClick={() => {
            setStrategyAId(strategyBId);
            setStrategyBId(strategyAId);
            resetPlayback();
          }}
          aria-label="Swap players"
        >
          ⇄
        </button>
        <label>
          <span>PLAYER B</span>
          <select value={strategyBId} onChange={(event) => { setStrategyBId(event.target.value); resetPlayback(); }}>
            {strategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>{strategy.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>ROUNDS</span>
          <select value={roundCount} onChange={(event) => { setRoundCount(Number(event.target.value)); resetPlayback(); }}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={200}>200</option>
          </select>
        </label>
        <label>
          <span>SEED</span>
          <input value={seed} onChange={(event) => { setSeed(event.target.value.toUpperCase()); resetPlayback(); }} />
        </label>
        <button className="dice-button" onClick={randomizeSeed} aria-label="New random seed">✦</button>
      </PixelPanel>

      <PixelPanel className="battle-replay">
        <div className="match-strip">
          <PixelBadge tone={cursor === match.rounds.length ? "gold" : "cooperate"}>
            {cursor === match.rounds.length ? "MATCH COMPLETE" : playing ? "REPLAYING" : "PAUSED"}
          </PixelBadge>
          <span>SEED {seed}</span>
          <span>ROUND {cursor} / {match.rounds.length}</span>
        </div>

        <div className="replay-stage">
          <div className="replay-player">
            <StrategyAvatar strategy={strategyA} />
            <small>PLAYER A</small>
            <h2>{strategyA.shortName}</h2>
            <strong>{summary.scoreA}</strong>
            <div className="cooperation-bar">
              <i style={{ width: `${summary.cooperationA * 100}%` }} />
            </div>
            <span>{Math.round(summary.cooperationA * 100)}% COOP</span>
          </div>

          <div className="exchange-readout">
            <span>ROUND {cursor || "--"}</span>
            {latest ? (
              <>
                <div>
                  <MoveChip move={latest.moveA} />
                  <b>:</b>
                  <MoveChip move={latest.moveB} />
                </div>
                <strong>
                  {latest.moveA === "C" && latest.moveB === "C"
                    ? "MUTUAL TRUST"
                    : latest.moveA === "D" && latest.moveB === "D"
                      ? "MUTUAL DEFECTION"
                      : "BETRAYAL"}
                </strong>
                <small>+{latest.payoffA} / +{latest.payoffB}</small>
              </>
            ) : (
              <strong>PRESS PLAY</strong>
            )}
          </div>

          <div className="replay-player">
            <StrategyAvatar strategy={strategyB} />
            <small>PLAYER B</small>
            <h2>{strategyB.shortName}</h2>
            <strong>{summary.scoreB}</strong>
            <div className="cooperation-bar">
              <i style={{ width: `${summary.cooperationB * 100}%` }} />
            </div>
            <span>{Math.round(summary.cooperationB * 100)}% COOP</span>
          </div>
        </div>

        <div className="replay-history">
          <div>
            <b>{strategyA.symbol}</b>
            {visible.length === 0 ? <span>NO MOVES YET</span> : visible.map((round) => (
              <MoveChip key={`a-${round.round}`} move={round.moveA} />
            ))}
          </div>
          <div>
            <b>{strategyB.symbol}</b>
            {visible.length === 0 ? <span>NO MOVES YET</span> : visible.map((round) => (
              <MoveChip key={`b-${round.round}`} move={round.moveB} />
            ))}
          </div>
        </div>

        <div className="transport-controls">
          <button onClick={() => { setPlaying(false); setCursor(0); }} aria-label="Restart">↤</button>
          <button onClick={() => { setPlaying(false); setCursor((value) => Math.max(0, value - 1)); }} aria-label="Previous round">◀</button>
          <PixelButton
            onClick={() => {
              if (cursor >= match.rounds.length) setCursor(0);
              setPlaying((value) => !value);
            }}
          >
            {playing ? "PAUSE" : "PLAY"}
          </PixelButton>
          <button onClick={() => { setPlaying(false); setCursor((value) => Math.min(match.rounds.length, value + 1)); }} aria-label="Next round">▶</button>
          <button onClick={() => { setPlaying(false); setCursor(match.rounds.length); }} aria-label="Skip to end">↦</button>
          <div className="speed-controls" aria-label="Replay speed">
            {speeds.map((value) => (
              <button
                key={value}
                className={speed === value ? "is-active" : ""}
                onClick={() => setSpeed(value)}
              >
                {value}×
              </button>
            ))}
          </div>
        </div>
      </PixelPanel>

      <div className="battle-presets">
        <span>QUICK MATCHES</span>
        {[
          ["tit-for-tat", "grim-trigger", "RECIPROCITY VS GRUDGES"],
          ["detective", "always-cooperate", "PROBER VS NAIVE"],
          ["pavlov", "joss", "RECOVERY VS CHAOS"],
        ].map(([left, right, label]) => (
          <button key={label} onClick={() => { setStrategyAId(left); setStrategyBId(right); resetPlayback(); }}>
            {label} →
          </button>
        ))}
      </div>
    </main>
  );
}
