# Chora — Production Database Recovery Plan

**Branch:** `sync/production-hardening`  
**Mode:** Repository audit + disposable local validation only.  
**Production `chora_db` was not connected, modified, migrated, dumped, or reset by this work.**

**Do not execute this plan on production without explicit human approval.**  
**Do not merge PR #1 or restart services as part of writing this document.**

---

## 0. Established production facts (from operator investigation)

| Fact | Detail |
|------|--------|
| Database | `chora_db` |
| Application tables present | **7**, all **empty** (zero rows) |
| Plus | `_prisma_migrations` |
| Applied / history | `init` (rolled back once, then succeeded), `schools` succeeded, `invites` succeeded, `subscriptions` **failed** |
| Failed cause | Old SQL referenced nonexistent `school-addis` |
| Checksum | Stored subscriptions checksum ≠ current file checksum |
| Objects after failure | No `Subscription` table, no `Plan` enum remain |
| Gap | Live schema ≪ current release (`schema.prisma` ≈ **118** models / **60** enums) |

Implied early tables (from chain): `User`, `AttendanceRecord`, `ResultRecord`, `Announcement`, `AnnouncementRead`, `School`, `SchoolInvite`.

---

## 1. Complete migration-chain audit

### 1.1 Chronological inventory (50 folders)

| # | Migration | Role on current branch | Problems / notes |
|---|-----------|------------------------|------------------|
| 1 | `20260528113600_init` | Real | Creates `UserRole` (no `staff`), `AttendanceStatus` (no `excused`/`medical`), 5 core tables. UTF-8. No demo INSERT. |
| 2 | `20260530120000_schools` | Real | Creates `School`; adds `User.externalRef`. **No FK** from `User.schoolId` → `School` yet (catch-up later). |
| 3 | `20260530140000_invites` | Real | Creates `SchoolInvite`. FK to `School` added in catch-up, not here. |
| 4 | `20260530160000_subscriptions` | Real (repaired) | Creates `Plan` + `Subscription` + FK to `School`. **Demo `school-addis` INSERT removed.** Safe on empty DB. |
| 5 | `20260530170000_schema_catchup` | Real catch-up (~134 KB) | Brings schema to current Prisma. See §1.2. |
| 6–50 | All later folders | **No-ops** (241 B each) | Intentionally empty; names kept for history. Former ordering bugs (e.g. `library_audience` before `library`) neutralized. |

No migration on this branch inserts demo schools/users.

### 1.2 Catch-up hazards (`20260530170000_schema_catchup`)

| Issue | Detail |
|-------|--------|
| Non-idempotent | **0** `IF NOT EXISTS`; 57 `CREATE TYPE`, 110 `CREATE TABLE` — fails if objects already exist |
| Enum extensions | `ALTER TYPE "AttendanceStatus" ADD VALUE 'excused'/'medical'`; `UserRole` ADD `'staff'` — fails if already present |
| Destructive | `DROP COLUMN "AttendanceRecord"."studentId"`; rewrite `date` → `DATE`; drop/recreate attendance indexes |
| Depends on Subscription | `ALTER TABLE "Subscription" ADD COLUMN …` — **requires** subscriptions migration to have created the table |
| Empty-table NOT NULL | Adds `User.username TEXT NOT NULL` and `AttendanceRecord.studentProfileId TEXT NOT NULL` **without defaults** — OK only when tables have **0 rows**; fails if rows exist |
| No seed data | **0** `INSERT` statements |

### 1.3 Historical / ordering problems (superseded, still relevant to old checksums)

| Migration (historical) | Problem |
|------------------------|---------|
| Old `subscriptions` | `INSERT … school-addis` → FK failure when school missing (matches production failure) |
| Old `library_audience` before `library` | `ALTER TABLE "LibraryResource"` before table existed |
| Mid-chain vs catch-up | Folder names retained as no-ops; **checksums differ** from any DB that applied old SQL |

### 1.4 Schema vs chain

- Current `schema.prisma` is the target of catch-up + no-ops.
- **Disposable clean install** (`migrate deploy` on empty DB) + `migrate diff --exit-code` → **empty** (validated locally; see §2).
- Therefore the chain **can** create a release-complete database from scratch.

### 1.5 Consolidated baseline?

