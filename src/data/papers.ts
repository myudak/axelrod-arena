/** Bibliography shared by strategy cards, the Research page, and the LLM Lab. */
export interface Paper {
  id: string;
  authors: string;
  year: number;
  title: string;
  venue: string;
  url?: string;
  /** One-sentence takeaway shown in the app. */
  finding: string;
  /** In-app route that lets the player reproduce the idea. */
  tryIt?: { href: string; label: string };
  topic: "tournaments" | "evolution" | "noise" | "zero-determinant" | "llm" | "tools";
}

export const papers: Paper[] = [
  {
    id: "axelrod1980a",
    authors: "Robert Axelrod",
    year: 1980,
    title: "Effective Choice in the Prisoner's Dilemma",
    venue: "Journal of Conflict Resolution 24(1), 3–25",
    url: "https://doi.org/10.1177/002200278002400101",
    finding:
      "14 entries plus RANDOM played a 200-move round robin, five times each. Anatol Rapoport's Tit for Tat, the shortest program, won. Tit for Two Tats was not entered, but it would have won.",
    tryIt: { href: "/tournament", label: "Re-run the first tournament" },
    topic: "tournaments",
  },
  {
    id: "axelrod1980b",
    authors: "Robert Axelrod",
    year: 1980,
    title: "More Effective Choice in the Prisoner's Dilemma",
    venue: "Journal of Conflict Resolution 24(3), 379–403",
    url: "https://doi.org/10.1177/002200278002400301",
    finding:
      "In the second tournament, 62 entrants knew the first round's results, and match length was random (continuation probability w = 0.99654). Tit for Tat won again. Its success rests on being nice, retaliatory, forgiving and clear.",
    tryIt: { href: "/tournament?preset=second", label: "Play with the shadow of the future" },
    topic: "tournaments",
  },
  {
    id: "axelrod-hamilton1981",
    authors: "Robert Axelrod & William D. Hamilton",
    year: 1981,
    title: "The Evolution of Cooperation",
    venue: "Science 211(4489), 1390–1396",
    url: "https://doi.org/10.1126/science.7466396",
    finding:
      "An ecological simulation lets successful strategies grow in share each generation. Exploiters feed on naive cooperators, then starve once those are gone, and reciprocators take over.",
    tryIt: { href: "/evolution", label: "Run the ecological simulation" },
    topic: "evolution",
  },
  {
    id: "axelrod1984",
    authors: "Robert Axelrod",
    year: 1984,
    title: "The Evolution of Cooperation",
    venue: "Basic Books",
    finding:
      "The book-length synthesis. Cooperation can emerge among egoists without central authority, provided the shadow of the future is long enough.",
    topic: "tournaments",
  },
  {
    id: "friedman1971",
    authors: "James W. Friedman",
    year: 1971,
    title: "A Non-cooperative Equilibrium for Supergames",
    venue: "Review of Economic Studies 38(1), 1–12",
    url: "https://doi.org/10.2307/2296617",
    finding:
      "The threat of permanent punishment (Grim Trigger) can sustain cooperation as an equilibrium of the repeated game.",
    topic: "tournaments",
  },
  {
    id: "boyd-lorberbaum1987",
    authors: "Robert Boyd & Jeffrey P. Lorberbaum",
    year: 1987,
    title: "No pure strategy is evolutionarily stable in the repeated Prisoner's Dilemma game",
    venue: "Nature 327, 58–59",
    url: "https://doi.org/10.1038/327058a0",
    finding:
      "Tit for Tat can be invaded by mixtures such as Tit for Two Tats and Suspicious Tit for Tat, so no pure strategy is ESS.",
    topic: "evolution",
  },
  {
    id: "nowak-sigmund1992",
    authors: "Martin A. Nowak & Karl Sigmund",
    year: 1992,
    title: "Tit for tat in heterogeneous populations",
    venue: "Nature 355, 250–253",
    url: "https://doi.org/10.1038/355250a0",
    finding:
      "With errors, evolution favours Generous Tit for Tat, which forgives a defection with probability min{1 − (T−R)/(R−S), (R−P)/(T−P)}. That is 1/3 for the 5/3/1/0 payoffs.",
    tryIt: { href: "/evolution?preset=noise", label: "Evolve under noise" },
    topic: "evolution",
  },
  {
    id: "nowak-sigmund1993",
    authors: "Martin A. Nowak & Karl Sigmund",
    year: 1993,
    title: "A strategy of win-stay, lose-shift that outperforms tit-for-tat in the Prisoner's Dilemma game",
    venue: "Nature 364, 56–58",
    url: "https://doi.org/10.1038/364056a0",
    finding:
      "Pavlov (win-stay, lose-shift) corrects occasional mistakes and exploits unconditional cooperators, and it outcompetes Tit for Tat in noisy evolutionary runs.",
    tryIt: { href: "/battle?a=pavlov&b=tit-for-tat&noise=0.05", label: "Pavlov vs TFT with noise" },
    topic: "evolution",
  },
  {
    id: "wu-axelrod1995",
    authors: "Jianzhong Wu & Robert Axelrod",
    year: 1995,
    title: "How to Cope with Noise in the Iterated Prisoner's Dilemma",
    venue: "Journal of Conflict Resolution 39(1), 183–189",
    url: "https://doi.org/10.1177/0022002795039001008",
    finding:
      "When moves are sometimes flipped by mistake, two TFTs fall into echoing retaliation. Adding generosity or contrition restores cooperation.",
    tryIt: { href: "/tournament?preset=noise", label: "Run a noisy tournament" },
    topic: "noise",
  },
  {
    id: "beaufils1996",
    authors: "Bruno Beaufils, Jean-Paul Delahaye & Philippe Mathieu",
    year: 1996,
    title: "Our Meeting with Gradual: A Good Strategy for the Iterated Prisoner's Dilemma",
    venue: "Artificial Life V, 202–209",
    finding:
      "Gradual punishes the n-th defection with n defections, then offers two cooperations to calm things down. It beat Tit for Tat in their tournaments.",
    topic: "tournaments",
  },
  {
    id: "press-dyson2012",
    authors: "William H. Press & Freeman J. Dyson",
    year: 2012,
    title:
      "Iterated Prisoner's Dilemma contains strategies that dominate any evolutionary opponent",
    venue: "PNAS 109(26), 10409–10413",
    url: "https://doi.org/10.1073/pnas.1206569109",
    finding:
      "Zero-determinant strategies can unilaterally fix a linear relation between both players' scores. Extortioners guarantee that their surplus is χ times yours.",
    tryIt: { href: "/play?opponent=extort-2", label: "Try not to be extorted" },
    topic: "zero-determinant",
  },
  {
    id: "stewart-plotkin2012",
    authors: "Alexander J. Stewart & Joshua B. Plotkin",
    year: 2012,
    title: "Extortion and cooperation in the Prisoner's Dilemma",
    venue: "PNAS 109(26), 10134–10135",
    url: "https://doi.org/10.1073/pnas.1208087109",
    finding:
      "Extort-2, the memory-one strategy (8/9, 1/2, 1/3, 0), wins every head-to-head matchup yet scores poorly in a round-robin tournament.",
    topic: "zero-determinant",
  },
  {
    id: "stewart-plotkin2013",
    authors: "Alexander J. Stewart & Joshua B. Plotkin",
    year: 2013,
    title: "From extortion to generosity, evolution in the Iterated Prisoner's Dilemma",
    venue: "PNAS 110(38), 15348–15353",
    url: "https://doi.org/10.1073/pnas.1306246110",
    finding:
      "In large evolving populations, generous zero-determinant strategies are robust and extortion is not.",
    topic: "zero-determinant",
  },
  {
    id: "knight2016",
    authors: "Vincent Knight et al.",
    year: 2016,
    title:
      "An Open Framework for the Reproducible Study of the Iterated Prisoner's Dilemma",
    venue: "Journal of Open Research Software 4(1), e35",
    url: "https://doi.org/10.5334/jors.125",
    finding:
      "The Axelrod Python library reproduces the classic tournaments with 200+ strategies and makes IPD research reproducible.",
    topic: "tools",
  },
  {
    id: "case2017",
    authors: "Nicky Case",
    year: 2017,
    title: "The Evolution of Trust",
    venue: "Interactive explainable (ncase.me)",
    url: "https://ncase.me/trust/",
    finding:
      "A playable introduction to repeated games that introduced the Detective (Copycat-probing) character used here.",
    topic: "tools",
  },
  {
    id: "akata2025",
    authors: "Elif Akata et al.",
    year: 2025,
    title: "Playing repeated games with large language models",
    venue: "Nature Human Behaviour (arXiv:2305.16867)",
    url: "https://doi.org/10.1038/s41562-025-02172-y",
    finding:
      "LLMs do well in self-interested games like the IPD but are unforgiving: GPT-4 defects forever after a single defection. Social chain-of-thought prompting improves coordination.",
    tryIt: { href: "/lab/llm", label: "Run an LLM in the arena" },
    topic: "llm",
  },
  {
    id: "fontana2025",
    authors: "Nicoló Fontana, Francesco Pierri & Luca Maria Aiello",
    year: 2025,
    title:
      "Nicer Than Humans: How Do Large Language Models Behave in the Prisoner's Dilemma?",
    venue: "Proc. ICWSM 19, 522–535 (arXiv:2406.13605)",
    url: "https://ojs.aaai.org/index.php/ICWSM/article/view/35829",
    finding:
      "Across 100-round games, Llama 2/3 and GPT-3.5 are more cooperative and forgiving than typical humans. Behaviour is profiled along niceness, forgiveness, retaliation, troublemaking and emulation.",
    tryIt: { href: "/lab/llm", label: "Profile a model" },
    topic: "llm",
  },
  {
    id: "payne2025",
    authors: "Kenneth Payne & Baptiste Alloui-Cros",
    year: 2025,
    title:
      "Strategic Intelligence in Large Language Models: Evidence from evolutionary Game Theory",
    venue: "arXiv:2507.02618",
    url: "https://arxiv.org/abs/2507.02618",
    finding:
      "In evolutionary IPD tournaments against canonical strategies, Gemini played ruthlessly, OpenAI models were highly cooperative, and Claude was the most forgiving reciprocator. The models' written rationales show them reasoning about the time horizon and the opponent.",
    tryIt: { href: "/lab/llm", label: "Enter a model in the tournament" },
    topic: "llm",
  },
];

export const paperMap = Object.fromEntries(papers.map((paper) => [paper.id, paper])) as Record<
  string,
  Paper
>;

/** Short in-text citation, e.g. "Nowak & Sigmund 1993" or "Knight et al. 2016". */
export function cite(id: string) {
  const paper = paperMap[id];
  if (!paper) return id;
  const surname = (name: string) => name.trim().split(" ").pop();
  const names = paper.authors.replace(/ et al\.?$/, "").split(/, | & /);
  const etAl = paper.authors.endsWith("et al.") || names.length > 2;
  const who = etAl
    ? `${surname(names[0])} et al.`
    : names.map(surname).join(" & ");
  return `${who} ${paper.year}`;
}
