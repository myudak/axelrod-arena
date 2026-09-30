import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { MoveChip } from "@/components/move-history";
import { PageMeta } from "@/components/page-meta";
import { PixelIcon } from "@/components/pixel-icon";
import { PixelBadge, PixelButton, PixelPanel, ScreenTitle } from "@/components/retro";
import { StrategyAvatar } from "@/components/strategy-avatar";
import { cite } from "@/data/papers";
import { getStrategy, type Strategy, strategies } from "@/lib/game";
import { listModels, type ModelInfo } from "@/lib/llm/client";
import { type LlmMatch, type LlmRound, type LlmSettings, openRouterAsker, playLlmMatch } from "@/lib/llm/match";
import type { BehaviourProfile } from "@/lib/llm/metrics";
import { isLlmRun, type LlmRun, summarizeRun } from "@/lib/llm/run";
import { unlock } from "@/lib/progress";
import { playCue, outcomeCue } from "@/lib/sound";
import { createPersistentStore, useStore } from "@/lib/store";

const KEY_STORAGE = "axelrod:openrouter-key";

const families = [
  { label: "GPT", prefix: "openai/", fallback: "openai/gpt-4o-mini" },
  { label: "CLAUDE", prefix: "anthropic/", fallback: "anthropic/claude-3.5-haiku" },
  { label: "GEMINI", prefix: "google/gemini", fallback: "google/gemini-2.0-flash-001" },
  { label: "DEEPSEEK", prefix: "deepseek/", fallback: "deepseek/deepseek-chat" },
  { label: "KIMI", prefix: "moonshotai/", fallback: "moonshotai/kimi-k2" },
  { label: "QWEN", prefix: "qwen/", fallback: "qwen/qwen-2.5-72b-instruct" },
];

const DEFAULT_OPPONENTS = ["tit-for-tat", "always-defect", "detective"];

const runsStore = createPersistentStore<LlmRun[]>("axelrod:llm-runs", [], (raw) =>
  Array.isArray(raw) ? raw.filter(isLlmRun).slice(0, 10) : [],
);

const publishedModules = import.meta.glob("../data/llm-runs/*.json", { eager: true, import: "default" });
const publishedRuns = Object.values(publishedModules).filter(isLlmRun);

