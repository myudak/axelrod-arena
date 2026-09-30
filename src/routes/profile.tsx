import { useState } from "react";
import { PageMeta } from "@/components/page-meta";
import { PixelIcon } from "@/components/pixel-icon";
import { PixelBadge, PixelButton, PixelLink, PixelPanel, ScreenTitle } from "@/components/retro";
import { HumanAvatar } from "@/components/strategy-avatar";
import { achievements } from "@/data/achievements";
import { stages } from "@/data/campaign";
import { levelInfo, resetProgress, useProgress } from "@/lib/progress";

export default function ProfilePage() {
  const progress = useProgress();
  const level = levelInfo(progress.xp);
  const [confirming, setConfirming] = useState(false);
  const unlocked = achievements.filter((achievement) => progress.achievements[achievement.id]);
  const stars = stages.reduce((sum, stage) => sum + (progress.stars[stage.id] ?? 0), 0);
  const { stats } = progress;

  return (
    <main className="app-shell">
      <PageMeta title="Profile" description="Your level, badges and lifetime Prisoner's Dilemma stats." />
      <ScreenTitle title="PLAYER PROFILE" description="Everything you've earned in the arena. Progress is saved in this browser only." />

      <div className="profile-layout">
        <PixelPanel className="profile-card">
          <HumanAvatar mood={level.level >= 4 ? "happy" : "thinking"} />
          <PixelBadge tone="gold">LEVEL {level.level}</PixelBadge>
          <h2>{level.title}</h2>
          <div className="xp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={level.needed} aria-valuenow={level.into} aria-label="Experience to next level">
            <i style={{ width: `${level.progress * 100}%` }} />
          </div>
          <p className="xp-bar__label">
            {level.into} / {level.needed} XP TO LEVEL {level.level + 1}
          </p>
          <dl className="profile-stats">
            <div><dt>TOTAL XP</dt><dd>{progress.xp}</dd></div>
            <div><dt>MATCHES</dt><dd>{stats.matchesPlayed}</dd></div>
            <div><dt>ROUNDS</dt><dd>{stats.roundsPlayed}</dd></div>
            <div>
              <dt>YOUR COOP</dt>
              <dd>{stats.roundsPlayed ? Math.round((stats.cooperations / stats.roundsPlayed) * 100) : 0}%</dd>
            </div>
            <div><dt>BEST COMBO</dt><dd>×{stats.bestStreak}</dd></div>
            <div><dt>S RANKS</dt><dd>{stats.sRanks}</dd></div>
            <div><dt>CAMPAIGN</dt><dd>{stars}/{stages.length * 3}★</dd></div>
            <div>
              <dt>PREDICTIONS</dt>
              <dd>{stats.predictionsMade ? Math.round((stats.predictionsCorrect / stats.predictionsMade) * 100) : 0}%</dd>
            </div>
          </dl>
          <div className="complete-actions">
            <PixelLink href="/campaign">CONTINUE CAMPAIGN</PixelLink>
          </div>
        </PixelPanel>

        <PixelPanel className="badge-panel">
          <div className="panel-heading">
            <span>BADGES</span>
            <b>{unlocked.length} / {achievements.length}</b>
          </div>
          <ul className="badge-grid">
            {achievements.map((achievement) => {
              const at = progress.achievements[achievement.id];
              return (
                <li key={achievement.id} className={at ? "is-unlocked" : "is-locked"}>
                  <span className="badge-grid__icon">
                    <PixelIcon name={at ? achievement.icon : "lock"} size={22} />
                  </span>
                  <strong>{at ? achievement.title : "???"}</strong>
                  <small>{at ? achievement.description : achievement.hint}</small>
                  <em>{at ? new Date(at).toLocaleDateString() : `+${achievement.xp} XP`}</em>
                </li>
              );
            })}
          </ul>
        </PixelPanel>
      </div>

      <div className="danger-zone">
        {confirming ? (
          <>
            <span>Erase all XP, stars and badges?</span>
            <PixelButton tone="defect" onClick={() => { resetProgress(); setConfirming(false); }}>
              YES, RESET
            </PixelButton>
            <PixelButton tone="quiet" onClick={() => setConfirming(false)}>CANCEL</PixelButton>
          </>
        ) : (
          <button type="button" className="text-link" onClick={() => setConfirming(true)}>
            <PixelIcon name="close" size={10} /> RESET PROGRESS
          </button>
        )}
      </div>
    </main>
  );
}
