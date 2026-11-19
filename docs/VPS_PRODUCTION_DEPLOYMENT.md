# Chora — VPS Production Deployment (code-only)

**Domain:** `https://chora.awuddigitals.com`  
**Branch for review:** `sync/production-hardening`  
**Do not merge or deploy without explicit human approval.**

Awud Digitals owns **port 3000** (`awuddigitals.service`). Never stop, restart, or reconfigure it for Chora.

## Port and proxy map

| Service | Bind | Public path |
|---------|------|-------------|
| Awud Digitals | `:3000` | (existing) |
| Chora API (NestJS) | `127.0.0.1:3001` | `https://chora.awuddigitals.com/backend/*` |
| Chora Web (Next.js) | `127.0.0.1:3002` | `https://chora.awuddigitals.com/*` |
| PostgreSQL | localhost only | **not** exposed publicly (`chora_db`) |

Nginx strips the `/backend/` prefix when proxying to NestJS (controllers keep paths like `/health`, `/auth/login`).

## Required environment variables

### Web build-time (`.env.production` or CI/systemd `Environment`)

```bash
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://chora.awuddigitals.com/backend
NEXT_PUBLIC_WEB_APP_URL=https://chora.awuddigitals.com
# optional
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
```

`NEXT_PUBLIC_*` values are baked in at **`next build`**. Changing them requires a rebuild.

### API runtime

```bash
NODE_ENV=production
PORT=3001
HOST=127.0.0.1
WEB_APP_URL=https://chora.awuddigitals.com
API_PUBLIC_URL=https://chora.awuddigitals.com/backend
DATABASE_URL=postgresql://USER:PASS@127.0.0.1:5432/chora_db?schema=public
JWT_SECRET=...
JWT_REFRESH_SECRET=...
# never set CHORA_ALLOW_RUNTIME_BOOTSTRAP in the systemd unit
```

CORS in production allows only `WEB_APP_URL` (plus same-origin requests with no `Origin` header).

## Nginx example

```nginx
# client body size for ID cards, product docs, library uploads
client_max_body_size 260m;

server {
  listen 443 ssl http2;
  server_name chora.awuddigitals.com;

  # ssl_certificate ...;
  # ssl_certificate_key ...;

  location /backend/ {
    proxy_pass http://127.0.0.1:3001/;   # trailing slashes strip /backend/
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
    client_max_body_size 260m;
  }

  location / {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Upload-size guidance: keep `client_max_body_size` ≥ Nest/Next limits used in-repo (`~260mb` for product docs / large library files). API JSON body limit remains `40mb` for data-URL school settings.

## Systemd examples

**Do not** put `prisma migrate`, `db:sync`, `db:bootstrap`, or `runtime:bootstrap` in `ExecStart` / `ExecStartPre`.

### `chora-api.service`

```ini
[Unit]
Description=Chora API
After=network.target postgresql.service
# Do not order against awuddigitals.service beyond network

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/chora-sync/apps/api
Environment=NODE_ENV=production
Environment=PORT=3001
Environment=HOST=127.0.0.1
Environment=WEB_APP_URL=https://chora.awuddigitals.com
Environment=API_PUBLIC_URL=https://chora.awuddigitals.com/backend
EnvironmentFile=-/etc/chora/api.env
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=5
# Never: prisma migrate / db-sync / runtime-bootstrap here

[Install]
WantedBy=multi-user.target
```

### `chora-web.service`

```ini
[Unit]
Description=Chora Web
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/chora-sync/apps/web
Environment=NODE_ENV=production
Environment=PORT=3002
Environment=HOSTNAME=127.0.0.1
EnvironmentFile=-/etc/chora/web.env
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3002
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Keep secrets in `/etc/chora/*.env` with mode `600`. Never commit them. Do not log `DATABASE_URL` or JWT secrets.

## Isolated checkout (not `/var/www/chora`)

Use the sync worktree (example `/var/www/chora-sync`). Do **not** modify the unrelated `/var/www/chora` checkout.

## Safe code-only deploy procedure

```bash
cd /var/www/chora-sync
git fetch origin
git rev-parse HEAD   # record for rollback
git checkout sync/production-hardening
git pull --ff-only
git rev-parse HEAD   # confirm expected SHA

npm ci

# Web: ensure NEXT_PUBLIC_API_BASE_URL is set in the environment BEFORE build
export NEXT_PUBLIC_API_BASE_URL=https://chora.awuddigitals.com/backend
export NEXT_PUBLIC_WEB_APP_URL=https://chora.awuddigitals.com

npm run prisma:generate
npm run prisma:validate
npm run build --workspace apps/api
npm run build --workspace apps/web

# ONLY after human approval:
# sudo systemctl restart chora-api chora-web
# NEVER: sudo systemctl restart awuddigitals
```

### Health checks (after approved restart)

```bash
curl -sS http://127.0.0.1:3001/health
curl -sS https://chora.awuddigitals.com/backend/health
curl -sSI https://chora.awuddigitals.com/ | head
journalctl -u chora-api -n 80 --no-pager
journalctl -u chora-web -n 80 --no-pager
```

Expect API JSON roughly: `{ "status": "ok", "service": "chora-api", ... }`.

## Rollback

```bash
cd /var/www/chora-sync
git checkout <previous-sha>
npm ci
# rebuild with the same NEXT_PUBLIC_* values used for that release
npm run build --workspace apps/api
npm run build --workspace apps/web
# sudo systemctl restart chora-api chora-web
```

Database rollback is out of scope for code-only deploys.

## Explicitly prohibited

- `prisma migrate deploy` / `migrate reset` / `migrate resolve` against production without a separate approved migration plan
- `prisma db push`
- `npm run db:sync` / `db:bootstrap` / `db:setup`
- `npm run runtime:bootstrap` against production without a separate written approval
- Modifying `/var/www/chora`
- Restarting `awuddigitals.service`
- Exposing PostgreSQL publicly
- Committing `.env` files or secrets

See also: `docs/PRODUCTION_STARTUP_SAFETY.md`, `docs/PRODUCTION_MIGRATION_AUDIT.md`, `docs/DEPLOYMENT_READINESS.md`.