| Option | Verdict |
|--------|---------|
| New single baseline replacing 50 folders | **Not required** for empty prod. Chain already installs cleanly. Would force a one-shot history rewrite and complicate checksum storytelling. |
| Keep current chain | **Recommended.** Use either controlled empty re-init or continue-from-failed-subscriptions (both validated). |

---

## 2. Clean-install test plan (disposable only)

**Validated on this workstation** (local Postgres `127.0.0.1:8000`, **not** `chora_db`):

| Test | DB name | Result |
|------|---------|--------|
| Full `prisma migrate deploy` on empty DB | `chora_migrate_clean_install` | **PASS** — all 50 applied |
| `migrate diff --from-url … --to-schema-datamodel prisma/schema.prisma --exit-code` | same | **PASS** — empty migration (`DIFF_EXIT=0`) |
| Continue-from-failed-subscriptions sim | `chora_migrate_continue_sim` | **PASS** — `resolve --rolled-back` → `deploy` → empty diff |

### Repeatable commands (operator / CI disposable)

```bash
# Create empty disposable DB (example name). NEVER use chora_db here.
export DATABASE_URL='postgresql://USER:PASS@HOST:PORT/chora_migrate_clean_install?schema=public'
cd apps/api
npx prisma migrate deploy
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script --exit-code
# expect exit 0 and empty/no-op SQL
```

Do **not** commit machine-local helper scripts that embed credentials.

---

## 3. Determination: can production be reconciled safely?

**Yes — because all application tables are empty.**

| Strategy | Appropriate? | Notes |
|----------|--------------|-------|
| **A. Controlled empty re-initialization** (`DROP SCHEMA public CASCADE` → recreate → `migrate deploy`) | **Preferred when empty** | Cleanest checksums + history aligned to current files. Destroys only empty objects + migration bookkeeping. Requires explicit approval (this is a deliberate schema wipe of an empty DB). |
| **B. Continue history** (`migrate resolve --rolled-back 20260530160000_subscriptions` → `migrate deploy`) | **Also valid** (validated on sim) | Preserves applied rows for init/schools/invites; marks failed subscriptions rolled back; re-applies repaired subscriptions + catch-up + no-ops. Does **not** hide the failure (`rolled_back_at` retained). |
| C. `db push` / `db-sync` / catch-up `deploy` without Subscription | **Forbidden** | `db push` skips history; catch-up alone fails (`ALTER Subscription` with no table). |
| D. `migrate resolve --applied` on catch-up while schema incomplete | **Forbidden** | Conceals gap; app still missing ~100 tables. |
| E. New consolidated baseline only | **Unnecessary** now | Use A or B. |

**Recommended production choice:** **Strategy A** if leadership accepts wiping an empty public schema for a clean baseline; otherwise **Strategy B** to keep continuous `_prisma_migrations` narrative.

Neither strategy introduces demo schools/users. Post-schema, platform/catalog rows are created only via **explicit** `runtime-bootstrap` (separate approval; not part of code-only deploy).

---

## 4. Proposed production recovery sequences

### Preconditions (both)

1. Explicit written approval for **database schema recovery** (separate from code deploy approval).
2. Confirm still: **zero rows** in all seven application tables (read-only `COUNT(*)`).
3. Confirm failed migration name is exactly `20260530160000_subscriptions`.
4. App writers stopped or in maintenance (no concurrent migrate).
5. Working tree on VPS is the approved `sync/production-hardening` SHA with current migration files.
6. **No** `db-sync`, `db-bootstrap`, `db push`, `runtime-bootstrap` in this procedure unless separately approved afterward.

### Strategy A — Controlled empty re-initialization (preferred if empty)

**Effect:** Removes empty early tables + `_prisma_migrations`, then rebuilds full release schema with clean history matching current checksums.

```bash
# ON VPS — ONLY AFTER APPROVAL. Example; adjust role/socket.
# 1) Read-only confirm empty (operator):
# SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname='public';

# 2) Schema reset of EMPTY database (DESTROYS empty objects + migration history):
psql -d chora_db -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO PUBLIC;
SQL

# 3) Deploy full chain
cd /var/www/chora-sync/apps/api   # or approved worktree
export DATABASE_URL='postgresql://…/chora_db?schema=public'
npx prisma migrate deploy

# 4) Prove schema matches release
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script --exit-code
# must exit 0

npx prisma migrate status
# expect: Database schema is up to date!
```

**History handling:** Prior failed subscriptions attempt is not “edited away” in secret — it is replaced because the empty schema (and its bookkeeping table) were intentionally rebuilt under approval. Record the pre-reset investigation (failed migration name, checksum mismatch, empty counts) in the change ticket.

