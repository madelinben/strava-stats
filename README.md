# Strava Stats

Public SPA dashboard for personal Strava stats and Liverpool Half Marathon plan compliance. Hosted on GitHub Pages.

**Security model:** the browser never talks to Strava. A once-daily GitHub Action syncs activities into a static `dashboard.json`. Credentials live only in local `.env` / GitHub Actions Secrets.

Live URL (after Pages is enabled): https://madelinben.github.io/strava-stats/

## Quick start (local)

```bash
cp .env.example .env
# Fill STRAVA_CLIENT_ID + STRAVA_CLIENT_SECRET from https://www.strava.com/settings/api
# Authorization Callback Domain: localhost
# Redirect URI used by the script: http://localhost:8787/callback

pnpm install
pnpm run auth          # opens OAuth; paste STRAVA_REFRESH_TOKEN into .env
pnpm run sync          # writes public/data/dashboard.json (gitignored)
pnpm run dev
```

Without Strava credentials, seed the UI from the sample snapshot:

```bash
pnpm run seed
pnpm run dev
```

## GitHub Pages + Secrets

1. Repo **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions** — add:
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `STRAVA_REFRESH_TOKEN` (from `pnpm run auth`)
   - `SECRETS_PAT` — fine-grained personal access token with **Secrets: Read and write** on this repo (Strava rotates refresh tokens; the sync job writes the new value back)
3. Push to `master` or run **Actions → Sync & Deploy Pages → Run workflow**.
4. Cron runs daily at 10:00 UTC (after Saturday 9am parkrun).

## Guardrails

| Layer | Behaviour |
| --- | --- |
| Credentials | Never in git, never `VITE_*`, never in the SPA bundle |
| Strava API | Only `scripts/sync.ts` in CI/local — max ~1 run/day |
| Rate limits | 429 → short backoff then abort (no retry storm) |
| TanStack Query | 24h client cache of static JSON; cron writes `version.json` so each deploy busts sessionStorage (no Pages revalidate API) |
| Prototype | `prototype/` is gitignored (local reference only) |

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm run auth` | One-time OAuth; print refresh token |
| `pnpm run sync` | Fetch Strava → reduce stats → `dashboard.json` + `version.json` (cache buster) |
| `pnpm run parkruns:update` | Refresh hardcoded UK/IE parkrun lat/lng list (free, no key) |
| `pnpm run dev` | Vite dev server |
| `pnpm run build` | Production build (`base: /strava-stats/`) |

## Training plan checks

Weekly compliance is deterministic (no AI): easy-run count, speed session detection, long-run km vs plan week target, rest-day count. Plan data lives in `src/data/trainingPlan.ts`.
