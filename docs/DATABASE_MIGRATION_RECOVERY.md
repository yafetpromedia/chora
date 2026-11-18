# Chora — Database Migration Recovery

**Date:** 2026-11-18  
**Repository:** `github.com/yafetpromedia/chora`  
**Production database:** PostgreSQL `chora_db` (**not modified** by this work)

## Status summary (gates)

| Gate | Result |
|------|--------|
| Fresh `prisma migrate deploy` on empty PostgreSQL | **PASS** (`chora_migrate_fresh`, `chora_migrate_fresh2`) |
| Prisma schema diff empty after migrate | **PASS** (`-- This is an empty migration.`) |
| Production-upgrade simulation (disposable copy) | **PASS** (`edu_os` → `chora_migrate_prod_sim`; data preserved 5 schools / 1054 users) |
| API build | **PASS** |
| Prisma validate | **PASS** |
| No demo rows on fresh migrate | **PASS** (0 schools / users / profiles) |

## Migration architecture selected

1. Keep early migrations: `init` → `schools` → `invites` → `subscriptions`.
2. Convert `init` from UTF-16 LE → UTF-8 (same SQL text).
3. Remove demo `school-addis` INSERT from `subscriptions`.
4. Add **`20260530170000_schema_catchup`**: full remaining schema to match `prisma/schema.prisma` (from `prisma migrate diff`).
5. Convert all later historical migration folders into **no-ops** (folder names preserved for history stability).

## Root causes fixed

| Issue | Fix |
|-------|-----|
| Init migration UTF-16 → Prisma/Postgres reject | Converted to UTF-8 |
| Subscriptions INSERT `school-addis` FK fail | Removed demo INSERT |
| PlanCatalog MySQL SQL | Superseded by catch-up (folder kept as no-op) |
| Missing StudentProfile/Grade/PlatformUser/… CREATEs | Included in catch-up |
| Library / timetable dependency order | Superseded by catch-up no-ops |
| Demo bootstrapping on API start | Removed earlier (startup services) |

## Fresh-install procedure

```bash
createdb chora_app   # or equivalent
export DATABASE_URL='postgresql://USER:PASS@HOST:PORT/chora_app?schema=public'
cd apps/api
npx prisma migrate deploy
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
# Expect: "-- This is an empty migration."
npm run build
```

## Existing-database upgrade procedure (schema already present via db push)

Validated on disposable restore of local `edu_os` (stand-in for production-like state):

1. Backup production: `pg_dump -Fc chora_db > chora_db_pre_migrate.dump`
2. Restore dump to a disposable DB and validate there first.
3. If schema already matches `schema.prisma` (empty migrate diff) but catch-up is pending:

```bash
export DATABASE_URL='postgresql://…/DISPOSABLE_OR_PROD?schema=public'
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
# Must print empty migration
npx prisma migrate resolve --applied 20260530170000_schema_catchup
npx prisma migrate status   # "Database schema is up to date!"
```

4. Only after disposable validation succeeds, repeat the resolve step in a production maintenance window.

**Do not** run `migrate deploy` of catch-up against a DB that already has the full schema — CREATE statements will conflict. Use `migrate resolve --applied` when the diff is already empty.

If the disposable diff is **not** empty, apply the printed SQL carefully on the disposable DB first, re-diff until empty, then plan production.

## Backup / rollback

```bash
pg_dump -Fc -d chora_db -f chora_db_$(date +%Y%m%d_%H%M).dump
# Rollback = restore dump; do not attempt destructive down-migrations on production.
```

## Validation evidence (local disposable DBs on 127.0.0.1:8000)

| Database | Purpose | Outcome |
|----------|---------|---------|
| `chora_migrate_fresh` | Empty → migrate deploy | 50 migrations applied; empty schema diff; 0 demo rows |
| `chora_migrate_fresh2` | Repeatability | Same success |
| `chora_migrate_prod_sim` | Restore of `edu_os` | Empty schema diff before resolve; catch-up marked applied; 5 schools / 1054 users retained |

## Remaining limitations

- Production `chora_db` was **not** touched; operators must still run the upgrade procedure on a restore-tested backup of true production.
- Historical mid-chain SQL is no longer executable as written (intentionally no-op). Use catch-up + git history if you need the old statements.
- Local stand-in for prod-sim was `edu_os` (same machine), not a VPS `chora_db` dump. Prefer validating once more against an actual `chora_db` backup before production.

## Exact safe commands for next production stage

```bash
# 1) Backup
pg_dump -Fc -d chora_db -f chora_db_pre_migrate.dump

# 2) Restore to disposable and validate
createdb chora_db_sim
pg_restore -d chora_db_sim chora_db_pre_migrate.dump   # or psql -f for plain dumps
export DATABASE_URL='postgresql://…/chora_db_sim?schema=public'
cd apps/api
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
# Expect empty. Then:
npx prisma migrate resolve --applied 20260530170000_schema_catchup
npx prisma migrate status

# 3) Only after sim is green — production maintenance
# export DATABASE_URL=…chora_db…
# npx prisma migrate resolve --applied 20260530170000_schema_catchup
# npx prisma migrate status
```