### Strategy B — Continue without schema drop

**Effect:** Keeps init/schools/invites objects; clears the failed gate; applies repaired subscriptions + catch-up + no-ops.

```bash
cd /var/www/chora-sync/apps/api
export DATABASE_URL='postgresql://…/chora_db?schema=public'

# 1) Clear P3009 without claiming the bad SQL succeeded
npx prisma migrate resolve --rolled-back 20260530160000_subscriptions

# 2) Apply subscriptions (current file: NO school-addis INSERT) + catch-up + no-ops
npx prisma migrate deploy

# 3) Prove empty diff + status
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script --exit-code

npx prisma migrate status
```

**Checksum note:** Applied rows for init/schools/invites may still show old checksums if files changed after apply (e.g. UTF-8 repair). That does **not** block `deploy` for already-finished migrations. Do **not** rewrite those checksums by hand. The subscriptions **re-apply** stores the **current** file checksum.

**If deploy fails mid-catch-up:** stop; do not `resolve --applied` on catch-up; restore from an approved backup/rehearsal path (out of scope of this doc’s agent run — operator responsibility).

### After either strategy (optional, separate approval)

- Code deploy / restart per `docs/VPS_PRODUCTION_DEPLOYMENT.md`.
- Catalog/owner bootstrap only via `CHORA_ALLOW_RUNTIME_BOOTSTRAP=1` + `runtime-bootstrap` if required — **never** automatic on startup.

---

## 5. Exact SQL / schema changes (not applied)

### Already present in repo (no further SQL edits required for recovery)

**Current `20260530160000_subscriptions/migration.sql` (safe form):**

```sql
CREATE TYPE "Plan" AS ENUM ('TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');
CREATE TABLE "Subscription" ( … );
-- FK to School
-- NO INSERT of school-addis
```

**Catch-up (excerpt of destructive / dependency-sensitive parts):**

```sql
ALTER TYPE "AttendanceStatus" ADD VALUE 'excused';
ALTER TYPE "AttendanceStatus" ADD VALUE 'medical';
ALTER TYPE "UserRole" ADD VALUE 'staff';
DROP INDEX "AttendanceRecord_schoolId_studentId_date_key";
DROP INDEX "AttendanceRecord_schoolId_studentId_idx";
ALTER TABLE "AttendanceRecord" DROP COLUMN "studentId", …;
ALTER TABLE "Subscription" ADD COLUMN "billingBundle" TEXT, …;
ALTER TABLE "User" ADD COLUMN "username" TEXT NOT NULL;  -- empty table only
-- + 110 CREATE TABLE, 57 CREATE TYPE, …
```

### Operator-executed SQL only under Strategy A

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO PUBLIC;
```

**Not recommended / not authored here:** hand-editing `_prisma_migrations.checksum`, deleting failed rows without `migrate resolve`, or inventing a new baseline migration for this empty-DB case.

---

## 6. Handling failed migration + checksum mismatch (no concealment)

| Action | Conceals history? | Use |
|--------|-------------------|-----|
| `migrate resolve --rolled-back 20260530160000_subscriptions` | **No** — records rollback | Strategy B |
| `migrate deploy` re-applies current subscriptions SQL | **No** — new successful apply with current checksum | Strategy B |
| `migrate resolve --applied` on failed subscriptions without creating objects | **Yes — forbidden** | Never |
| Hand-UPDATE checksum to match old broken SQL | **Yes — forbidden** | Never |
| Strategy A schema reset after documenting empty/failed state in ticket | Transparent ops reset of empty DB | Preferred when empty |

---

## 7. What this agent did / did not do

| Did | Did not |
|-----|---------|
| Audited all 50 migrations on `sync/production-hardening` | Connect to production |
| Validated clean install + continue-sim on disposable local DBs | Run migrate/push/sync/bootstrap on `chora_db` |
| Wrote this recovery plan | Drop production objects, create backups, merge, deploy, restart |

---

## 8. Related docs

- `docs/PRODUCTION_MIGRATION_AUDIT.md` — earlier static audit + catch-up dangers  
- `docs/PRODUCTION_STARTUP_SAFETY.md` — no silent startup seeds  
- `docs/VPS_PRODUCTION_DEPLOYMENT.md` — code-only deploy (no migrate in systemd)
