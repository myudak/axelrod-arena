# Axelrod Arena

An interactive, game-like playground for the **Iterated Prisoner's Dilemma**,
grounded in the research literature from Axelrod's tournaments to today's
LLM experiments.

It is a static single-page app with no backend and no accounts. All
simulation runs in the browser, and tournaments run in a Web Worker.

## Features

| Page | What you do |
| --- | --- |
| **Play** | Face any strategy with an unknown horizon; sound, combos, S–D grades |
| **Campaign** | 13 stages, each teaching one result from the literature; stars and unlocks |
| **Battle** | Replay strategy vs strategy with noise; predict-the-next-move mode |
| **Tournament** | Axelrod I / II / noisy formats, custom fields, champion picks, payoff heatmap |
| **Evolution** | Axelrod & Hamilton's ecological simulation (replicator dynamics) |
| **Strategies** | 13 classic strategies with rules, traits and paper citations |
| **Lab** | Design memory-one strategies, forecast their rank, share them by link |
| **LLM Lab** | Bring your own OpenRouter key; profile how a model plays |
| **Research** | The papers behind every feature, and how faithful the arena is |
| **Profile** | XP, levels, badges and lifetime stats (saved in this browser) |

## Stack

- [Vite](https://vite.dev) + React 19 + TypeScript
- [React Router](https://reactrouter.com) (SPA, `BrowserRouter`)
- Tailwind CSS v4 with the [8bitcn](https://8bitcn.com) retro components
- [Blobatar](https://github.com/blobatar) fighter portraits
- Vitest + Testing Library

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + component tests
npm run lint
npm run typecheck
npm run build      # outputs static files to dist/
npm run preview    # serve dist/ locally
```

Requires Node.js 22.12 or newer.

## Deploy

`npm run build` produces a fully static `dist/` folder that any static host can
serve. Client-side routes need an SPA fallback to `index.html`:

| Host | Setup |
| --- | --- |
| Netlify / Cloudflare Pages | `public/_redirects` is included |
| Vercel | `vercel.json` rewrite is included |
| GitHub Pages / S3 / nginx | serve `index.html` for unknown paths (or copy it to `404.html`) |

## LLM experiments

The **LLM Lab** (`/lab/llm`) calls OpenRouter directly from the browser with
the visitor's own key. The key is kept in memory unless they opt in to
remembering it, and it is sent only to `openrouter.ai`.

For reproducible runs that everyone can see without a key, use the offline
runner. It writes a JSON file that the LLM Lab lists under "Published runs":

```bash
OPENROUTER_API_KEY=sk-or-... npm run llm-arena -- \
  --model openai/gpt-4o-mini --rounds 20 \
  --opponents tit-for-tat,always-defect,detective --framing neutral
git add src/data/llm-runs/ && git commit -m "Add LLM run"
```

Options: `--temperature`, `--framing neutral|explicit`, `--reveal-length`,
`--opponents all`, `--out <dir>`.

## Project layout

```
src/
  App.tsx                 layout + routes
  routes/                 one file per page
  components/             shared UI (arena, charts, heatmap, avatars, 8bit/shadcn primitives)
  data/                   papers (bibliography), campaign stages, achievements, llm-runs/
  lib/game.ts             engine: payoffs, strategies, seeded RNG, matches, tournaments
  lib/evolution.ts        replicator dynamics
  lib/llm/                prompt, parser, OpenRouter client, match loop, behaviour metrics
  lib/{sound,progress,customs,settings,store}.ts   synth SFX, XP/badges, custom strategies, persistence
  workers/                tournament Web Worker
  styles/arena.css        design tokens + page styles
scripts/llm-arena.ts      offline LLM experiment runner
```

## The game engine

`src/lib/game.ts` is framework-free and deterministic for a given seed:

- classic payoffs **T=5, R=3, P=1, S=0**
- `simulateMatch(a, b, { rounds, seed, noise, continuation })`
- `runTournament({ strategyIds, customs, rounds, repetitions, seed, noise, continuation })`,
  a round robin with self-play, like Axelrod's first (200 moves × 5) and second
  (random length, w = 0.99654) tournaments
- `memoryOne(spec)` builds any memory-one strategy (TFT, GTFT, WSLS, Extort-2, ...)
- `payoffMatrix(result)` and `runEvolution(ids, matrix, generations)` for ecology

See `/research` in the app for which parameters match the papers and where
the arena simplifies.
