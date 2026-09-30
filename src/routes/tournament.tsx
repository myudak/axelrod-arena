import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { PayoffHeatmap } from "@/components/payoff-heatmap";
import { PageMeta } from "@/components/page-meta";
import { PixelIcon } from "@/components/pixel-icon";
import { PixelBadge, PixelButton, PixelPanel, ScreenTitle } from "@/components/retro";
import { StrategyAvatar } from "@/components/strategy-avatar";
import { cite } from "@/data/papers";
import { useCustoms, useRoster } from "@/lib/customs";
import {
  AXELROD_SECOND_W,
  getStrategy,
  payoffMatrix,
  type Strategy,
  strategies,
  type TournamentOptions,
  type TournamentResult,
} from "@/lib/game";
import { celebrate } from "@/lib/juice";
import { recordTournament } from "@/lib/progress";
import { playCue } from "@/lib/sound";
import { useTournamentRunner } from "@/lib/use-tournament";

interface Settings {
  rounds: number;
  repetitions: number;
  noise: number;
  continuation: number | null;
  seed: string;
}

const presets: { id: string; label: string; source: string; blurb: string; settings: Omit<Settings, "seed"> }[] = [
  {
    id: "first",
    label: "AXELROD I",
    source: "axelrod1980a",
    blurb: "200 moves, 5 repetitions, no noise.",
    settings: { rounds: 200, repetitions: 5, noise: 0, continuation: null },
  },
  {
    id: "second",
    label: "AXELROD II",
    source: "axelrod1980b",
    blurb: "Random length: w = 0.99654 (median ≈ 200).",
    settings: { rounds: 200, repetitions: 5, noise: 0, continuation: AXELROD_SECOND_W },
  },
  {
    id: "noise",
    label: "NOISY WORLD",
    source: "wu-axelrod1995",
    blurb: "5% of moves flipped by mistake.",
    settings: { rounds: 200, repetitions: 5, noise: 0.05, continuation: null },
  },
];

function initialSettings(preset: string | null): Settings {
  const match = presets.find((item) => item.id === preset) ?? presets[0];
  return { ...match.settings, seed: "AXELROD-1984" };
}

function toOptions(settings: Settings, strategyIds: string[], customs: TournamentOptions["customs"]): TournamentOptions {
  return {
    strategyIds,
    customs,
    rounds: settings.rounds,
    repetitions: settings.repetitions,
    noise: settings.noise,
    continuation: settings.continuation ?? undefined,
    seed: settings.seed || "AXELROD-1984",
  };
}

function insightsFor(result: TournamentResult, lookup: (id: string) => Strategy) {
  const name = (id: string) => lookup(id).name;
  const insights: string[] = [];
  const [champion] = result.rows;
  if (champion.wins === 0) {
    insights.push(
      `${name(champion.strategyId)} won the tournament without winning a single match (${champion.wins}-${champion.draws}-${champion.losses}). Success here comes from eliciting cooperation, not from beating anyone.`,
    );
  }
  const mostWins = [...result.rows].sort((a, b) => b.wins - a.wins)[0];
  if (mostWins.strategyId !== champion.strategyId && mostWins.wins > 0) {
    insights.push(
      `${name(mostWins.strategyId)} won the most matches (${mostWins.wins}) but finished #${mostWins.rank}. Winning battles is not winning the war.`,
    );
  }
  const tft = result.rows.find((row) => row.strategyId === "tit-for-tat");
  const forgiving = result.rows.filter((row) => ["generous-tit-for-tat", "pavlov"].includes(row.strategyId));
  if (result.noise > 0 && tft && forgiving.some((row) => row.rank < tft.rank)) {
    insights.push(
      `With ${result.noise * 100}% noise, Tit for Tat drops to #${tft.rank}: one accidental defection starts an echo of retaliation. ${forgiving
        .filter((row) => row.rank < tft.rank)
        .map((row) => name(row.strategyId))
        .join(" and ")} recover by forgiving.`,
    );
  }
  const nice = result.rows.slice(0, 3).filter((row) => lookup(row.strategyId).traits.includes("Nice"));
  if (nice.length >= 2) {
    insights.push(`${nice.length} of the top 3 are "nice": they never defect first. Axelrod's first lesson holds.`);
  }
  return insights;
}

