import { Link } from "react-router";
import { PageMeta } from "@/components/page-meta";
import { PixelIcon } from "@/components/pixel-icon";
import { PixelBadge, PixelPanel, ScreenTitle } from "@/components/retro";
import { type Paper, papers } from "@/data/papers";

const topics: { id: Paper["topic"]; title: string; intro: string }[] = [
  {
    id: "tournaments",
    title: "THE COMPUTER TOURNAMENTS",
    intro: "Where it started: game theorists mailed in programs, and the simplest one won. Twice.",
  },
  {
    id: "evolution",
    title: "EVOLUTION OF COOPERATION",
    intro: "What happens when successful strategies reproduce and unsuccessful ones die out.",
  },
  {
    id: "noise",
    title: "MISTAKES & NOISE",
    intro: "Real relationships have misunderstandings. Strategies that can't forgive a mistake fall apart.",
  },
  {
    id: "zero-determinant",
    title: "ZERO-DETERMINANT STRATEGIES",
    intro: "A 2012 shock: a memory-one player can unilaterally control the relationship between both scores.",
  },
  {
    id: "llm",
    title: "LANGUAGE MODELS IN THE ARENA",
    intro: "The newest players. LLMs can be profiled with the same behavioural lens used for humans and programs.",
  },
  {
    id: "tools",
    title: "TOOLS & EXPLAINERS",
    intro: "Reproducible research software and the explainable that inspired this arena's style.",
  },
];

const fidelity: { aspect: string; here: string; literature: string; match: "same" | "close" | "differs" }[] = [
  { aspect: "Payoffs", here: "T=5, R=3, P=1, S=0", literature: "Identical to Axelrod's tournaments", match: "same" },
  {
    aspect: "Tournament I format",
    here: "200 moves × 5 repetitions, round robin with self-play",
    literature: "Same format (Axelrod 1980a); the field was 14 submitted programs + RANDOM",
    match: "close",
  },
  {
    aspect: "Tournament II format",
    here: "Random length with w = 0.99654, lengths shared across pairings",
    literature: "Same w and shared lengths (Axelrod 1980b); the field was 62 programs + RANDOM",
    match: "close",
  },
  {
    aspect: "Ranking",
    here: "Average payoff per turn",
    literature: "Axelrod ranked by total score. Identical ordering for fixed lengths; per-turn normalises random lengths",
    match: "close",
  },
  {
    aspect: "Ecological simulation",
    here: "Discrete replicator dynamics on the tournament payoff matrix",
    literature: "Same proportional-fitness update (Axelrod & Hamilton 1981)",
    match: "same",
  },
  {
    aspect: "Generous TFT",
    here: "Forgives with probability 1/3",
    literature: "Optimal generosity for 5/3/1/0 (Nowak & Sigmund 1992)",
    match: "same",
  },
  {
    aspect: "Gradual",
    here: "n-th defection → n defections, then 2 cooperations",
    literature: "As in Beaufils et al. 1996 (some libraries count punishments differently)",
    match: "same",
  },
  {
    aspect: "Detective",
    here: "Probe C-D-C-C, then TFT or always-defect",
    literature: "From Nicky Case's explainable, not an Axelrod entry",
    match: "differs",
  },
  {
    aspect: "Human play",
    here: "Unknown horizon, ends randomly after round 8 (~8%/round)",
    literature: "Lab studies vary; a random end removes last-round backward induction",
    match: "close",
  },
  {
    aspect: "LLM Lab",
    here: "Prompt modelled on Akata / Fontana designs; single-letter answers",
    literature: "Inspired by, not a replication: models, temperatures and prompts differ",
    match: "differs",
  },
];

