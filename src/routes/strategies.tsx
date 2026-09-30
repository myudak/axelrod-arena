
import { useMemo, useState } from "react";
import { MoveChip } from "@/components/move-history";
import { PageMeta } from "@/components/page-meta";
import { PixelBadge, PixelLink, PixelPanel, ScreenTitle } from "@/components/retro";
import { StrategyAvatar } from "@/components/strategy-avatar";
import {
  getStrategy,
  simulateMatch,
  strategies,
  type StrategyCategory,
} from "@/lib/game";

type Filter = "ALL" | StrategyCategory;
const filters: Filter[] = ["ALL", "BEGINNER", "CLASSIC", "ADVANCED"];

export default function StrategiesPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState("tit-for-tat");
  const selected = getStrategy(selectedId);
  const visible = filter === "ALL"
    ? strategies
    : strategies.filter((strategy) => strategy.category === filter);
  const demonstration = useMemo(
    () =>
      simulateMatch(selected, getStrategy("tit-for-tat"), {
        rounds: 12,
        seed: `profile:${selected.id}`,
      }),
    [selected],
  );

  return (
    <main className="app-shell">
      <PageMeta title="Strategy Encyclopedia" description="Explore classical Iterated Prisoner's Dilemma strategies and their decision rules." />
      <ScreenTitle
        title="KNOW YOUR OPPONENT"
        description="Every fighter is only a small decision rule plus memory. The surprising behavior comes from what happens when those rules repeatedly meet."
      />

      <div className="strategy-filters" role="group" aria-label="Filter strategies">
        {filters.map((value) => (
          <button
            key={value}
            className={filter === value ? "is-active" : ""}
            onClick={() => setFilter(value)}
          >
            {value} {value === "ALL" ? `(${strategies.length})` : `(${strategies.filter((strategy) => strategy.category === value).length})`}
          </button>
        ))}
      </div>

      <div className="strategy-library">
        <div className="strategy-grid">
          {visible.map((strategy) => (
            <button
              key={strategy.id}
              className={`strategy-card ${selectedId === strategy.id ? "is-selected" : ""}`}
              onClick={() => setSelectedId(strategy.id)}
            >
              <div className="strategy-card__top">
                <StrategyAvatar strategy={strategy} size="medium" />
                <PixelBadge>{strategy.category}</PixelBadge>
              </div>
              <span className="strategy-number">
                #{(strategies.findIndex((item) => item.id === strategy.id) + 1).toString().padStart(2, "0")}
              </span>
              <h2>{strategy.shortName}</h2>
              <p>{strategy.tagline}</p>
              <div className="trait-row">
                {strategy.traits.slice(0, 2).map((trait) => <span key={trait}>{trait}</span>)}
              </div>
              <i aria-hidden="true">INSPECT →</i>
            </button>
          ))}
        </div>

        <PixelPanel className="strategy-detail">
          <div className="strategy-detail__hero">
            <StrategyAvatar strategy={selected} />
            <div>
              <PixelBadge tone="gold">{selected.category}</PixelBadge>
              <h2>{selected.name}</h2>
              <p>{selected.tagline}</p>
            </div>
          </div>

          <section>
            <span>BEHAVIOR</span>
            <p>{selected.description}</p>
          </section>

          <section>
            <span>DECISION RULE</span>
            <pre><code>{selected.rule}</code></pre>
          </section>

          <section>
            <span>STRATEGIC TRAITS</span>
            <div className="detail-traits">
              {selected.traits.map((trait) => <i key={trait}>{trait}</i>)}
            </div>
          </section>

          <section>
            <span>12 ROUNDS VS TIT FOR TAT</span>
            <div className="profile-sequence">
              <div>
                <b>{selected.symbol}</b>
                {demonstration.rounds.map((round) => (
                  <MoveChip key={`a-${round.round}`} move={round.moveA} />
                ))}
              </div>
              <div>
                <b>TFT</b>
                {demonstration.rounds.map((round) => (
                  <MoveChip key={`b-${round.round}`} move={round.moveB} />
                ))}
              </div>
            </div>
          </section>

          <div className="detail-actions">
            <PixelLink href={`/play?opponent=${selected.id}`}>FIGHT THIS STRATEGY</PixelLink>
            <PixelLink href={`/battle?a=${selected.id}&b=tit-for-tat`} tone="quiet">OPEN IN BATTLE</PixelLink>
          </div>
        </PixelPanel>
      </div>

      <PixelPanel className="principles-panel">
        <div>
          <PixelBadge tone="cooperate">AXELROD&apos;S LESSON</PixelBadge>
          <h2>THE STRONGEST STRATEGIES TEND TO BE RECOGNIZABLE.</h2>
        </div>
        <dl>
          <div><dt>01</dt><dd><strong>NICE</strong><span>Don&apos;t defect first.</span></dd></div>
          <div><dt>02</dt><dd><strong>RETALIATORY</strong><span>Don&apos;t accept exploitation.</span></dd></div>
          <div><dt>03</dt><dd><strong>FORGIVING</strong><span>Return to cooperation.</span></dd></div>
          <div><dt>04</dt><dd><strong>CLEAR</strong><span>Make your policy legible.</span></dd></div>
        </dl>
      </PixelPanel>
    </main>
  );
}