export default function TournamentPage() {
  const [searchParams] = useSearchParams();
  const customs = useCustoms();
  const roster = useRoster();
  const [settings, setSettings] = useState<Settings>(() => initialSettings(searchParams.get("preset")));
  const [enabled, setEnabled] = useState<string[]>(() => [
    ...strategies.map((strategy) => strategy.id),
    ...customs.map((custom) => custom.id),
  ]);
  const [pick, setPick] = useState<string>("");
  const [reveal, setReveal] = useState<{ pick: string; rank: number; correct: boolean } | null>(null);
  const { result, running, run: runWith } = useTournamentRunner(
    toOptions(initialSettings(searchParams.get("preset")), enabled, customs),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeIds = enabled.filter((id) => roster.some((strategy) => strategy.id === id));
  const lookup = (id: string) => getStrategy(id, roster);

  const cooperationAverage = useMemo(
    () => (result ? result.rows.reduce((sum, row) => sum + row.cooperationRate, 0) / result.rows.length : 0),
    [result],
  );
  const heatmap = useMemo(() => (result ? payoffMatrix(result) : null), [result]);

  const update = (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch }));
  const toggle = (id: string) =>
    setEnabled((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const run = () => {
    if (activeIds.length < 2) return;
    playCue("click");
    setSelectedId(null);
    setReveal(null);
    const pickAtRun = activeIds.includes(pick) ? pick : "";
    runWith(toOptions(settings, activeIds, customs), (next) => {
      const champion = next.rows[0].strategyId;
      const customTop3 = next.rows.slice(0, 3).some((row) => row.strategyId.startsWith("custom-"));
      const { correct } = recordTournament({ pick: pickAtRun || null, champion, customTop3, noisy: next.noise > 0 });
      if (pickAtRun) {
        const rank = next.rows.find((row) => row.strategyId === pickAtRun)?.rank ?? 0;
        setReveal({ pick: pickAtRun, rank, correct });
        if (correct) {
          playCue("win");
          celebrate(1);
        } else {
          playCue(rank <= 3 ? "draw" : "lose");
        }
      } else {
        playCue("star");
      }
    });
  };

  const selectedRow = result?.rows.find((row) => row.strategyId === selectedId) ?? result?.rows[0];
  const selectedStrategy = selectedRow ? lookup(selectedRow.strategyId) : null;
  const insights = result ? insightsFor(result, lookup) : [];
  const activePreset = presets.find(
    (preset) =>
      preset.settings.noise === settings.noise &&
      preset.settings.continuation === settings.continuation &&
      preset.settings.rounds === settings.rounds &&
      preset.settings.repetitions === settings.repetitions,
  );

  return (
    <main className="app-shell">
      <PageMeta title="Tournament" description="Run a seeded round-robin Axelrod tournament and explore the leaderboard." />
      <ScreenTitle
        title="EVERYONE FIGHTS EVERYONE"
        description="Pick a field, pick a format, pick your champion. Rankings use average payoff per turn, not raw cooperation, because being nice only helps when it survives contact with the field."
      />

      <PixelPanel className="tournament-console">
        <div className="format-row" role="group" aria-label="Tournament format">
          <span>FORMAT</span>
          {presets.map((preset) => (
            <button
              type="button"
              key={preset.id}
              className={activePreset?.id === preset.id ? "is-active" : ""}
              aria-pressed={activePreset?.id === preset.id}
              onClick={() => {
                playCue("click");
                update(preset.settings);
              }}
            >
              <strong>{preset.label}</strong>
              <small>{preset.blurb}</small>
              <em>{cite(preset.source)}</em>
            </button>
          ))}
        </div>

        <div className="tournament-settings tournament-settings--grid">
          <label>
            <span>LENGTH</span>
            <select
              value={settings.continuation ? "random" : settings.rounds}
              onChange={(event) =>
                event.target.value === "random"
                  ? update({ continuation: AXELROD_SECOND_W })
                  : update({ rounds: Number(event.target.value), continuation: null })
              }
            >
              <option value={50}>50 MOVES</option>
              <option value={200}>200 MOVES</option>
              <option value={500}>500 MOVES</option>
              <option value="random">RANDOM (w=0.99654)</option>
            </select>
          </label>
          <label>
            <span>REPETITIONS</span>
            <select value={settings.repetitions} onChange={(event) => update({ repetitions: Number(event.target.value) })}>
              {[1, 3, 5, 10].map((value) => (
                <option key={value} value={value}>{value} PER PAIRING</option>
              ))}
            </select>
          </label>
          <label>
            <span>NOISE</span>
            <select value={settings.noise} onChange={(event) => update({ noise: Number(event.target.value) })}>
              {[0, 0.01, 0.05, 0.1].map((value) => (
                <option key={value} value={value}>{value ? `${value * 100}% FLIPPED` : "NONE"}</option>
              ))}
            </select>
          </label>
          <label>
            <span>RANDOM SEED</span>
            <input value={settings.seed} onChange={(event) => update({ seed: event.target.value.toUpperCase() })} />
          </label>
          <label>
            <span>YOUR CHAMPION PICK</span>
            <select value={pick} onChange={(event) => setPick(event.target.value)}>
              <option value="">NO PICK</option>
              {activeIds.map((id) => (
                <option key={id} value={id}>{lookup(id).name}</option>
              ))}
            </select>
          </label>
          <PixelButton onClick={run} disabled={running || activeIds.length < 2}>
            {running ? "SIMULATING..." : "RUN TOURNAMENT"}
          </PixelButton>
        </div>

        <div className="roster-toggles" role="group" aria-label="Strategies in the field">
          <span className="roster-toggles__label">
            FIELD · {activeIds.length}
            <button type="button" onClick={() => setEnabled(roster.map((strategy) => strategy.id))}>ALL</button>
            <button type="button" onClick={() => setEnabled([])}>NONE</button>
          </span>
          {roster.map((strategy) => {
            const on = enabled.includes(strategy.id);
            return (
              <button
                type="button"
                key={strategy.id}
                className={`roster-toggle ${on ? "is-on" : ""} ${pick === strategy.id ? "is-picked" : ""}`}
                aria-pressed={on}
                title={strategy.name}
                onClick={() => toggle(strategy.id)}
              >
                <StrategyAvatar strategy={strategy} size="small" />
                <span>{strategy.symbol}</span>
                {pick === strategy.id ? <PixelIcon name="star" size={10} className="roster-toggle__star" /> : null}
              </button>
            );
          })}
        </div>
      </PixelPanel>

      {reveal ? (
        <div className={`pick-reveal ${reveal.correct ? "is-correct" : ""}`} role="status">
          <StrategyAvatar strategy={lookup(reveal.pick)} size="small" mood={reveal.correct ? "happy" : "sad"} />
          <p>
            <strong>{reveal.correct ? "ORACLE! " : ""}YOUR PICK {lookup(reveal.pick).shortName} FINISHED #{reveal.rank}</strong>
            {reveal.correct ? " You called the champion. +40 XP" : " Better luck next run."}
          </p>
        </div>
      ) : null}

      {!result || !selectedRow || !selectedStrategy || !heatmap ? (
        <PixelPanel className="tournament-loading" aria-busy="true">
          <p>SIMULATING {activeIds.length} FIGHTERS…</p>
        </PixelPanel>
      ) : (
        <>
          <div className={`tournament-stats ${running ? "is-stale" : ""}`}>
            <PixelPanel>
              <span>SIMULATED ROUNDS</span>
              <strong>{result.totalRounds.toLocaleString()}</strong>
            </PixelPanel>
            <PixelPanel>
              <span>MATCHES</span>
              <strong>{result.matchCount}</strong>
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

          {insights.length ? (
            <ul className="insight-list">
              {insights.map((insight) => (
                <li key={insight}>
                  <PixelIcon name="bolt" size={14} />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className={`tournament-layout ${running ? "is-stale" : ""}`}>
            <PixelPanel className="leaderboard-panel">
              <div className="leaderboard-heading">
                <div>
                  <PixelBadge tone="gold">FINAL STANDINGS</PixelBadge>
                  <h2>AXELROD LEADERBOARD</h2>
                </div>
                <span>SEED {result.seed}</span>
              </div>
              <div className="leaderboard-table" aria-label="Tournament leaderboard">
                <div className="leaderboard-row leaderboard-row--header" aria-hidden="true">
                  <span>RANK</span>
                  <span>STRATEGY</span>
                  <span>AVG / TURN</span>
                  <span>COOP</span>
                  <span>W-D-L</span>
                </div>
                {result.rows.map((row) => {
                  const strategy = lookup(row.strategyId);
                  return (
                    <button
                      key={row.strategyId}
                      className={`leaderboard-row ${selectedRow.strategyId === row.strategyId ? "is-selected" : ""} ${row.rank === 1 ? "is-champion" : ""}`}
                      onClick={() => setSelectedId(row.strategyId)}
                      aria-pressed={selectedRow.strategyId === row.strategyId}
                      aria-label={`Rank ${row.rank}: ${strategy.name}, ${row.averagePayoff.toFixed(3)} points per turn, ${Math.round(row.cooperationRate * 100)}% cooperation, ${row.wins} wins ${row.draws} draws ${row.losses} losses`}
                    >
                      <span className="leaderboard-rank">
                        {row.rank === 1 ? <PixelIcon name="trophy" size={14} /> : row.rank.toString().padStart(2, "0")}
                      </span>
                      <span className="leaderboard-name">
                        <StrategyAvatar strategy={strategy} size="small" />
                        <span>
                          <strong>{strategy.shortName}</strong>
                          <small>{strategy.category === "CUSTOM" ? "YOUR LAB" : strategy.category}</small>
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
                  .map(([id, value]) => ({ id, average: value.payoff / value.rounds }))
                  .sort((left, right) => right.average - left.average)
                  .map(({ id, average }) => (
                    <div key={id}>
                      <span>{lookup(id).shortName}</span>
                      <i><b style={{ width: `${(average / 5) * 100}%` }} /></i>
                      <strong>{average.toFixed(2)}</strong>
                    </div>
                  ))}
              </div>
            </PixelPanel>
          </div>

          <PixelPanel className="heatmap-panel">
            <div className="panel-heading">
              <span>PAYOFF MATRIX · POINTS PER TURN</span>
              <b>ROWS SORTED BY RANK</b>
            </div>
            <PayoffHeatmap ids={heatmap.ids} matrix={heatmap.matrix} lookup={lookup} />
          </PixelPanel>

          <p className="method-note">
            <strong>METHOD:</strong> classic 5/3/1/0 payoffs, simultaneous moves, round robin including self-play,{" "}
            {result.repetitions} seeded repetition{result.repetitions > 1 ? "s" : ""} per pairing of{" "}
            {result.continuation
              ? `random length (w = ${result.continuation}; drawn lengths ${result.matchLengths.join(", ")})`
              : `${result.roundsPerMatch} moves`}
            {result.noise ? `, ${result.noise * 100}% of moves flipped by noise` : ", no noise"}. Axelrod&apos;s
            first tournament used 200 moves × 5; the second drew random lengths.
          </p>
        </>
      )}
    </main>
  );
}
