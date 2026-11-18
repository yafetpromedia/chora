# Chora — Database Migration Recovery

**Date:** 2026-11-18  
**Repository:** `github.com/yafetpromedia/chora`  
**Branch recorded at start:** `main` @ `69ec367`  
**Production database:** PostgreSQL `chora_db` (never modified by this work)

## Status summary

| Gate | Result |
|------|--------|
| Fresh `prisma migrate deploy` on empty PostgreSQL | **BLOCKED** (see below) |
| Production-upgrade simulation from backup | **Not completed** (blocked by same migration apply failure) |
| Prisma schema diff empty after migrate chain | **Not completed** |
| Protected migration files unchanged | **Verified** (checksums below) |
| Demo startup seeding removed | **Done** in application code |
| PlanCatalog MySQL migration rewritten for PostgreSQL | **Done** |

## Protected file checksums (SHA-256)

Do not modify these files without explicit owner approval.

| File | SHA-256 |
|------|---------|
| `apps/api/prisma/migrations/20260528113600_init/migration.sql` | `F11E6BCA4731C479FE288D664F8A6630E5975819BA75EA49D3B722AD0732B2B7` |
| `apps/api/prisma/migrations/20260530160000_subscriptions/migration.sql` | `A0C10642DD7A195641B229DBE41E606A96CE3C95A81B0DF45B29297EEE7BBFED` |

## Root causes discovered

1. **Protected init migration is UTF-16 LE (BOM `FF FE`).**  
   Prisma `migrate deploy` fails immediately with:  
   `error encoding message to server: string contains embedded null`  
   PostgreSQL/`psql` also reject the file as invalid UTF-8.  
   Because this file is protected, it was **not** converted.

2. **Protected subscriptions migration still inserts demo school `school-addis`.**  
   The INSERT requires a `School` row that is not created by any migration.  
   Handoff text said the INSERT was already removed; **current `main` still contains it**.  
   Because this file is protected, it was **not** edited.

3. **Historical chain is incomplete vs `schema.prisma`.**  
   ~41 models (including `StudentProfile`, `Grade`, `PlatformUser`, `PermissionDefinition`, academics/finance/platform tables) have no `CREATE TABLE` in migration history. Schema was largely grown via `prisma db push` while only additive feature migrations were committed.

4. **`20260531180000_plan_catalog` was MySQL-only** (backticks, inline ENUM, `DATETIME`, `JSON_ARRAY`, charset). Rewritten to PostgreSQL DDL (table only; app seeds catalog).

5. **Library / platform content ordering is inverted** (`library_audience` and `platform_content_full` reference `LibraryResource` / enums before `20260603120000_library` creates them). Not fully repaired yet because a working apply path requires fixing (1) first.

6. **Startup hooks created demo schools/users/finance/academics** and hardcoded platform credentials. Removed / gated (see application changes).

## Migration architecture selected (proposed; partially implemented)

### Recommended end-state (requires owner approval on protected files)

1. Convert `20260528113600_init/migration.sql` to UTF-8 (same SQL text, encoding only).  
2. Remove the `school-addis` `INSERT` from `20260530160000_subscriptions/migration.sql`.  
3. Add a **catch-up baseline** migration immediately after subscriptions that creates all missing enums/tables/FKs to match `schema.prisma` (generated via `prisma migrate diff`).  
4. Convert superseded mid-chain migrations that would re-create the same objects into no-ops **or** archive them with a documented `_prisma_migrations` reconciliation plan for existing databases.  
5. Keep legitimate additive migrations that only alter objects already present after the catch-up.

### Why not a blind repair of all 49 files

Repairing ordering + inventing 41 missing CREATEs by hand while preserving protected UTF-16/demo INSERT is not reproducible. A catch-up baseline after a fixable prefix is the safe architecture.

### Fresh-install procedure (after protected-file approval)

```bash
# Disposable DB only
createdb chora_migrate_fresh
export DATABASE_URL='postgresql://…/chora_migrate_fresh?schema=public'
cd apps/api
npx prisma migrate deploy
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
# Expect: empty diff
npm run build
```

### Existing-production upgrade procedure (outline; not executed)

1. Take a new backup of `chora_db` and restore-test it.  
2. Restore backup into a disposable DB (e.g. `chora_migrate_prod_sim`).  
3. Diff disposable DB → `schema.prisma`; apply only missing objects (catch-up SQL with `IF NOT EXISTS` where needed).  
4. Reconcile `_prisma_migrations` so history matches files **without** marking migrations applied unless their objects are verified present.  
5. Re-run schema diff until empty.  
6. Only then schedule a production maintenance window.

### Backup / rollback

- Always dump before migration: `pg_dump -Fc chora_db > chora_db_pre_migrate.dump`  
- Rollback = restore dump to a new database / swap connections; do not “down” incomplete Prisma history on production.

## Application / startup changes made

| Area | Change |
|------|--------|
| `SchoolsService.onModuleInit` | Removed demo school / grades / student seeding |
| `UsersService.onModuleInit` | Removed demo users (`@eduos.local` / `Passw0rd!`) |
| `PlatformAuthService.onModuleInit` | No hardcoded owner; optional `PLATFORM_OWNER_EMAIL` + `PLATFORM_OWNER_PASSWORD` |
| `AcademicsService` / `FinanceService` / `AssessmentTemplatesService` | Removed boot-time demo seeding |
| `PermissionsService` | Do not overwrite permission metadata; do not reset existing role-template permissions |

Preserved: plan catalog / curriculum / permission **catalog** idempotent init where appropriate.

## Validation results

### Tested

- Local PostgreSQL 18 on `127.0.0.1:8000` reachable.  
- `prisma migrate deploy` against empty `chora_migrate_fresh` **fails on `20260528113600_init`** (UTF-16).  
- Protected file SHA-256 checksums recorded and unchanged by this work.  
- Generated reference SQL: `apps/api/prisma/generated-baseline.sql` (from `prisma migrate diff --from-empty --to-schema-datamodel`). Treat as **artifact for future catch-up**, not an applied production migration.

### Not tested (blocked)

- Full fresh migrate chain success.  
- Empty Prisma migrate diff after deploy.  
- Production-backup upgrade simulation.  
- Repeatability of migrate deploy on a second empty database.

## Remaining limitations / required owner decisions

1. **Approve converting protected init migration from UTF-16 → UTF-8** (content unchanged; bytes change). Without this, migrate deploy cannot start.  
2. **Approve removing the `school-addis` INSERT** from protected subscriptions migration (or confirm a different copy already has it removed and sync that to git).  
3. After (1)+(2), implement and validate the catch-up baseline + no-op/archive strategy, then re-run the three gates (fresh / prod-sim / empty diff).

## Exact safe commands for next production stage (after gates pass)

```bash
# On bastion / ops machine — NOT run yet
pg_dump -Fc -d chora_db -f chora_db_$(date +%Y%m%d).dump
# Restore to disposable sim DB and validate migrate + diff there first.
# Only after empty diff on the sim DB:
#   - schedule maintenance
#   - apply the approved migration path
#   - verify app health checks
```

**Do not** run `prisma migrate deploy`, `db push`, or `migrate reset` against production until the three gates above are green.
