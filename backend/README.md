# Local API

```bash
npm start
```

Default address:

```text
http://localhost:8787
```

If you deploy it online, point the mini-program `trial` and `release` environments in [config/env.js](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/config/env.js) at your HTTPS API domain.

## Environment variables

See [.env.example](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/.env.example).

- `NODE_ENV`: `development` or `production`
- `HOST`: default `0.0.0.0`
- `PORT`: default `8787`
- `ALLOW_ORIGIN`: default `*`
- `STORE_PATH`: JSON file path for persisted state
- `SEED_MODE`: `seed` or `empty`
- `AUTO_REFRESH_ENABLED`: whether to run scheduled nightly refresh
- `AUTO_REFRESH_HOUR`: daily refresh hour, default `0`
- `AUTO_REFRESH_MINUTE`: daily refresh minute, default `30`
- `SYNC_MODE`: `server` or `worker`
- `INTERNAL_SYNC_TOKEN`: shared secret for a local worker to pull watch tasks and push sync results

Recommended production startup:

```bash
NODE_ENV=production npm run start:prod
```

In production mode, the server defaults to an empty store instead of writing demo watches and demo properties on first boot.

This backend now supports:

- manual refresh through `POST /api/refresh`
- automatic Beike community resolution from watched `communityName + district`
- optional daily scheduled refresh when `AUTO_REFRESH_ENABLED=true`
- optional browser-session fallback for Beike when direct HTTP fetch is blocked by CAPTCHA

## Browser-session fallback

Beike currently blocks anonymous access to the real community listing page. To keep trying real-data refreshes without asking the user to paste a source URL, the backend can reuse a local logged-in Chrome session managed by `playwright-core`.

First-time setup:

```bash
npm install
npm run beike:login
```

That command opens local Chrome and lets you complete Beike login plus any CAPTCHA manually once. The browser profile is persisted under `backend/data/browser-session/beike` by default.

Relevant env vars:

- `BEIKE_BROWSER_ENABLED`: enable browser fallback
- `BEIKE_BROWSER_HEADLESS`: use headless browser for normal refreshes
- `BEIKE_BROWSER_SESSION_DIR`: persistent browser profile path
- `BEIKE_CHROME_PATH`: local Chrome executable path (`/Applications/Google Chrome.app/...` on macOS, `/usr/bin/google-chrome-stable` on Linux in common setups)

Normal refresh flow becomes:

1. resolve community page from `communityName + district`
2. convert the community page into the Beike `ershoufang/c.../` listing entry
3. scrape the listing page through the saved browser session

If the browser session loses login or hits CAPTCHA again, the watch stays in `error` state and the homepage remains empty instead of showing fake listings.

If you want to keep the service running on a server, use:

```bash
pm2 start ecosystem.config.cjs --env production
```

Deployment notes:

- [deploy/DEPLOYMENT.md](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/deploy/DEPLOYMENT.md)
- [deploy/nginx.house-watch.conf.example](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/deploy/nginx.house-watch.conf.example)

Endpoints:

- `GET /health`
- `GET /api/feed`
- `GET /api/districts`
- `POST /api/refresh`
- `GET /api/watchlist`
- `GET /api/communities?district=南山&q=招商`
- `POST /api/watchlist`
- `GET /api/watchlist/:id`
- `PUT /api/watchlist/:id`
- `DELETE /api/watchlist/:id`
- `GET /api/property/:id`

## Local worker mode

If Beike scraping is unstable on a cloud server, you can move the actual scraping onto a local always-on machine and keep the cloud API only for storage and mini-program traffic.

Cloud API setup:

```bash
SYNC_MODE=worker
INTERNAL_SYNC_TOKEN=replace-with-a-long-random-token
```

When `SYNC_MODE=worker`:

- `POST /api/refresh` only marks the current user's watches as `pending`
- creating or editing a watch also marks it as `pending`
- the cloud backend no longer tries to scrape Beike directly

Worker-only endpoints:

- `GET /api/internal/watchlist`
- `POST /api/internal/sync-results`

Both require header:

```text
X-Internal-Sync-Token: <INTERNAL_SYNC_TOKEN>
```

Run the local worker on your own Mac / PC after completing one local Beike login:

```bash
npm run beike:login
WORKER_API_BASE_URL=https://api.4567l.com \
INTERNAL_SYNC_TOKEN=replace-with-a-long-random-token \
BEIKE_BROWSER_HEADLESS=true \
npm run worker:sync
```

For a single test cycle:

```bash
WORKER_API_BASE_URL=https://api.4567l.com \
INTERNAL_SYNC_TOKEN=replace-with-a-long-random-token \
npm run worker:sync:once
```