function readSavedKey() {
  try {
    return window.localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

/** A Strategy-shaped card so the model can use the arena's avatar component. */
function modelCard(model: string): Strategy {
  const short = model.split("/").pop() ?? model;
  return {
    ...getStrategy("tit-for-tat"),
    id: `llm:${model}`,
    name: model,
    shortName: short.toUpperCase().slice(0, 18),
    symbol: "AI",
    category: "CUSTOM",
  };
}

const PROFILE_ROWS: { key: keyof BehaviourProfile; label: string; help: string }[] = [
  { key: "niceness", label: "NICE", help: "Never the first to defect" },
  { key: "retaliation", label: "RETALIATORY", help: "Defects after the opponent defects" },
  { key: "forgiveness", label: "FORGIVING", help: "Returns to C once the opponent does" },
  { key: "troublemaking", label: "TROUBLEMAKER", help: "Defects without provocation" },
  { key: "emulation", label: "EMULATIVE", help: "Copies the opponent's last move" },
  { key: "cooperation", label: "COOPERATION", help: "Share of moves that were C" },
];

function ProfileBars({ profile }: { profile: BehaviourProfile }) {
  return (
    <dl className="llm-profile">
      {PROFILE_ROWS.map((row) => {
        const value = profile[row.key];
        return (
          <div key={row.key}>
            <dt>
              <strong>{row.label}</strong>
              <small>{row.help}</small>
            </dt>
            <dd>
              <span className="llm-profile__bar">
                <i style={{ width: `${(value ?? 0) * 100}%` }} />
              </span>
              <b>{value === null ? "n/a" : `${Math.round(value * 100)}%`}</b>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function RunSummary({ run, onRemove }: { run: LlmRun; onRemove?: () => void }) {
  const download = () => {
    const blob = new Blob([`${JSON.stringify(run, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${run.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <PixelPanel className="llm-run">
      <div className="llm-run__head">
        <StrategyAvatar strategy={modelCard(run.settings.model)} size="small" />
        <div>
          <strong>{run.settings.model}</strong>
          <small>
            {new Date(run.createdAt).toLocaleString()} · {run.settings.rounds} rounds · T={run.settings.temperature} ·{" "}
            {run.settings.framing} framing{run.settings.revealLength ? " · length revealed" : ""}
          </small>
        </div>
        <PixelBadge tone="gold">{run.averagePayoff.toFixed(2)} / ROUND</PixelBadge>
      </div>
      <table className="llm-run__table">
        <thead>
          <tr>
            <th scope="col">OPPONENT</th>
            <th scope="col">MOVES (MODEL / OPPONENT)</th>
            <th scope="col">SCORE</th>
          </tr>
        </thead>
        <tbody>
          {run.matches.map((match) => (
            <tr key={match.opponentId}>
              <th scope="row">{getStrategy(match.opponentId).shortName}</th>
              <td>
                <span className="llm-run__moves">
                  {match.rounds.map((round) => (
                    <MoveChip key={`a${round.round}`} move={round.moveA} flipped={round.fallback} />
                  ))}
                </span>
                <span className="llm-run__moves">
                  {match.rounds.map((round) => (
                    <MoveChip key={`b${round.round}`} move={round.moveB} />
                  ))}
                </span>
              </td>
              <td>
                {match.scoreA}–{match.scoreB}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ProfileBars profile={run.profile} />
      <div className="complete-actions">
        <PixelButton tone="quiet" onClick={download}>
          DOWNLOAD JSON
        </PixelButton>
        {onRemove ? (
          <PixelButton tone="quiet" onClick={onRemove}>
            REMOVE
          </PixelButton>
        ) : null}
      </div>
    </PixelPanel>
  );
}

export default function LlmLabPage() {
  const savedRuns = useStore(runsStore);
  const [apiKey, setApiKey] = useState(readSavedKey);
  const [remember, setRemember] = useState(() => Boolean(readSavedKey()));
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsError, setModelsError] = useState("");
  const [settings, setSettings] = useState<LlmSettings>({
    model: families[0].fallback,
    rounds: 20,
    temperature: 0.7,
    framing: "neutral",
    revealLength: false,
  });
  const [opponents, setOpponents] = useState<string[]>(DEFAULT_OPPONENTS);
  const [status, setStatus] = useState<"idle" | "running" | "error">("idle");
  const [error, setError] = useState("");
  const [live, setLive] = useState<{ opponentId: string; rounds: LlmRound[] } | null>(null);
  const [completed, setCompleted] = useState<LlmMatch[]>([]);
  const [lastRun, setLastRun] = useState<LlmRun | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    listModels()
      .then((list) => {
        if (cancelled) return;
        setModels(list);
        setSettings((current) => {
          const first = list.find((model) => model.id.startsWith(families[0].prefix));
          return first && current.model === families[0].fallback ? { ...current, model: first.id } : current;
        });
      })
      .catch(() => !cancelled && setModelsError("Model list unavailable. Type an OpenRouter model id."));
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    try {
      if (remember && apiKey) window.localStorage.setItem(KEY_STORAGE, apiKey);
      else window.localStorage.removeItem(KEY_STORAGE);
    } catch {
      // Storage blocked: the key simply stays in memory.
    }
  }, [apiKey, remember]);

  const selectedModel = models.find((model) => model.id === settings.model);
  const calls = settings.rounds * opponents.length;
  const estimate = useMemo(() => {
    const prompt = Number(selectedModel?.pricing?.prompt ?? NaN);
    const completion = Number(selectedModel?.pricing?.completion ?? NaN);
    if (!Number.isFinite(prompt) || !Number.isFinite(completion)) return null;
    const averagePromptTokens = 260 + 28 * (settings.rounds / 2);
    return calls * (averagePromptTokens * prompt + 4 * completion);
  }, [calls, selectedModel, settings.rounds]);

  const pickFamily = (prefix: string, fallback: string) => {
    playCue("click");
    const match = models.find((model) => model.id.startsWith(prefix));
    setSettings((current) => ({ ...current, model: match?.id ?? fallback }));
  };

  const run = async () => {
    if (!apiKey.trim() || !settings.model.trim() || opponents.length === 0) return;
    playCue("click");
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("running");
    setError("");
    setCompleted([]);
    setLastRun(null);
    const ask = openRouterAsker(apiKey.trim(), settings, window.location.origin);
    const finished: LlmMatch[] = [];
    try {
      for (const opponentId of opponents) {
        setLive({ opponentId, rounds: [] });
        const match = await playLlmMatch(ask, getStrategy(opponentId), settings, {
          signal: controller.signal,
          seed: `LLM-LAB:${Date.now()}`,
          onRound: (round) => {
            playCue(outcomeCue(round.moveA, round.moveB));
            setLive((current) => (current ? { ...current, rounds: [...current.rounds, round] } : current));
          },
        });
        finished.push(match);
        setCompleted([...finished]);
        unlock("lab-rat");
      }
      const summary = summarizeRun(settings, finished);
      runsStore.set((current) => [summary, ...current].slice(0, 10));
      setLastRun(summary);
      setStatus("idle");
      playCue("win");
    } catch (caught) {
      if ((caught as Error).name === "AbortError") {
        setStatus("idle");
        if (finished.length) {
          const summary = summarizeRun(settings, finished);
          runsStore.set((current) => [summary, ...current].slice(0, 10));
          setLastRun(summary);
        }
      } else {
        setStatus("error");
        setError((caught as Error).message || "Something went wrong.");
        playCue("lose");
      }
    } finally {
      setLive(null);
      abortRef.current = null;
    }
  };

  const liveOpponent = live ? getStrategy(live.opponentId) : null;
  const liveScore = live
    ? live.rounds.reduce((acc, round) => [acc[0] + round.payoffA, acc[1] + round.payoffB], [0, 0])
    : [0, 0];
  const latest = live?.rounds[live.rounds.length - 1];

  return (
    <main className="app-shell">
      <PageMeta
        title="LLM Lab"
        description="Put a large language model into the Iterated Prisoner's Dilemma against classic strategies and profile its behaviour."
      />
      <ScreenTitle
        title="LANGUAGE MODELS ENTER THE ARENA"
        description="Pick a model, pick its rivals, and watch it play the repeated Prisoner's Dilemma one round at a time. Then read its behavioural profile, measured along the dimensions used in recent LLM game-theory research."
      />

      <div className="lab-layout">
        <div className="lab-side">
          <PixelPanel className="llm-setup">
            <div className="panel-heading">
              <span>1 · API KEY</span>
              <b>{apiKey ? "READY" : "REQUIRED"}</b>
            </div>
            <div className="llm-setup__body">
              <label className="llm-field">
                <span>OPENROUTER KEY</span>
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  value={apiKey}
                  placeholder="sk-or-..."
                  onChange={(event) => setApiKey(event.target.value)}
                />
              </label>
              <label className="llm-check">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                Remember on this device (stored unencrypted in this browser)
              </label>
              <p className="llm-note">
                Your key is sent only to openrouter.ai, straight from your browser. It never touches any other server. One
                key covers GPT, Claude, Gemini, DeepSeek, Kimi and Qwen. Get one at{" "}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">openrouter.ai/keys</a>, and set a
                spending limit on it.
              </p>
            </div>
          </PixelPanel>

          <PixelPanel className="llm-setup">
            <div className="panel-heading">
              <span>2 · MODEL</span>
              <b>{models.length ? `${models.length} AVAILABLE` : ""}</b>
            </div>
            <div className="llm-setup__body">
              <div className="preset-row preset-row--flush" role="group" aria-label="Model family">
                {families.map((family) => (
                  <button
                    type="button"
                    key={family.label}
                    className={settings.model.startsWith(family.prefix) ? "is-active" : ""}
                    onClick={() => pickFamily(family.prefix, family.fallback)}
                  >
                    {family.label}
                  </button>
                ))}
              </div>
              <label className="llm-field">
                <span>MODEL ID</span>
                <input
                  list="openrouter-models"
                  value={settings.model}
                  spellCheck={false}
                  onChange={(event) => setSettings((current) => ({ ...current, model: event.target.value }))}
                />
                <datalist id="openrouter-models">
                  {models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </datalist>
              </label>
              {modelsError ? <p className="llm-note">{modelsError}</p> : null}
            </div>
          </PixelPanel>

          <PixelPanel className="llm-setup">
            <div className="panel-heading">
              <span>3 · EXPERIMENT</span>
              <b>{calls} CALLS{estimate !== null ? ` · ≈ $${estimate < 0.01 ? estimate.toFixed(4) : estimate.toFixed(2)}` : ""}</b>
            </div>
            <div className="llm-setup__body">
              <div className="llm-grid">
                <label className="llm-field">
                  <span>ROUNDS</span>
                  <select
                    value={settings.rounds}
                    onChange={(event) => setSettings((current) => ({ ...current, rounds: Number(event.target.value) }))}
                  >
                    {[10, 20, 30, 50].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="llm-field">
                  <span>TEMPERATURE</span>
                  <select
                    value={settings.temperature}
                    onChange={(event) => setSettings((current) => ({ ...current, temperature: Number(event.target.value) }))}
                  >
                    {[0, 0.7, 1].map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
                <label className="llm-field">
                  <span>FRAMING</span>
                  <select
                    value={settings.framing}
                    onChange={(event) =>
                      setSettings((current) => ({ ...current, framing: event.target.value as LlmSettings["framing"] }))
                    }
                  >
                    <option value="neutral">NEUTRAL (J / F)</option>
                    <option value="explicit">EXPLICIT (COOPERATE / DEFECT)</option>
                  </select>
                </label>
              </div>
              <label className="llm-check">
                <input
                  type="checkbox"
                  checked={settings.revealLength}
                  onChange={(event) => setSettings((current) => ({ ...current, revealLength: event.target.checked }))}
                />
                Tell the model how many rounds there are (invites last-round defection)
              </label>
              <div className="roster-toggles roster-toggles--flush" role="group" aria-label="Opponents">
                <span className="roster-toggles__label">OPPONENTS · {opponents.length}</span>
                {strategies.map((strategy) => {
                  const on = opponents.includes(strategy.id);
                  return (
                    <button
                      type="button"
                      key={strategy.id}
                      className={`roster-toggle ${on ? "is-on" : ""}`}
                      aria-pressed={on}
                      title={strategy.name}
                      onClick={() =>
                        setOpponents((current) =>
                          on ? current.filter((id) => id !== strategy.id) : [...current, strategy.id],
                        )
                      }
                    >
                      <StrategyAvatar strategy={strategy} size="small" />
                      <span>{strategy.symbol}</span>
                    </button>
                  );
                })}
              </div>
              <div className="complete-actions complete-actions--start">
                {status === "running" ? (
                  <PixelButton tone="defect" onClick={() => abortRef.current?.abort()}>
                    STOP
                  </PixelButton>
                ) : (
                  <PixelButton onClick={run} disabled={!apiKey.trim() || !settings.model.trim() || opponents.length === 0}>
                    <PixelIcon name="play" size={12} /> RUN EXPERIMENT
                  </PixelButton>
                )}
              </div>
              {status === "error" ? (
                <p className="llm-error" role="alert">
                  <PixelIcon name="close" size={12} /> {error}
                </p>
              ) : null}
            </div>
          </PixelPanel>
        </div>

        <div className="lab-side">
          <PixelPanel className="llm-live">
            <div className="panel-heading">
              <span>LIVE MATCH</span>
              <b>
                {live && liveOpponent
                  ? `VS ${liveOpponent.shortName} · ROUND ${live.rounds.length + 1}/${settings.rounds} · MATCH ${completed.length + 1}/${opponents.length}`
                  : status === "running"
                    ? "STARTING…"
                    : "IDLE"}
              </b>
            </div>
            {live && liveOpponent ? (
              <div className="llm-live__stage">
                <div className="llm-live__fighters">
                  <div>
                    <StrategyAvatar strategy={modelCard(settings.model)} size="medium" mood={latest ? (latest.moveA === "D" ? "smug" : "happy") : "thinking"} />
                    <strong>{liveScore[0]}</strong>
                  </div>
                  <span className="versus-mark">VS</span>
                  <div>
                    <StrategyAvatar strategy={liveOpponent} size="medium" />
                    <strong>{liveScore[1]}</strong>
                  </div>
                </div>
                <div className="profile-sequence">
                  <div>
                    <b>AI</b>
                    {live.rounds.map((round) => (
                      <MoveChip key={`a${round.round}`} move={round.moveA} flipped={round.fallback} />
                    ))}
                  </div>
                  <div>
                    <b>{liveOpponent.symbol}</b>
                    {live.rounds.map((round) => (
                      <MoveChip key={`b${round.round}`} move={round.moveB} />
                    ))}
                  </div>
                </div>
                {latest ? (
                  <p className="llm-live__raw">
                    <span>LAST REPLY</span> <code>{latest.raw || "(empty)"}</code>
                    {latest.fallback ? <em> unparseable, counted as C</em> : null}
                  </p>
                ) : (
                  <p className="llm-live__raw">Waiting for the model…</p>
                )}
                <div className="llm-progress" aria-hidden="true">
                  <i style={{ width: `${((completed.length * settings.rounds + live.rounds.length) / calls) * 100}%` }} />
                </div>
              </div>
            ) : (
              <p className="lab-empty">
                {status === "running"
                  ? "Connecting…"
                  : "Add a key, pick a model and press RUN. Each round is one API call with the full history, so the model plays with complete memory."}
              </p>
            )}
          </PixelPanel>

          {lastRun ? <RunSummary run={lastRun} /> : null}

          <PixelPanel className="llm-method">
            <PixelBadge tone="cooperate">METHOD</PixelBadge>
            <p>
              Each round the model gets the payoff rules and the complete history, and must answer with one letter. By default
              the actions are neutral letters (J/F), which avoids priming from the words &ldquo;cooperate&rdquo; and
              &ldquo;defect&rdquo; ({cite("akata2025")}). The profile adapts the behavioural dimensions of {cite("fontana2025")}.
              For evolutionary LLM tournaments see {cite("payne2025")}. Replies that can&apos;t be parsed twice are counted as C
              and marked on the chips. This is an exploration tool, not a replication: models, prompts and temperatures differ
              from the papers. See <Link className="text-link" to="/research#llm">RESEARCH</Link>.
            </p>
          </PixelPanel>
        </div>
      </div>

      <section className="research-section">
        <div className="section-heading">
          <h2>YOUR RUNS</h2>
          <p>The last 10 experiments from this browser. Download a JSON file to keep or share one.</p>
        </div>
        {savedRuns.length === 0 ? (
          <p className="lab-empty">No runs yet.</p>
        ) : (
          <div className="llm-runs">
            {savedRuns.map((item) => (
              <RunSummary
                key={item.id}
                run={item}
                onRemove={() => runsStore.set((current) => current.filter((runItem) => runItem.id !== item.id))}
              />
            ))}
          </div>
        )}
      </section>

      <section className="research-section">
        <div className="section-heading">
          <h2>PUBLISHED RUNS</h2>
          <p>
            Runs committed to the repository with <code>npm run llm-arena</code>. Everyone who opens the site can see them, no
            key needed.
          </p>
        </div>
        {publishedRuns.length === 0 ? (
          <p className="lab-empty">
            None yet. Run <code>OPENROUTER_API_KEY=… npm run llm-arena -- --model &lt;id&gt;</code> and commit the file it
            writes to <code>src/data/llm-runs/</code>.
          </p>
        ) : (
          <div className="llm-runs">
            {publishedRuns.map((item) => (
              <RunSummary key={item.id} run={item} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
