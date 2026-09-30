import { Link } from "react-router";
import { MoveChip } from "@/components/move-history";
import { PageMeta } from "@/components/page-meta";
import { PixelLink, PixelPanel } from "@/components/retro";
import { StrategyAvatar } from "@/components/strategy-avatar";
import { getStrategy, simulateMatch, strategies } from "@/lib/game";

const featured = simulateMatch(getStrategy("tit-for-tat"), getStrategy("detective"), {
  rounds: 12,
  seed: "featured-battle",
});

export default function Home() {
  const titForTat = getStrategy("tit-for-tat");
  const detective = getStrategy("detective");

  return (
    <main>
      <PageMeta description="Play, replay, and simulate the Iterated Prisoner's Dilemma with classic Axelrod strategies." />
      <section className="hero arena-grid">
        <div className="hero__copy">
          <h1>
            CAN COOPERATION <span>SURVIVE?</span>
          </h1>
          <p>
            Play the repeated Prisoner&apos;s Dilemma. Build trust, punish betrayal,
            and see which strategy survives.
          </p>
          <div className="hero__actions">
            <PixelLink href="/play">▶ PLAY YOURSELF</PixelLink>
            <PixelLink href="/tournament" tone="quiet">RUN TOURNAMENT</PixelLink>
          </div>
          <div className="hero__facts" aria-label="Game facts">
            <div>
              <strong>10</strong>
              <span>CLASSIC FIGHTERS</span>
            </div>
            <div>
              <strong>200</strong>
              <span>ROUNDS / MATCH</span>
            </div>
            <div>
              <strong>5·3·1·0</strong>
              <span>AXELROD PAYOFFS</span>
            </div>
          </div>
        </div>

        <PixelPanel className="hero-battle">
          <div className="broadcast-label">
            <span>LIVE REPLAY</span>
            <b>ROUND {featured.rounds.length}</b>
          </div>
          <div className="versus-stage">
            <div className="fighter-card">
              <StrategyAvatar strategy={titForTat} />
              <h2>{titForTat.shortName}</h2>
              <strong>{featured.scoreA}</strong>
            </div>
            <div className="versus-mark">VS</div>
            <div className="fighter-card">
              <StrategyAvatar strategy={detective} />
              <h2>{detective.shortName}</h2>
              <strong>{featured.scoreB}</strong>
            </div>
          </div>
          <div className="mini-history">
            <div>
              <span>TFT</span>
              {featured.rounds.map((round) => (
                <MoveChip key={`a-${round.round}`} move={round.moveA} />
              ))}
            </div>
            <div>
              <span>DET</span>
              {featured.rounds.map((round) => (
                <MoveChip key={`b-${round.round}`} move={round.moveB} />
              ))}
            </div>
          </div>
          <p className="battle-caption">
            Detective probes. Tit for Tat answers. Every move changes what comes
            next.
          </p>
          <Link className="text-link" to="/battle">
            WATCH THE FULL BATTLE →
          </Link>
        </PixelPanel>
      </section>

      <section className="rules-section page-shell">
        <div className="section-heading">
          <h2>ONE MOVE IS SIMPLE. A RELATIONSHIP ISN&apos;T.</h2>
          <p>
            Each round, both players act simultaneously. Defection can win now;
            cooperation can win over time.
          </p>
        </div>
        <div className="payoff-grid" aria-label="Prisoner's Dilemma payoff matrix">
          <div className="payoff-grid__corner">YOU / THEM</div>
          <div className="payoff-grid__head cooperate-text">COOPERATE</div>
          <div className="payoff-grid__head defect-text">DEFECT</div>
          <div className="payoff-grid__head cooperate-text">COOPERATE</div>
          <div className="payoff-cell payoff-cell--good">
            <strong>+3 / +3</strong>
            <span>MUTUAL TRUST</span>
          </div>
          <div className="payoff-cell payoff-cell--hurt">
            <strong>+0 / +5</strong>
            <span>YOU GET PLAYED</span>
          </div>
          <div className="payoff-grid__head defect-text">DEFECT</div>
          <div className="payoff-cell payoff-cell--steal">
            <strong>+5 / +0</strong>
            <span>YOU EXPLOIT</span>
          </div>
          <div className="payoff-cell payoff-cell--bad">
            <strong>+1 / +1</strong>
            <span>MUTUAL DISTRUST</span>
          </div>
        </div>
      </section>

      <section className="roster-section page-shell">
        <div className="section-heading section-heading--row">
          <div>
            <h2>MEET THE STRATEGIES</h2>
          </div>
          <Link to="/strategies" className="text-link">
            VIEW ALL FIGHTERS →
          </Link>
        </div>
        <div className="home-roster">
          {strategies.slice(0, 5).map((strategy) => (
            <Link to={`/play?opponent=${strategy.id}`} key={strategy.id}>
              <StrategyAvatar strategy={strategy} size="medium" />
              <h3>{strategy.shortName}</h3>
              <p>{strategy.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="machine-tease page-shell">
        <div>
          <h2>LLMS JOIN THE ARENA LATER.</h2>
          <p>
            First, learn the classical strategies. Then GPT, Claude, Gemini,
            DeepSeek, Kimi, and Qwen enter the same tournament.
          </p>
        </div>
        <div className="machine-slots" aria-label="Future machine challengers">
          {["GPT", "CLD", "GMN", "DSK"].map((name) => (
            <span key={name}>
              <i>?</i>
              {name}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
