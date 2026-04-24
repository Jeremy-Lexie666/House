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

Recommended production startup:

```bash
NODE_ENV=production npm run start:prod
```

In production mode, the server defaults to an empty store instead of writing demo watches and demo properties on first boot.

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
