import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { EvolutionChart, seriesColor } from "@/components/evolution-chart";
import { PageMeta } from "@/components/page-meta";
import { PixelIcon } from "@/components/pixel-icon";
import { PixelBadge, PixelButton, PixelPanel, ScreenTitle } from "@/components/retro";
import { StrategyAvatar } from "@/components/strategy-avatar";
import { cite } from "@/data/papers";
import { useCustoms, useRoster } from "@/lib/customs";
import { runEvolution } from "@/lib/evolution";
import { getStrategy, payoffMatrix, strategies } from "@/lib/game";
import { unlock } from "@/lib/progress";
import { playCue } from "@/lib/sound";
import { useTournamentRunner } from "@/lib/use-tournament";

type Start = "equal" | "hostile" | "naive";

const starts: { id: Start; label: string; blurb: string }[] = [
  { id: "equal", label: "EQUAL SHARES", blurb: "Everyone starts level." },
  { id: "hostile", label: "HOSTILE START", blurb: "Half the population always defects." },
  { id: "naive", label: "NAIVE START", blurb: "Half the population always cooperates." },
];

function initialShares(ids: string[], start: Start) {
  const shares: Record<string, number> = {};
  const special = start === "hostile" ? "always-defect" : start === "naive" ? "always-cooperate" : null;
  const others = ids.filter((id) => id !== special).length;
  for (const id of ids) {
    if (!special || !ids.includes(special)) shares[id] = 1;
    else shares[id] = id === special ? 0.5 : 0.5 / Math.max(1, others);
  }
  return shares;
}

const DEFAULT_FIELD = strategies.map((strategy) => strategy.id);

