import { useDeferredValue, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { MoveChip } from "@/components/move-history";
import { PageMeta } from "@/components/page-meta";
import { PixelIcon } from "@/components/pixel-icon";
import { PixelBadge, PixelButton, PixelLink, PixelPanel, ScreenTitle } from "@/components/retro";
import { StrategyAvatar } from "@/components/strategy-avatar";
import {
  customStrategy,
  type CustomStrategyDef,
  getStrategy,
  type MemoryOneSpec,
  memoryOnePresets,
  runTournament,
  simulateMatch,
  strategies,
} from "@/lib/game";
import {
  decodeCustom,
  deleteCustom,
  describeSpec,
  encodeCustom,
  MAX_CUSTOMS,
  newCustomId,
  saveCustom,
  useCustoms,
} from "@/lib/customs";
import { playCue } from "@/lib/sound";
import { pushToast } from "@/lib/toasts";

const sliders: { key: keyof MemoryOneSpec; label: string; hint: string; moves?: [string, string] }[] = [
  { key: "p0", label: "OPENING MOVE", hint: "Chance of cooperating in round 1" },
  { key: "pCC", label: "AFTER MUTUAL TRUST", hint: "Both cooperated last round", moves: ["C", "C"] },
  { key: "pCD", label: "AFTER BEING SUCKERED", hint: "You cooperated, they defected", moves: ["C", "D"] },
  { key: "pDC", label: "AFTER EXPLOITING", hint: "You defected, they cooperated", moves: ["D", "C"] },
  { key: "pDD", label: "AFTER MUTUAL DEFECTION", hint: "Both defected last round", moves: ["D", "D"] },
];

const blank = (): CustomStrategyDef => ({
  id: newCustomId(),
  name: "My Strategy",
  symbol: "MY",
  color: "custom",
  spec: { p0: 1, pCC: 1, pCD: 0.2, pDC: 1, pDD: 0.3 },
});

function sameSpec(a: MemoryOneSpec, b: MemoryOneSpec) {
  return (["p0", "pCC", "pCD", "pDC", "pDD"] as const).every((key) => Math.abs(a[key] - b[key]) < 0.005);
}

export default function LabPage() {
  const customs = useCustoms();
  const [searchParams, setSearchParams] = useSearchParams();
  const imported = useMemo(() => {
    const code = searchParams.get("import");
    return code ? decodeCustom(code) : null;
  }, [searchParams]);
  const [draft, setDraft] = useState<CustomStrategyDef>(() => imported ?? blank());
  const deferred = useDeferredValue(draft);
  const isSaved = customs.some((item) => item.id === draft.id);

  const preview = useMemo(() => {
    const strategy = customStrategy(deferred);
    const vsTft = simulateMatch(strategy, getStrategy("tit-for-tat"), { rounds: 12, seed: "lab-preview" });
    const field = runTournament({
      strategyIds: [...strategies.map((item) => item.id), deferred.id],
      customs: [deferred],
      rounds: 60,
      repetitions: 2,
      seed: "LAB-FORECAST",
    });
    const row = field.rows.find((item) => item.strategyId === deferred.id)!;
    return { vsTft, rank: row.rank, of: field.rows.length, average: row.averagePayoff, row };
  }, [deferred]);

  const setSpec = (key: keyof MemoryOneSpec, value: number) =>
    setDraft((current) => ({ ...current, spec: { ...current.spec, [key]: value } }));

  const save = () => {
    if (!saveCustom(draft)) {
      pushToast({ title: "LAB IS FULL", body: `Delete a strategy first (max ${MAX_CUSTOMS}).`, icon: "close", tone: "info" });
      return;
    }
    playCue("unlock");
    pushToast({
      title: isSaved ? "STRATEGY UPDATED" : "STRATEGY SAVED",
      body: `${draft.name} can now enter Play, Battle and Tournament.`,
      icon: "check",
      tone: "cooperate",
    });
    if (imported) setSearchParams({}, { replace: true });
  };

  const share = async () => {
    const url = `${window.location.origin}/lab?import=${encodeURIComponent(encodeCustom(draft))}`;
    try {
      await navigator.clipboard.writeText(url);
      pushToast({ title: "LINK COPIED", body: "Send it to a rival.", icon: "check", tone: "info" });
    } catch {
      window.prompt("Copy this share link:", url);
    }
  };

  const traits = describeSpec(draft.spec);
  const strategy = customStrategy(draft);

  return (
    <main className="app-shell">
      <PageMeta title="Strategy Lab" description="Design a memory-one Prisoner's Dilemma strategy and send it into the arena." />
      <ScreenTitle
        title="THE STRATEGY LAB"
        description="Every memory-one strategy is five numbers: how likely you are to cooperate at the start, and after each of the four possible last rounds. Tit for Tat, Pavlov, Generous TFT and even zero-determinant extortioners all live in this space."
      />

      {imported ? (
        <p className="mode-callout">
          <PixelIcon name="bolt" size={14} /> Someone shared <strong>{imported.name}</strong> with you. Tweak it or save it to your lab.
        </p>
      ) : null}

      <div className="lab-layout">
        <PixelPanel className="lab-editor">
          <div className="panel-heading">
            <span>DESIGN</span>
            <b>{isSaved ? "SAVED" : "UNSAVED"}</b>
          </div>
          <div className="lab-identity">
            <StrategyAvatar strategy={strategy} size="medium" />
            <label>
              <span>NAME</span>
              <input
                value={draft.name}
                maxLength={16}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label className="lab-identity__symbol">
              <span>TAG</span>
              <input
                value={draft.symbol}
                maxLength={3}
                onChange={(event) => setDraft((current) => ({ ...current, symbol: event.target.value.toUpperCase() }))}
              />
            </label>
          </div>

          <div className="preset-row" role="group" aria-label="Start from a known strategy">
            <span>PRESETS</span>
            {memoryOnePresets.map((preset) => (
              <button
                type="button"
                key={preset.id}
                className={sameSpec(preset.spec, draft.spec) ? "is-active" : ""}
                onClick={() => {
                  playCue("click");
                  setDraft((current) => ({ ...current, spec: { ...preset.spec } }));
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="slider-list">
            {sliders.map((slider) => (
              <label key={slider.key} className="slider-row">
                <span className="slider-row__label">
                  <strong>
                    {slider.moves ? (
                      <span className="slider-row__moves" aria-hidden="true">
                        <MoveChip move={slider.moves[0] as "C" | "D"} />
                        <MoveChip move={slider.moves[1] as "C" | "D"} />
                      </span>
                    ) : null}
                    {slider.label}
                  </strong>
                  <small>{slider.hint}</small>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(draft.spec[slider.key] * 100)}
                  onChange={(event) => setSpec(slider.key, Number(event.target.value) / 100)}
                  aria-valuetext={`${Math.round(draft.spec[slider.key] * 100)}% chance to cooperate`}
                />
                <output>{Math.round(draft.spec[slider.key] * 100)}% C</output>
              </label>
            ))}
          </div>

          <div className="complete-actions">
            <PixelButton onClick={save}>
              <PixelIcon name="check" size={12} /> {isSaved ? "UPDATE" : "SAVE TO LAB"}
            </PixelButton>
            <PixelButton tone="quiet" onClick={share}>SHARE LINK</PixelButton>
            <PixelButton
              tone="quiet"
              onClick={() => {
                setDraft(blank());
                if (imported) setSearchParams({}, { replace: true });
              }}
            >
              NEW
            </PixelButton>
          </div>
        </PixelPanel>

        <div className="lab-side">
          <PixelPanel className="lab-forecast">
            <div className="panel-heading">
              <span>FORECAST</span>
              <b>vs {preview.of - 1} classics</b>
            </div>
            <div className="lab-forecast__rank">
              <span>PROJECTED RANK</span>
              <strong className={preview.rank <= 3 ? "is-podium" : ""}>
                #{preview.rank}
                <small>/{preview.of}</small>
              </strong>
              <em>{preview.average.toFixed(2)} pts / turn</em>
            </div>
            <div className="trait-row">
              {traits.map((trait) => (
                <span key={trait}>{trait}</span>
              ))}
            </div>
            <div className="profile-sequence">
              <span className="profile-sequence__label">12 ROUNDS VS TIT FOR TAT</span>
              <div>
                <b>{draft.symbol || "MY"}</b>
                {preview.vsTft.rounds.map((round) => (
                  <MoveChip key={`a-${round.round}`} move={round.moveA} />
                ))}
              </div>
              <div>
                <b>TFT</b>
                {preview.vsTft.rounds.map((round) => (
                  <MoveChip key={`b-${round.round}`} move={round.moveB} />
                ))}
              </div>
            </div>
            <p className="lab-note">
              Quick forecast: 60-round round robin, 2 repetitions. Run the real{" "}
              <Link className="text-link" to="/tournament">TOURNAMENT</Link> for the full picture.
            </p>
          </PixelPanel>

          <PixelPanel className="lab-llm-teaser">
            <PixelBadge tone="gold">NEW</PixelBadge>
            <h2>PUT A LANGUAGE MODEL IN THE ARENA</h2>
            <p>Bring your own OpenRouter key and watch GPT, Claude, Gemini, DeepSeek, Kimi or Qwen play the classics.</p>
            <PixelLink href="/lab/llm">OPEN LLM LAB</PixelLink>
          </PixelPanel>

          <PixelPanel className="lab-saved">
            <div className="panel-heading">
              <span>YOUR STRATEGIES</span>
              <b>{customs.length} / {MAX_CUSTOMS}</b>
            </div>
            {customs.length === 0 ? (
              <p className="lab-empty">Nothing saved yet. Saved strategies join every roster.</p>
            ) : (
              <ul className="lab-saved__list">
                {customs.map((item) => (
                  <li key={item.id} className={item.id === draft.id ? "is-editing" : ""}>
                    <StrategyAvatar strategy={customStrategy(item)} size="small" />
                    <span>
                      <strong>{item.name}</strong>
                      <small>{describeSpec(item.spec).slice(0, 2).join(" · ") || "Memory-one"}</small>
                    </span>
                    <span className="lab-saved__actions">
                      <button type="button" onClick={() => setDraft({ ...item, spec: { ...item.spec } })}>EDIT</button>
                      <Link to={`/play?opponent=${item.id}`}>FIGHT</Link>
                      <button
                        type="button"
                        aria-label={`Delete ${item.name}`}
                        onClick={() => {
                          deleteCustom(item.id);
                          if (item.id === draft.id) setDraft(blank());
                        }}
                      >
                        <PixelIcon name="close" size={10} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PixelPanel>

        </div>
      </div>
    </main>
  );
}
