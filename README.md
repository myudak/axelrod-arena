# Axelrod Arena

An interactive, game-like playground for the **Iterated Prisoner's Dilemma**.
Play against classic strategies, replay strategy-vs-strategy battles round by
round, and run seeded round-robin tournaments in the spirit of Robert Axelrod's
computer tournaments.

It is a static single-page app with no backend and no accounts. All simulation
runs in the browser, and tournaments run in a Web Worker.

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

## Project layout

```
src/
  App.tsx                 layout + routes
  routes/                 one file per page (home, play, battle, tournament, strategies)
  components/             shared UI (retro wrappers, avatars, header, 8bit/shadcn primitives)
  lib/game.ts             game engine: payoffs, strategies, seeded RNG, matches, tournaments
  workers/                tournament Web Worker
  styles/arena.css        design tokens + page styles
```

## The game engine

`src/lib/game.ts` is framework-free and deterministic for a given seed:

- classic payoffs **T=5, R=3, P=1, S=0**
- `simulateMatch(a, b, { rounds, seed, noise })`
- `runTournament({ strategyIds, rounds, repetitions, seed, noise })`, a round
  robin that includes self-play, like Axelrod's first tournament (200 moves,
  5 repetitions)