export default function EvolutionPage() {
  const [searchParams] = useSearchParams();
  const customs = useCustoms();
  const roster = useRoster();
  const lookup = (id: string) => getStrategy(id, roster);
  const [noise, setNoise] = useState(searchParams.get("preset") === "noise" ? 0.05 : 0);
  const [generations, setGenerations] = useState(150);
  const [start, setStart] = useState<Start>("equal");
  const [enabled, setEnabled] = useState<string[]>(() => [...DEFAULT_FIELD, ...customs.map((custom) => custom.id)]);
  const activeIds = enabled.filter((id) => roster.some((strategy) => strategy.id === id));
  const matrixOptions = (ids: string[], level: number) => ({
    strategyIds: ids,
    customs,
    rounds: 200,
    repetitions: 3,
    noise: level,
    seed: "ECOLOGY",
  });
  const { result, running, run } = useTournamentRunner(matrixOptions(activeIds, noise));
  const [upTo, setUpTo] = useState(Number.POSITIVE_INFINITY);
  const [playing, setPlaying] = useState(false);

  const evolution = useMemo(() => {
    if (!result) return null;
    const { ids, matrix } = payoffMatrix(result);
    return runEvolution(ids, matrix, generations, initialShares(ids, start));
  }, [generations, result, start]);

  const shown = evolution ? Math.min(upTo, evolution.shares.length - 1) : 0;

  useEffect(() => {
    if (!playing || !evolution) return;
    if (shown >= evolution.shares.length - 1) return;
    const timer = window.setTimeout(() => {
      const next = shown + Math.max(1, Math.round(evolution.shares.length / 120));
      setUpTo(next);
      if (next >= evolution.shares.length - 1) {
        setPlaying(false);
        playCue("star");
        if (evolution.shares.length - 1 >= 100) unlock("evolutionist");
      } else if (Object.values(evolution.extinctAt).some((generation) => generation > shown && generation <= next)) {
        playCue("defect");
      }
    }, 40);
    return () => window.clearTimeout(timer);
  }, [evolution, playing, shown]);

  const simulate = () => {
    if (activeIds.length < 2) return;
    playCue("click");
    setPlaying(false);
    run(matrixOptions(activeIds, noise), () => {
      setUpTo(0);
      setPlaying(true);
    });
  };

  const toggle = (id: string) =>
    setEnabled((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  const populace = evolution
    ? evolution.ids
        .map((id, index) => ({ id, share: evolution.shares[shown][index] }))
        .sort((a, b) => b.share - a.share)
    : [];
  const extinctions = evolution
    ? Object.entries(evolution.extinctAt)
        .filter(([, generation]) => generation > 0 && generation <= shown)
        .sort((a, b) => a[1] - b[1])
    : [];

  return (
    <main className="app-shell">
      <PageMeta
        title="Evolution"
        description="Axelrod & Hamilton's ecological simulation: strategies grow or shrink according to how well they score against the current population."
      />
      <ScreenTitle
        title="SURVIVAL OF THE FITTEST"
        description="In Axelrod & Hamilton's ecological simulation, each generation a strategy's share grows in proportion to its score against the current population. Exploiters feast on the naive, then starve when the naive are gone."
      />

      <PixelPanel className="tournament-console">
        <div className="format-row" role="group" aria-label="Starting population">
          <span>START</span>
          {starts.map((item) => (
            <button
              type="button"
              key={item.id}
              className={start === item.id ? "is-active" : ""}
              aria-pressed={start === item.id}
              onClick={() => {
                playCue("click");
                setStart(item.id);
              }}
            >
              <strong>{item.label}</strong>
              <small>{item.blurb}</small>
            </button>
          ))}
        </div>
        <div className="tournament-settings tournament-settings--grid evo-settings">
          <label>
            <span>NOISE (MATCH MISTAKES)</span>
            <select value={noise} onChange={(event) => setNoise(Number(event.target.value))}>
              {[0, 0.01, 0.05, 0.1].map((value) => (
                <option key={value} value={value}>{value ? `${value * 100}% FLIPPED` : "NONE"}</option>
              ))}
            </select>
          </label>
          <label>
            <span>GENERATIONS</span>
            <select value={generations} onChange={(event) => setGenerations(Number(event.target.value))}>
              {[50, 150, 300, 600].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <PixelButton onClick={simulate} disabled={running || activeIds.length < 2}>
            <PixelIcon name="play" size={12} /> {running ? "SCORING..." : "RUN EVOLUTION"}
          </PixelButton>
        </div>
        <div className="roster-toggles" role="group" aria-label="Strategies in the population">
          <span className="roster-toggles__label">
            POPULATION · {activeIds.length}
            <button type="button" onClick={() => setEnabled(roster.map((strategy) => strategy.id))}>ALL</button>
            <button type="button" onClick={() => setEnabled([])}>NONE</button>
          </span>
          {roster.map((strategy) => (
            <button
              type="button"
              key={strategy.id}
              className={`roster-toggle ${enabled.includes(strategy.id) ? "is-on" : ""}`}
              aria-pressed={enabled.includes(strategy.id)}
              title={strategy.name}
              onClick={() => toggle(strategy.id)}
            >
              <StrategyAvatar strategy={strategy} size="small" />
              <span>{strategy.symbol}</span>
            </button>
          ))}
        </div>
      </PixelPanel>

      {!evolution ? (
        <PixelPanel className="tournament-loading" aria-busy="true">
          <p>SCORING THE POPULATION…</p>
        </PixelPanel>
      ) : (
        <div className={`evo-layout ${running ? "is-stale" : ""}`}>
          <PixelPanel className="evo-main">
            <div className="panel-heading">
              <span>POPULATION SHARE BY GENERATION</span>
              <b>GEN {shown} / {evolution.shares.length - 1}</b>
            </div>
            <div className="evo-legend" aria-label="Legend">
              {evolution.ids.map((id) => (
                <span key={id} className={seriesColor(id) === "#b8b1a4" ? "is-other" : ""}>
                  <i style={{ background: seriesColor(id) }} />
                  {lookup(id).shortName}
                </span>
              ))}
            </div>
            <EvolutionChart ids={evolution.ids} shares={evolution.shares} upTo={shown} lookup={lookup} />
            <div className="evo-transport">
              <PixelButton
                tone="quiet"
                onClick={() => {
                  playCue("click");
                  if (shown >= evolution.shares.length - 1) setUpTo(0);
                  setPlaying((value) => !value);
                }}
              >
                <PixelIcon name={playing ? "pause" : "play"} size={12} /> {playing ? "PAUSE" : "REPLAY"}
              </PixelButton>
              <input
                type="range"
                min={0}
                max={evolution.shares.length - 1}
                value={shown}
                aria-label="Generation"
                onChange={(event) => {
                  setPlaying(false);
                  setUpTo(Number(event.target.value));
                }}
              />
            </div>
          </PixelPanel>

          <div className="evo-side">
            <PixelPanel className="evo-populace">
              <div className="panel-heading">
                <span>POPULATION AT GEN {shown}</span>
              </div>
              <ol>
                {populace.map((row, index) => (
                  <li key={row.id} className={row.share === 0 ? "is-extinct" : ""}>
                    <span className="evo-populace__rank">{index + 1}</span>
                    <i style={{ background: seriesColor(row.id) }} />
                    <span className="evo-populace__name">{lookup(row.id).shortName}</span>
                    <span className="evo-populace__bar">
                      <b style={{ width: `${row.share * 100}%`, background: seriesColor(row.id) }} />
                    </span>
                    <strong>{row.share === 0 ? "EXTINCT" : `${(row.share * 100).toFixed(1)}%`}</strong>
                  </li>
                ))}
              </ol>
            </PixelPanel>
            <PixelPanel className="evo-log">
              <div className="panel-heading">
                <span>EXTINCTION LOG</span>
                <b>{extinctions.length}</b>
              </div>
              {extinctions.length === 0 ? (
                <p className="lab-empty">No extinctions yet.</p>
              ) : (
                <ul>
                  {extinctions.map(([id, generation]) => (
                    <li key={id}>
                      <span>GEN {generation}</span> {lookup(id).name} died out
                    </li>
                  ))}
                </ul>
              )}
            </PixelPanel>
          </div>
        </div>
      )}

      <div className="evo-explainer-wrap">
      <PixelPanel className="evo-explainer">
        <PixelBadge tone="cooperate">HOW IT WORKS</PixelBadge>
        <p>
          First every pair plays a 200-move match (3 seeded repetitions) to build a payoff matrix. Then each
          generation, a strategy&apos;s share is multiplied by its average score against the current population,
          divided by the population average. That is discrete replicator dynamics, the &ldquo;ecological&rdquo;
          analysis from {cite("axelrod-hamilton1981")}. Shares below 0.01% count as extinct. Try noise to see{" "}
          {cite("nowak-sigmund1993")}: Pavlov and generous strategies outlast Tit for Tat when mistakes happen.
        </p>
      </PixelPanel>
      </div>
    </main>
  );
}
