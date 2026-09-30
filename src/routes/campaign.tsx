import { useState } from "react";
import { useSearchParams } from "react-router";
import { MatchArena } from "@/components/match-arena";
import { MatchResult } from "@/components/match-result";
import { PageMeta } from "@/components/page-meta";
import { PixelIcon } from "@/components/pixel-icon";
import { PixelBadge, PixelButton, PixelPanel, ScreenTitle } from "@/components/retro";
import { StrategyAvatar } from "@/components/strategy-avatar";
import { CAMPAIGN_RULES, stageMap, stages } from "@/data/campaign";
import { cite, paperMap } from "@/data/papers";
import { getStrategy } from "@/lib/game";
import { isStageUnlocked, recordMatch, useProgress } from "@/lib/progress";
import { playCue } from "@/lib/sound";

function Stars({ count, max = 3, animate = false }: { count: number; max?: number; animate?: boolean }) {
  return (
    <span className="stars" aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }, (_, index) => (
        <span
          key={index}
          className={`star ${index < count ? "is-lit" : ""} ${animate && index < count ? "is-popping" : ""}`}
          style={animate ? { animationDelay: `${400 + index * 260}ms` } : undefined}
        >
          <PixelIcon name="star" size={animate ? 26 : 12} />
        </span>
      ))}
    </span>
  );
}

type Outcome = ReturnType<typeof recordMatch>;

export default function CampaignPage() {
  const progress = useProgress();
  const [searchParams, setSearchParams] = useSearchParams();
  const firstOpen =
    stages.find((stage) => isStageUnlocked(stage.id, progress) && !(progress.stars[stage.id] >= 1)) ??
    stages[0];
  const requested = searchParams.get("stage");
  const stage =
    requested && stageMap[requested] && isStageUnlocked(requested, progress)
      ? stageMap[requested]
      : firstOpen;
  const opponent = getStrategy(stage.opponentId);
  const [fighting, setFighting] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const stageIndex = stages.indexOf(stage);
  const next = stages[stageIndex + 1];
  const totalStars = stages.reduce((sum, item) => sum + (progress.stars[item.id] ?? 0), 0);

  const openStage = (id: string) => {
    playCue("click");
    setFighting(false);
    setOutcome(null);
    setSearchParams({ stage: id }, { replace: true });
  };

  const start = () => {
    playCue("flip");
    // Pin the stage: clearing it would otherwise move the "first open stage" default mid-match.
    if (requested !== stage.id) setSearchParams({ stage: stage.id }, { replace: true });
    setOutcome(null);
    setAttempt((value) => value + 1);
    setFighting(true);
  };

  return (
    <main className="app-shell">
      <PageMeta
        title="Campaign"
        description="Climb a ladder of classic Prisoner's Dilemma strategies, one game-theory lesson at a time."
      />
      <ScreenTitle
        title="THE CAMPAIGN LADDER"
        description="Thirteen rivals, thirteen lessons from the research. Complete a stage's main goal to unlock the next rival; bonus goals earn extra stars."
      />

      <div className="campaign-layout">
        <PixelPanel className="stage-ladder">
          <div className="panel-heading">
            <span>STAGES</span>
            <b>
              <PixelIcon name="star" size={10} /> {totalStars} / {stages.length * 3}
            </b>
          </div>
          <ol>
            {stages.map((item, index) => {
              const unlocked = isStageUnlocked(item.id, progress);
              const stars = progress.stars[item.id] ?? 0;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`stage-button ${item.id === stage.id ? "is-selected" : ""} ${stars ? "is-cleared" : ""}`}
                    disabled={!unlocked}
                    aria-current={item.id === stage.id ? "step" : undefined}
                    onClick={() => openStage(item.id)}
                  >
                    <span className="stage-button__number">{String(index + 1).padStart(2, "0")}</span>
                    {unlocked ? (
                      <StrategyAvatar strategy={getStrategy(item.opponentId)} size="small" />
                    ) : (
                      <span className="stage-button__lock">
                        <PixelIcon name="lock" size={16} />
                      </span>
                    )}
                    <span className="stage-button__text">
                      <strong>{unlocked ? item.title : "LOCKED"}</strong>
                      <Stars count={stars} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </PixelPanel>

        <div className="campaign-main">
          {!fighting ? (
            <PixelPanel className="stage-briefing">
              <div className="stage-briefing__hero">
                <StrategyAvatar strategy={opponent} />
                <div>
                  <PixelBadge tone="gold">STAGE {stageIndex + 1}</PixelBadge>
                  <h2>{stage.title}</h2>
                  <p className="stage-briefing__who">VS {opponent.name.toUpperCase()}</p>
                </div>
              </div>
              <p className="stage-briefing__text">{stage.briefing}</p>
              <ul className="goal-list">
                {stage.goals.map((goal, index) => (
                  <li key={goal.label} className={(progress.stars[stage.id] ?? 0) > index ? "is-met" : ""}>
                    <PixelIcon name={(progress.stars[stage.id] ?? 0) > index ? "star" : index === 0 ? "trophy" : "star"} size={14} />
                    <span>
                      <small>{index === 0 ? "MAIN GOAL" : `BONUS ${index}`}</small>
                      {goal.label}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="complete-actions">
                <PixelButton onClick={start}>
                  <PixelIcon name="play" size={12} /> START STAGE
                </PixelButton>
              </div>
            </PixelPanel>
          ) : (
            <MatchArena
              key={`${stage.id}:${attempt}`}
              opponent={opponent}
              rules={CAMPAIGN_RULES}
              label={`STAGE ${stageIndex + 1} · ${stage.title}`}
              onFinish={(summary) => {
                const result = recordMatch(summary, stage.id);
                setOutcome(result);
                return result.stars === 3 ? "great" : result.stars > 0 ? "good" : "bad";
              }}
              renderComplete={(summary) => (
                <MatchResult summary={summary} opponentName={opponent.shortName} xp={outcome?.xp}>
                  <div className="stage-result">
                    <Stars count={outcome?.stars ?? 0} animate />
                    <ul className="goal-list goal-list--result">
                      {stage.goals.map((goal, index) => {
                        const met = outcome?.met?.[index] && outcome.met[0];
                        return (
                          <li key={goal.label} className={met ? "is-met" : "is-missed"}>
                            <PixelIcon name={met ? "check" : "close"} size={14} />
                            <span>{goal.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="debrief">
                      <PixelBadge tone="cooperate">LESSON</PixelBadge>
                      <p>{stage.debrief}</p>
                      <ul className="source-list">
                        {stage.sources.map((id) => (
                          <li key={id}>
                            {paperMap[id]?.url ? (
                              <a href={paperMap[id].url} target="_blank" rel="noreferrer" title={paperMap[id].title}>
                                {cite(id)}
                              </a>
                            ) : (
                              cite(id)
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="complete-actions">
                    <PixelButton tone={outcome?.stars ? "quiet" : "primary"} onClick={start}>
                      <kbd>R</kbd> RETRY
                    </PixelButton>
                    {next && outcome && outcome.stars > 0 ? (
                      <PixelButton onClick={() => openStage(next.id)}>
                        NEXT STAGE <PixelIcon name="arrowRight" size={12} />
                      </PixelButton>
                    ) : null}
                  </div>
                </MatchResult>
              )}
            />
          )}
        </div>
      </div>
    </main>
  );
}
