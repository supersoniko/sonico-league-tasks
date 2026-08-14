# sonico-league-tasks

Public site listing the next **80 easiest leftover Equilibrium League tasks** for player **Sonico**, ranked by how quick/easy they look with his current unlocked regions and levels.

## What it does

On each load (and via **Refresh**), the server:

1. Fetches live completion + levels from [WikiSync](https://sync.runescape.wiki/runescape/player/Sonico/LEAGUE_2)
2. Fetches the Equilibrium League task catalog from the [RuneScape Wiki](https://runescape.wiki/w/Equilibrium_League/Tasks?action=raw)
3. Keeps only incomplete tasks in unlocked regions: **Global, Misthalin, Havenhythe, Karamja, Kharidian Desert** (`desert`)
4. Drops tasks he cannot do yet (skill/combat gates, locked-region quests, known inaccessible content)
5. Infers required items and league-legal acquisition (Ironman, no GE; unlocked-region shops preferred — infinite stock)
6. Ranks by easiness/fastness **including item acquisition cost** and returns the top 80

Responses are cached for **60 seconds** (`CACHE_TTL_MS`) so Railway is not abusive to WikiSync/wiki.

No login or secrets required.

## Run locally

Requires Node.js 20+.

```bash
npm start
```

Open [http://localhost:8080](http://localhost:8080).

Optional:

```bash
PORT=3000 CACHE_TTL_MS=60000 npm start
```

Useful endpoints:

- `GET /` — UI
- `GET /api/tasks` — ranked JSON (cached)
- `GET /api/refresh` — force rebuild
- `GET /api/health` — health check

## Deploy on Railway

1. Push this repo to GitHub
2. In [Railway](https://railway.app), **New Project → Deploy from GitHub repo**
3. Railway will build with the included `Dockerfile` / `railway.toml`
4. No environment variables or secrets are required (optional: `PORT`, `CACHE_TTL_MS`)
5. Generate a public domain under the service settings

The app listens on `0.0.0.0:$PORT` (default `8080`).

## Notes

- Levels prefer WikiSync over hiscores (WikiSync is usually more current).
- Estimated league points are summed from completed task tiers in the wiki catalog.
- Ranking is heuristic (tier, short actions, grind penalties, **item acquisition in unlocked regions**). Live WikiSync always wins for completion filtering.
- Item paths prefer wiki shop locations with `leagueRegion` in unlocked areas; unknown paths are demoted rather than inventing shops.
