# Chora — Deployment Readiness

Branch target: `sync/production-hardening` (PR #1).  
**Do not merge or deploy without explicit human approval.**

## Verified locally (this readiness pass)

| Check | Command | Result |
|-------|---------|--------|
| Web lint | `npm run lint --workspace apps/web` | Pass — **0 errors**, 52 warnings (`no-img-element`, `exhaustive-deps`, unused vars) |
| API lint | `npm run lint --workspace apps/api` | Pass — **0 errors**, 0 warnings |
| API unit tests | `npm run test --workspace apps/api` | Pass — **19** suites, **80** tests |
| API build | `npm run build --workspace apps/api` | Pass (`prisma generate && nest build`) |
| Web build | `npm run build --workspace apps/web` | Pass |

### Not run (unsafe without isolated DB)

- `npm run test:e2e --workspace apps/api` — requires `TEST_DATABASE_URL` pointing at a disposable DB (see `apps/api/.env.test.example`). Do **not** point at `chora_db` or a shared prod-like database.
- Any `prisma migrate deploy` / `db push` / `db-sync` / `db-bootstrap` against production.

## Production database

See `docs/PRODUCTION_MIGRATION_AUDIT.md`.

**Hard rules**

- Never run `db-sync.mjs` or `db-bootstrap.mjs` on production (they can fall back to `db push`).
- Never `migrate deploy` `20260530170000_schema_catchup` onto an already-populated schema.
- Use `migrate-existing-db.mjs` only after a disposable restore proves an **empty** schema diff (`--exit-code`); the script now aborts on a non-empty diff.

## Safe production deploy procedure (code only)

1. Confirm PR #1 review complete and migration plan approved.
2. On the VPS app worktree (example `/var/www/chora-sync`):

```bash
cd /var/www/chora-sync
git fetch origin
git checkout sync/production-hardening   # or the approved release SHA
git pull --ff-only
npm ci
npm run prisma:generate
npm run prisma:validate
npm run build --workspace apps/api
npm run build --workspace apps/web
```

3. Restart API/web processes only (PM2/systemd/docker). **Do not** run migrations in the restart script until the migration audit plan is executed on a restore rehearsal.
4. Smoke-check: `/health` on API, login page on web, one school-scoped authenticated request.

## Rollback

- Keep the previous release SHA and previous `node_modules`/build artifacts available.
- Roll back by checking out the prior SHA and rebuilding/restarting.
- Database rollback is out of scope for code-only deploys; never restore by wiping `chora_db`.
