
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { MoveChip } from "@/components/move-history";
import { PageMeta } from "@/components/page-meta";
import { PixelIcon } from "@/components/pixel-icon";
import { PixelBadge, PixelButton, PixelPanel, ScreenTitle } from "@/components/retro";
import { type Mood, StrategyAvatar } from "@/components/strategy-avatar";
import { useRoster } from "@/lib/customs";
import { getStrategy, isStrategyId, type Move, type RoundResult, simulateMatch, type Strategy, summarizeRounds } from "@/lib/game";
import { recordPredictions } from "@/lib/progress";
import { outcomeCue, playCue } from "@/lib/sound";

const speeds = [1, 4, 20] as const;
const noiseLevels = [0, 0.01, 0.05, 0.1] as const;

/** Sound for a replayed round; fast playback only ticks so it stays pleasant. */
function replayCue(round: RoundResult | undefined, speed: number) {
  if (!round) return;
  if (speed >= 20) {
    if (round.round % 5 === 0) playCue("tick");
    return;
  }
  playCue(outcomeCue(round.moveA, round.moveB));
}

function replayMoods(round: RoundResult | undefined): [Mood | undefined, Mood | undefined] {
  if (!round) return [undefined, undefined];
  if (round.moveA === "C" && round.moveB === "C") return ["happy", "happy"];
  if (round.moveA === "D" && round.moveB === "D") return ["mad", "mad"];
  return round.moveA === "D" ? ["smug", "sad"] : ["sad", "smug"];
}

function validId(value: string | null, fallback: string, roster: Strategy[]) {
  return isStrategyId(value, roster) ? value : fallback;
}

function parseNoise(value: string | null) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= 0.5 ? number : 0;
}

function PredictPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Move | null;
  onChange: (move: Move) => void;
}) {
  return (
    <div className="predict-picker" role="group" aria-label={`Predict ${label}`}>
      <span>{label}</span>
      {(["C", "D"] as const).map((move) => (
        <button
          type="button"
          key={move}
          className={`predict-picker__option predict-picker__option--${move} ${value === move ? "is-picked" : ""}`}
          aria-pressed={value === move}
          onClick={() => onChange(move)}
        >
          {move}
        </button>
      ))}
    </div>
  );
}