const directions = [
  {
    title: "Profile a model",
    body: "Run one LLM against the full classic roster in the LLM Lab and compare its niceness, forgiveness and retaliation profile with Fontana et al.'s Llama/GPT-3.5 results.",
    href: "/lab/llm",
  },
  {
    title: "Noise sensitivity curve",
    body: "Run the same field at 0%, 1%, 5% and 10% noise. At what error rate does Tit for Tat lose its crown, and to whom?",
    href: "/tournament?preset=noise",
  },
  {
    title: "Design an invader",
    body: "Build a memory-one strategy in the Lab and run the ecological simulation from a hostile start. Can it survive where TFT does?",
    href: "/lab",
  },
  {
    title: "Extortion vs generosity",
    body: "Pit Extort-2 against Generous TFT in Battle, then in Evolution. Head-to-head it never loses, so why does it go extinct?",
    href: "/battle?a=extort-2&b=generous-tit-for-tat",
  },
];

export default function ResearchPage() {
  return (
    <main className="app-shell">
      <PageMeta
        title="Research"
        description="The papers behind Axelrod Arena: Axelrod's tournaments, evolution of cooperation, noise, zero-determinant strategies and LLMs."
      />
      <ScreenTitle
        title="THE RESEARCH BEHIND THE ARENA"
        description="Every strategy, format and campaign lesson here comes from a paper. Read the finding, then reproduce it yourself."
      />

      <nav className="research-toc" aria-label="Topics">
        {topics.map((topic) => (
          <a key={topic.id} href={`#${topic.id}`}>
            {topic.title}
          </a>
        ))}
        <a href="#fidelity">HOW FAITHFUL IS THIS?</a>
      </nav>

      {topics.map((topic) => (
        <section key={topic.id} id={topic.id} className="research-section">
          <div className="section-heading">
            <h2>{topic.title}</h2>
            <p>{topic.intro}</p>
          </div>
          <div className="paper-grid">
            {papers
              .filter((paper) => paper.topic === topic.id)
              .map((paper) => (
                <PixelPanel key={paper.id} className="paper-card">
                  <div className="paper-card__meta">
                    <PixelBadge tone={paper.year >= 2020 ? "gold" : "neutral"}>{String(paper.year)}</PixelBadge>
                    <span>{paper.authors}</span>
                  </div>
                  <h3>
                    {paper.url ? (
                      <a href={paper.url} target="_blank" rel="noreferrer">
                        {paper.title}
                      </a>
                    ) : (
                      paper.title
                    )}
                  </h3>
                  <p className="paper-card__venue">{paper.venue}</p>
                  <p>{paper.finding}</p>
                  {paper.tryIt ? (
                    <Link className="text-link" to={paper.tryIt.href}>
                      {paper.tryIt.label.toUpperCase()} <PixelIcon name="arrowRight" size={10} />
                    </Link>
                  ) : null}
                </PixelPanel>
              ))}
          </div>
        </section>
      ))}

      <section id="fidelity" className="research-section">
        <div className="section-heading">
          <h2>HOW FAITHFUL IS THIS ARENA?</h2>
          <p>A game should be honest about its simplifications. Here is where the arena matches the literature and where it doesn&apos;t.</p>
        </div>
        <PixelPanel className="fidelity-panel">
          <table className="fidelity-table">
            <thead>
              <tr>
                <th scope="col">ASPECT</th>
                <th scope="col">IN THE ARENA</th>
                <th scope="col">IN THE LITERATURE</th>
                <th scope="col">MATCH</th>
              </tr>
            </thead>
            <tbody>
              {fidelity.map((row) => (
                <tr key={row.aspect}>
                  <th scope="row">{row.aspect}</th>
                  <td>{row.here}</td>
                  <td>{row.literature}</td>
                  <td>
                    <span className={`fidelity-tag fidelity-tag--${row.match}`}>
                      <PixelIcon name={row.match === "differs" ? "close" : "check"} size={10} />
                      {row.match.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </PixelPanel>
      </section>

      <section className="research-section">
        <div className="section-heading">
          <h2>EXPERIMENTS YOU CAN RUN</h2>
          <p>Starting points for your own investigation. Everything is seeded, so results are reproducible and shareable.</p>
        </div>
        <div className="paper-grid">
          {directions.map((item) => (
            <PixelPanel key={item.title} className="paper-card paper-card--direction">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <Link className="text-link" to={item.href}>
                OPEN <PixelIcon name="arrowRight" size={10} />
              </Link>
            </PixelPanel>
          ))}
        </div>
      </section>
    </main>
  );
}
