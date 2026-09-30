
import { useMemo, useRef, useState } from "react";
import { PageMeta } from "@/components/page-meta";
import { PixelBadge, PixelButton, PixelPanel, ScreenTitle } from "@/components/retro";
import { StrategyAvatar } from "@/components/strategy-avatar";
import {
  getStrategy,
  runTournament,
  strategies,
  type TournamentResult,
} from "@/lib/game";

const defaultOptions = {
  strategyIds: strategies.map((strategy) => strategy.id),
  rounds: 200,
  repetitions: 5,
  seed: "AXELROD-1984",
};

export default function TournamentPage() {
  const [result, setResult] = useState<TournamentResult>(() => runTournament(defaultOptions));
  const [seed, setSeed] = useState(defaultOptions.seed);
  const [status, setStatus] = useState<"ready" | "running">("ready");
  const [selectedId, setSelectedId] = useState(result.rows[0].strategyId);
  const workerRef = useRef<Worker | null>(null);
  const selectedRow = result.rows.find((row) => row.strategyId === selectedId) ?? result.rows[0];
  const selectedStrategy = getStrategy(selectedRow.strategyId);

  const totalMatches = result.matches.length;
  const cooperationAverage = useMemo(
    () => result.rows.reduce((sum, row) => sum + row.cooperationRate, 0) / result.rows.length,
    [result],
  );

  const run = () => {
    setStatus("running");
    const options = { ...defaultOptions, seed: seed || defaultOptions.seed };
    if (typeof Worker === "undefined") {
      const next = runTournament(options);
      setResult(next);
      setSelectedId(next.rows[0].strategyId);
      setStatus("ready");
      return;
    }
    workerRef.current?.terminate();
    const worker = new Worker(new URL("../workers/tournament.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<TournamentResult>) => {
      setResult(event.data);
      setSelectedId(event.data.rows[0].strategyId);
      setStatus("ready");
      worker.terminate();
      workerRef.current = null;
    };
    worker.onerror = () => {
      const next = runTournament(options);
      setResult(next);
      setSelectedId(next.rows[0].strategyId);
      setStatus("ready");
      worker.terminate();
      workerRef.current = null;
    };
    worker.postMessage(options);
  };

  return (
    <main className="app-shell">
      <PageMeta title="Tournament" description="Run a deterministic round-robin Axelrod tournament and explore the leaderboard." />
      <ScreenTitle
        title="EVERYONE FIGHTS EVERYONE"
        description="Ten strategies meet in a seeded round-robin. Rankings use average payoff per turn—not raw cooperation—because being nice is only useful when it survives contact with the field."
      />

      <PixelPanel className="tournament-console">
        <div className="tournament-settings">
          <div>
            <span>FORMAT</span>
            <strong>ROUND ROBIN + SELF PLAY</strong>
          </div>
          <div>
            <span>LENGTH</span>
            <strong>200 ROUNDS</strong>
          </div>
          <div>
            <span>REPETITIONS</span>
            <strong>5 PER PAIRING</strong>
          </div>
          <label>
            <span>RANDOM SEED</span>
            <input value={seed} onChange={(event) => setSeed(event.target.value.toUpperCase())} />
          </label>
          <PixelButton onClick={run} disabled={status === "running"}>
            {status === "running" ? "SIMULATING..." : "RUN TOURNAMENT"}
          </PixelButton>
        </div>
        <div className="tournament-roster">
          {strategies.map((strategy) => (
            <span key={strategy.id} title={strategy.name}>
              {strategy.symbol}
            </span>
          ))}
        </div>
      </PixelPanel>

      <div className="tournament-stats">
        <PixelPanel>
          <span>SIMULATED ROUNDS</span>
          <strong>{result.totalRounds.toLocaleString()}</strong>
        </PixelPanel>
        <PixelPanel>
          <span>MATCHES</span>
          <strong>{totalMatches}</strong>
        </PixelPanel>
        <PixelPanel>
          <span>FIELD COOPERATION</span>
          <strong>{Math.round(cooperationAverage * 100)}%</strong>
        </PixelPanel>
        <PixelPanel>
          <span>TOP AVG PAYOFF</span>
          <strong>{result.rows[0].averagePayoff.toFixed(3)}</strong>
        </PixelPanel>
      </div>

      <div className="tournament-layout">
        <PixelPanel className="leaderboard-panel">
          <div className="leaderboard-heading">
            <div>
              <PixelBadge tone="gold">FINAL STANDINGS</PixelBadge>
              <h2>AXELROD LEADERBOARD</h2>
            </div>
            <span>SEED {result.seed}</span>
          </div>
          <div className="leaderboard-table" role="table" aria-label="Tournament leaderboard">
            <div className="leaderboard-row leaderboard-row--header" role="row">
              <span>RANK</span>
              <span>STRATEGY</span>
              <span>AVG / TURN</span>
              <span>COOP</span>
              <span>W-D-L</span>
            </div>
            {result.rows.map((row) => {
              const strategy = getStrategy(row.strategyId);
              return (
                <button
                  key={row.strategyId}
                  className={`leaderboard-row ${selectedId === row.strategyId ? "is-selected" : ""}`}
                  onClick={() => setSelectedId(row.strategyId)}
                  role="row"
                >
                  <span className="leaderboard-rank">{row.rank.toString().padStart(2, "0")}</span>
                  <span className="leaderboard-name">
                    <StrategyAvatar strategy={strategy} size="small" />
                    <span>
                      <strong>{strategy.shortName}</strong>
                      <small>{strategy.category}</small>
                    </span>
                  </span>
                  <span className="leaderboard-score">
                    <strong>{row.averagePayoff.toFixed(3)}</strong>
                    <i style={{ width: `${(row.averagePayoff / 5) * 100}%` }} />
                  </span>
                  <span>{Math.round(row.cooperationRate * 100)}%</span>
                  <span>{row.wins}-{row.draws}-{row.losses}</span>
                </button>
              );
            })}
          </div>
        </PixelPanel>

        <PixelPanel className="competitor-profile">
          <div className="profile-rank">RANK #{selectedRow.rank}</div>
          <StrategyAvatar strategy={selectedStrategy} />
          <PixelBadge>{selectedStrategy.category}</PixelBadge>
          <h2>{selectedStrategy.shortName}</h2>
          <p>{selectedStrategy.tagline}</p>
          <blockquote>&ldquo;{selectedStrategy.rule}&rdquo;</blockquote>
          <dl>
            <div>
              <dt>AVG PAYOFF</dt>
              <dd>{selectedRow.averagePayoff.toFixed(3)}</dd>
            </div>
            <div>
              <dt>COOPERATION</dt>
              <dd>{Math.round(selectedRow.cooperationRate * 100)}%</dd>
            </div>
            <div>
              <dt>MATCH SIDES</dt>
              <dd>{selectedRow.matches}</dd>
            </div>
          </dl>
          <div className="matchup-list">
            <span>HEAD-TO-HEAD PAYOFF</span>
            {Object.entries(selectedRow.versus)
              .map(([id, value]) => ({
                id,
                average: value.payoff / value.rounds,
              }))
              .sort((left, right) => right.average - left.average)
              .map(({ id, average }) => (
                <div key={id}>
                  <span>{getStrategy(id).shortName}</span>
                  <i><b style={{ width: `${(average / 5) * 100}%` }} /></i>
                  <strong>{average.toFixed(2)}</strong>
                </div>
              ))}
          </div>
        </PixelPanel>
      </div>

      <p className="method-note">
        <strong>METHOD:</strong> classic 5/3/1/0 payoffs, simultaneous moves, zero noise,
        five deterministic seeded repetitions per unordered pairing, including self-play.
        Change the seed to test stochastic strategies again.
      </p>
    </main>
  );
}