export default function BattlePage() {
  const [searchParams] = useSearchParams();
  const roster = useRoster();
  const [strategyAId, setStrategyAId] = useState(() => validId(searchParams.get("a"), "tit-for-tat", roster));
  const [strategyBId, setStrategyBId] = useState(() => validId(searchParams.get("b"), "joss", roster));
  const [noise, setNoise] = useState(() => parseNoise(searchParams.get("noise")));
  const [predicting, setPredicting] = useState(false);
  const [guessA, setGuessA] = useState<Move | null>(null);
  const [guessB, setGuessB] = useState<Move | null>(null);
  const [session, setSession] = useState({ made: 0, correct: 0, streak: 0 });
  const [lastCheck, setLastCheck] = useState<{ a: boolean; b: boolean } | null>(null);
  const [roundCount, setRoundCount] = useState(50);
  const [seed, setSeed] = useState("BATTLE-001");
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof speeds)[number]>(4);
  const strategyA = getStrategy(strategyAId, roster);
  const strategyB = getStrategy(strategyBId, roster);

  const match = useMemo(
    () =>
      simulateMatch(strategyA, strategyB, {
        rounds: roundCount,
        seed,
        noise,
      }),
    [noise, roundCount, seed, strategyA, strategyB],
  );

  useEffect(() => {
    if (!playing || cursor >= match.rounds.length) return;
    const delay = speed === 1 ? 520 : speed === 4 ? 145 : 42;
    const timer = window.setTimeout(() => {
      const next = Math.min(cursor + 1, match.rounds.length);
      setCursor(next);
      replayCue(match.rounds[next - 1], speed);
      if (next >= match.rounds.length) {
        setPlaying(false);
        window.setTimeout(() => playCue("star"), 120);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [cursor, match.rounds, playing, speed]);

  const resetPlayback = () => {
    setCursor(0);
    setPlaying(false);
    setGuessA(null);
    setGuessB(null);
    setLastCheck(null);
  };

  const reveal = () => {
    const round = match.rounds[cursor];
    if (!round || !guessA || !guessB) return;
    const a = guessA === round.moveA;
    const b = guessB === round.moveB;
    const correct = Number(a) + Number(b);
    const next = {
      made: session.made + 2,
      correct: session.correct + correct,
      streak: correct === 2 ? session.streak + 1 : 0,
    };
    setSession(next);
    setLastCheck({ a, b });
    setCursor(cursor + 1);
    setGuessA(null);
    setGuessB(null);
    playCue(correct === 2 ? "star" : correct === 1 ? "flip" : "defect", next.streak);
    recordPredictions(2, correct, next);
  };

  const summary = summarizeRounds(match.rounds, cursor);
  const latest = cursor > 0 ? match.rounds[cursor - 1] : undefined;
  const [moodA, moodB] = replayMoods(latest);
  const visible = match.rounds.slice(Math.max(0, cursor - 14), cursor);

  const randomizeSeed = () => {
    setSeed(`BATTLE-${Math.floor(Math.random() * 99999).toString().padStart(5, "0")}`);
    resetPlayback();
  };

  return (
    <main className="app-shell">
      <PageMeta
        title="Battle Replay"
        description="Replay any two classical Prisoner's Dilemma strategies round by round."
      />
      <ScreenTitle
        title="STRATEGY VS STRATEGY"
        description="Put any two classical players into the same repeated game. Pause, step through every exchange, or accelerate through the full relationship."
      />

      <PixelPanel className="battle-controls">
        <label className="bc-a">
          <span>PLAYER A</span>
          <select value={strategyAId} onChange={(event) => { setStrategyAId(event.target.value); resetPlayback(); }}>
            {roster.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>{strategy.name}{strategy.category === "CUSTOM" ? " (yours)" : ""}</option>
            ))}
          </select>
        </label>
        <button
          className="swap-button bc-swap"
          onClick={() => {
            setStrategyAId(strategyBId);
            setStrategyBId(strategyAId);
            resetPlayback();
          }}
          aria-label="Swap players"
        >
          <PixelIcon name="swap" size={16} />
        </button>
        <label className="bc-b">
          <span>PLAYER B</span>
          <select value={strategyBId} onChange={(event) => { setStrategyBId(event.target.value); resetPlayback(); }}>
            {roster.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>{strategy.name}{strategy.category === "CUSTOM" ? " (yours)" : ""}</option>
            ))}
          </select>
        </label>
        <label className="bc-rounds">
          <span>ROUNDS</span>
          <select value={roundCount} onChange={(event) => { setRoundCount(Number(event.target.value)); resetPlayback(); }}>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={200}>200</option>
          </select>
        </label>
        <label className="bc-noise">
          <span>NOISE</span>
          <select value={noise} onChange={(event) => { setNoise(Number(event.target.value)); resetPlayback(); }}>
            {noiseLevels.map((level) => (
              <option key={level} value={level}>{level === 0 ? "NONE" : `${level * 100}%`}</option>
            ))}
          </select>
        </label>
        <label className="bc-seed">
          <span>SEED</span>
          <input value={seed} onChange={(event) => { setSeed(event.target.value.toUpperCase()); resetPlayback(); }} />
        </label>
        <button className="dice-button bc-dice" onClick={randomizeSeed} aria-label="New random seed"><PixelIcon name="dice" size={16} /></button>
      </PixelPanel>

      <PixelPanel className="battle-replay">
        <div className="match-strip">
          <PixelBadge tone={cursor === match.rounds.length ? "gold" : "cooperate"}>
            {cursor === match.rounds.length ? "MATCH COMPLETE" : playing ? "REPLAYING" : "PAUSED"}
          </PixelBadge>
          <span>SEED {seed}{noise ? ` · NOISE ${noise * 100}%` : ""}</span>
          <span>ROUND {cursor} / {match.rounds.length}</span>
        </div>

        <div className="replay-stage">
          <div className="replay-player">
            <StrategyAvatar strategy={strategyA} mood={moodA} />
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
                  <MoveChip move={latest.moveA} flipped={latest.flippedA} />
                  <b>:</b>
                  <MoveChip move={latest.moveB} flipped={latest.flippedB} />
                </div>
                {latest.flippedA || latest.flippedB ? <em className="noise-flag">NOISE!</em> : null}
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
            <StrategyAvatar strategy={strategyB} mood={moodB} />
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
              <MoveChip key={`a-${round.round}`} move={round.moveA} flipped={round.flippedA} />
            ))}
          </div>
          <div>
            <b>{strategyB.symbol}</b>
            {visible.length === 0 ? <span>NO MOVES YET</span> : visible.map((round) => (
              <MoveChip key={`b-${round.round}`} move={round.moveB} flipped={round.flippedB} />
            ))}
          </div>
        </div>

        {predicting ? (
          <div className="predict-panel">
            {cursor >= match.rounds.length ? (
              <p className="predict-panel__done">
                ALL ROUNDS PREDICTED · {session.made ? Math.round((session.correct / session.made) * 100) : 0}% ACCURACY
              </p>
            ) : (
              <>
                <span className="predict-panel__title">PREDICT ROUND {cursor + 1}</span>
                <PredictPicker label={strategyA.symbol} value={guessA} onChange={setGuessA} />
                <PredictPicker label={strategyB.symbol} value={guessB} onChange={setGuessB} />
                <PixelButton onClick={reveal} disabled={!guessA || !guessB}>
                  REVEAL
                </PixelButton>
              </>
            )}
            <dl className="predict-panel__stats">
              <div><dt>ACCURACY</dt><dd>{session.made ? Math.round((session.correct / session.made) * 100) : 0}%</dd></div>
              <div><dt>CALLS</dt><dd>{session.correct}/{session.made}</dd></div>
              <div><dt>PERFECT STREAK</dt><dd>×{session.streak}</dd></div>
              {lastCheck ? (
                <div className="predict-panel__last" key={cursor}>
                  <dt>LAST</dt>
                  <dd>
                    <PixelIcon name={lastCheck.a ? "check" : "close"} size={12} label={lastCheck.a ? "A correct" : "A wrong"} />
                    <PixelIcon name={lastCheck.b ? "check" : "close"} size={12} label={lastCheck.b ? "B correct" : "B wrong"} />
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : (
        <div className="transport-controls">
            <button onClick={() => { setPlaying(false); setCursor(0); }} aria-label="Restart"><PixelIcon name="first" size={16} /></button>
            <button onClick={() => { setPlaying(false); setCursor((value) => Math.max(0, value - 1)); playCue("click"); }} aria-label="Previous round"><PixelIcon name="prev" size={16} /></button>
            <PixelButton
              onClick={() => {
                if (cursor >= match.rounds.length) setCursor(0);
                playCue("click");
                setPlaying((value) => !value);
              }}
            >
              <PixelIcon name={playing ? "pause" : "play"} size={12} /> {playing ? "PAUSE" : "PLAY"}
            </PixelButton>
            <button onClick={() => { setPlaying(false); setCursor((value) => Math.min(match.rounds.length, value + 1)); replayCue(match.rounds[cursor], 1); }} aria-label="Next round"><PixelIcon name="next" size={16} /></button>
            <button onClick={() => { setPlaying(false); setCursor(match.rounds.length); }} aria-label="Skip to end"><PixelIcon name="last" size={16} /></button>
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
        )}
      </PixelPanel>

      <div className="battle-presets">
        <button
          type="button"
          className={`predict-toggle ${predicting ? "is-active" : ""}`}
          aria-pressed={predicting}
          onClick={() => {
            playCue("click");
            setPredicting((value) => !value);
            setSession({ made: 0, correct: 0, streak: 0 });
            resetPlayback();
          }}
        >
          <PixelIcon name="star" size={12} /> PREDICT MODE {predicting ? "ON" : "OFF"}
        </button>
        <span>QUICK MATCHES</span>
        {([
          ["tit-for-tat", "grim-trigger", "RECIPROCITY VS GRUDGES", 0],
          ["detective", "always-cooperate", "PROBER VS NAIVE", 0],
          ["tit-for-tat", "tit-for-tat", "TFT ECHO UNDER NOISE", 0.05],
          ["pavlov", "pavlov", "PAVLOV REPAIRS NOISE", 0.05],
          ["extort-2", "generous-tit-for-tat", "EXTORTION VS GENEROSITY", 0],
        ] as const).map(([left, right, label, level]) => (
          <button key={label} onClick={() => { setStrategyAId(left); setStrategyBId(right); setNoise(level); resetPlayback(); }}>
            {label} <PixelIcon name="arrowRight" size={10} />
          </button>
        ))}
      </div>
    </main>
  );
}
