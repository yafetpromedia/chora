# Chora — Deployment Readiness

Branch target: `sync/production-hardening` (PR #1).  
**Do not merge or deploy without explicit human approval.**

Latest reviewed tip (update when re-verifying): see `git rev-parse origin/sync/production-hardening`.

## Verified locally (latest readiness / hardening pass)

| Check | Command | Result |
|-------|---------|--------|
| Web lint | `npm run lint --workspace apps/web` | Pass — **0 errors**, 52 warnings |
| API lint | `npm run lint --workspace apps/api` | Pass — **0 errors**, 0 warnings |
| API unit tests | `npm run test --workspace apps/api` | Pass — **22** suites, **87** tests |
| Web API URL tests | `npm run test:api-url --workspace apps/web` | Pass — **5** tests |
| Prisma generate | `npm run prisma:generate` | Pass (Prisma Client **6.19.3**) |
| Prisma validate | `npm run prisma:validate` | Pass |
| API build | `npm run build --workspace apps/api` | Pass (`prisma generate && nest build`) |
| Web build | `npm run build --workspace apps/web` | Pass (with `NEXT_PUBLIC_API_BASE_URL` set at build time) |

### Not run (unsafe without isolated DB)

- `npm run test:e2e --workspace apps/api` — requires `TEST_DATABASE_URL` pointing at a disposable DB (see `apps/api/.env.test.example`). Do **not** point at `chora_db` or a shared prod-like database.

## Production database

See `docs/PRODUCTION_MIGRATION_AUDIT.md` and `docs/PRODUCTION_STARTUP_SAFETY.md`.

**Hard rules (code-only deployment)**

- Never run migrations, `prisma db push`, `db-sync`, `db-bootstrap`, or `runtime-bootstrap` against production as part of a code-only deployment.
- Never `migrate deploy` `20260530170000_schema_catchup` onto an already-populated schema.
- Never restart `awuddigitals.service`.
- Do not deploy or merge without explicit approval.
- Use `migrate-existing-db.mjs` only after a disposable restore proves an **empty** schema diff (`--exit-code`); the script aborts on a non-empty diff.

## Safe production deploy procedure (code only)

Follow **`docs/VPS_PRODUCTION_DEPLOYMENT.md`** (ports 3001/3002, nginx `/backend`, systemd units, env vars).

Startup mutation rules: **`docs/PRODUCTION_STARTUP_SAFETY.md`**.

Summary:

1. Confirm PR #1 review complete and explicit deploy approval.
2. On `/var/www/chora-sync` (not `/var/www/chora`): pull `sync/production-hardening`, `npm ci`, set `NEXT_PUBLIC_API_BASE_URL` **before** web build, `prisma:generate` / `validate`, build API + web.
3. Restart **only** `chora-api` / `chora-web` after approval — never `awuddigitals`.
4. Smoke-check: `GET /health` on `:3001` and via `https://chora.awuddigitals.com/backend/health`.

## Rollback

- Keep the previous release SHA and previous `node_modules`/build artifacts available.
- Roll back by checking out the prior SHA and rebuilding/restarting Chora services only.
- Database rollback is out of scope for code-only deploys; never restore by wiping `chora_db`.
