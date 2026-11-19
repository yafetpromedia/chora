# Chora — Production Database Recovery Plan

**Branch:** `sync/production-hardening`  
**Mode:** Repository audit + disposable local validation only.  
**Production `chora_db` was not connected, modified, migrated, dumped, or reset by this work.**

**Do not execute this plan on production without explicit human approval.**  
**Do not merge PR #1, deploy, restart services, create backups, or wipe schema as part of this document.**

**Release decision (current):** Deployment blocked — clean install validated; existing production database not release-compatible until the eight-table recovery below is approved and executed.

---

## 0. Established production facts (from operator investigation)

| Fact | Detail |
|------|--------|
| Database | `chora_db` |
| Application tables present | **7**, all **empty** (zero rows) |
| Plus | `_prisma_migrations` → **eight** public relations total |
| Applied / history | `init` (rolled back once, then succeeded), `schools` succeeded, `invites` succeeded, `subscriptions` **failed** |
| Failed cause | Old SQL `INSERT … school-addis` → FK `23503` |
| Checksum | Stored subscriptions checksum ≠ current file checksum |
| Objects after failure | No `Subscription` table, no `Plan` enum (txn rolled back) |
| Gap | Live schema ≪ current release (~118 models / ~60 enums) |
| Schema diff | **Non-empty** — Phase D / `resolve --applied` **must not** run |

Implied early tables: `User`, `AttendanceRecord`, `ResultRecord`, `Announcement`, `AnnouncementRead`, `School`, `SchoolInvite`.

---

## 1. What clean-install proves (and what it does not)

| Proven on disposable `chora_migrate_clean_install` | Not proven about production |
|----------------------------------------------------|-----------------------------|
| All 50 migrations apply on an **empty** database | That production already satisfies an empty schema diff |
| Resulting schema matches `schema.prisma` (`DIFF_EXIT=0`) | That Phase D history-only reconciliation is ready |
| Chain can create a valid **new** installation | That production history is complete |

Clean-install is necessary evidence that the files work together. It is **not** a license to run Phase D on the eight-table database.

---

## 2. Why Phase D / `resolve --applied` is blocked now

From `docs/PRODUCTION_MIGRATION_AUDIT.md`, Phase D requires: **schema diff empty**, then bookkeeping-only `resolve --applied`.

| Requirement | Production |
|-------------|------------|
| Empty Prisma schema diff | **Not satisfied** |
| All expected schema objects exist | **Not satisfied** (7 app tables only) |
| Failed migration resolved | **Not satisfied** |
| All migrations in history | **Not satisfied** |
| Application row counts | **0** (empty — enables a *different* path below) |

**Forbidden now:** `migrate resolve --applied` on catch-up or later folders while objects are missing. That would conceal the gap and leave the app without ~100 tables.

**Also out of scope for this agent / until Chora task completion:** Phase A backups, `DROP SCHEMA`, merges, deploys, restarts, any write to production.

---

## 3. Answers to the five recovery questions (tested)

Validated on disposable **`chora_migrate_prod_state`** engineered to match production:

1. Apply only `init` → `schools` → `invites`.
2. Temporarily deploy the **historical** subscriptions SQL (with `school-addis` INSERT) → fail `P3018` / FK `23503`.
3. Restore the **current** repaired subscriptions file (no INSERT).
4. Observe eight relations, zero rows, no `Plan` / `Subscription`, failed history row whose checksum = old SQL, ≠ current file.

| # | Question | Answer |
|---|----------|--------|
| **1** | Can the existing production schema be advanced with a carefully designed, data-preserving migration? | **Yes, using the existing chain — not a new one-off SQL file.** With **zero rows**, catch-up’s `DROP COLUMN` / `NOT NULL` alters do not destroy application data. After clearing P3009, `migrate deploy` applies repaired `subscriptions` → `schema_catchup` → 45 no-ops. No demo INSERTs. |
| **2** | Can the failed migration be resolved without rerunning **unsafe** historical migrations? | **Yes.** `migrate resolve --rolled-back 20260530160000_subscriptions` then `migrate deploy` re-executes the **current** file (creates `Plan` + `Subscription` only). The `school-addis` INSERT is **not** re-run. Old failed checksum remains on the rolled-back history row. |
| **3** | Can migration history be reconciled **after** schema reaches the expected state? | **On this path, schema and history advance together via `deploy`.** After success: diff empty, status “up to date”, 50 migrations represented. A *later* Phase D `resolve --applied` loop is **unnecessary**. Phase D remains the tool only for DBs whose schema **already** matches and need bookkeeping only — not this eight-table state. |
| **4** | Can the procedure be reproduced on a disposable DB matching current production? | **Yes — done.** `chora_migrate_prod_state`: `PROD_STATE_EXIT=0`, `DIFF_AFTER=0`, no demo rows, init/schools/invites history retained, subscriptions shows **two** rows (rolled back + successful). |
| **5** | Can future migrations use ordinary `prisma migrate deploy` safely? | **Yes.** Post-recovery: `migrate deploy` → “No pending migrations”; `migrate status` → up to date. New additive migrations can follow normal deploy thereafter. |

---

## 4. Prisma 6.19.3 checksum-mismatch behavior (uncertainty resolved)

| Scenario | Result on disposable DB |
|----------|-------------------------|
| Failed subscriptions checksum = old SQL; file on disk = repaired | Confirmed mismatch (`2e3bc51b…` vs `ca23942b…`) |
| Corrupt checksum on an **already-finished** migration (`init`), then `migrate status` / `migrate deploy` | **Does not fail** for checksum alone. **No** checksum warning observed in CLI output. Deploy still blocked only by **P3009** while the failed row exists. |
| After recovery, corrupt `init` checksum again, then `status` + `deploy` | Both **exit 0**; deploy reports no pending migrations. |

**Implication:** Do **not** hand-edit `_prisma_migrations.checksum`. Stale checksums on finished rows are **tolerated** by Prisma Migrate deploy/status in 6.19.3; they are not a reason to rewrite history. The failed-row / P3009 gate is what must be cleared via `--rolled-back` (not by forging checksums).

---

## 5. Migration-chain audit (condensed)

| # | Migration | Role | Notes |
|---|-----------|------|-------|
| 1 | `20260528113600_init` | Real | 5 core tables + enums. No demo INSERT. |
| 2 | `20260530120000_schools` | Real | `School` + `User.externalRef`. |
| 3 | `20260530140000_invites` | Real | `SchoolInvite`. |
| 4 | `20260530160000_subscriptions` | Real (**repaired**) | `Plan` + `Subscription`. **No** `school-addis` INSERT. |
| 5 | `20260530170000_schema_catchup` | Real (~134 KB) | Brings schema to release; needs `Subscription`; empty-table safe for NOT NULL / DROP COLUMN. |
| 6–50 | Later folders | No-ops | History placeholders. |

Catch-up hazards if **rows exist** or objects already present: non-idempotent `CREATE`, enum `ADD VALUE`, `DROP COLUMN "studentId"`. **Production currently has zero rows** — those hazards do not destroy data *today*; re-confirm counts before any production run.

No migration on this branch inserts demo schools/users.

**Consolidated baseline:** Not required. Eight-table continue-path works without rewriting the 50-folder chain.

---

## 6. Recommended production recovery sequence (eight-table state)

### Preconditions (explicit approval required)

1. Written approval for **database schema recovery** on `chora_db` (separate from code deploy).
2. Read-only confirm: still **zero rows** in all seven application tables.
3. Confirm failed migration name is `20260530160000_subscriptions` and `Plan` / `Subscription` are absent.
4. Confirm schema diff is **non-empty** (expected) — therefore **do not** run Phase D.
5. VPS worktree is the approved `sync/production-hardening` SHA (repaired subscriptions file present).
6. Writers paused / maintenance window.
7. **No** `db push`, `db-sync`, `db-bootstrap`, `runtime-bootstrap`, `migrate reset`, or schema drop in this procedure.
8. Backups: **not** created by this agent; follow your org policy when you choose to execute (deferred until you approve).

### Procedure — history-preserving continue (validated)

**Effect:** Keeps `init` / `schools` / `invites` objects and their history rows; marks failed subscriptions as rolled back; applies **current** subscriptions + catch-up + no-ops; leaves a visible rolled-back row (failure not concealed).

```bash
# ONLY AFTER APPROVAL — example; adjust paths/URL. NEVER use edu_os.
cd /path/to/approved/chora/apps/api
export DATABASE_URL='postgresql://…/chora_db?schema=public'

# 0) Re-prove empty row counts + failed name (read-only SELECT) — operator

# 1) Clear P3009 without claiming the bad SQL succeeded
npx prisma migrate resolve --rolled-back 20260530160000_subscriptions

# 2) Advance schema + history together (current files only)
npx prisma migrate deploy

# 3) Prove release schema
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script --exit-code
# must exit 0

npx prisma migrate status
# expect: Database schema is up to date!

# 4) Confirm no demo rows
# SELECT count(*) FROM "School" WHERE id='school-addis';  -- 0
```

**Expected history for subscriptions:** two rows — one `rolled_back_at` set / unfinished (old checksum), one finished successfully (current checksum).

**Stop immediately if:** deploy errors mid-catch-up; any “already exists”; unexpected row counts; diff ≠ 0 after deploy. Do **not** `resolve --applied` to paper over a partial failure.

### Explicitly rejected for this state

| Action | Why |
|--------|-----|
| Phase D / `resolve --applied` while diff non-empty | Conceals missing objects |
| `resolve --applied` on failed subscriptions without creating `Plan`/`Subscription` | Same |
| Hand-edit checksums | Conceals / forges history; unnecessary per §4 |
| `DROP SCHEMA public CASCADE` | Destroys migration history; not needed for empty eight-table recovery |
| Clean-install-only thinking | Ignores existing history and failed row |
| Demo / seed INSERTs in migrations or silent startup seeds | Forbidden; bootstrap is separate opt-in |

### After schema recovery (separate approvals)

- Code deploy / restart per `docs/VPS_PRODUCTION_DEPLOYMENT.md`.
- Catalog/owner only via explicit `runtime-bootstrap` if required — never automatic on startup.

---

## 7. Disposable reproduction (operators / CI)

Do **not** commit helper scripts that embed credentials. Pattern used in validation:

1. Create DB `chora_migrate_prod_state` on **local** Postgres only.
2. Hide migrations after `invites`; `migrate deploy` (3 applied).
3. Restore folders; temporarily write historical subscriptions SQL with `school-addis`; `migrate deploy` → expect fail.
4. Restore repaired subscriptions file.
5. Assert: 7 empty app tables + `_prisma_migrations`; no `Plan`/`Subscription`; P3009 on deploy; diff exit 2.
6. `migrate resolve --rolled-back 20260530160000_subscriptions` → `migrate deploy` → diff 0, status clean, no demo rows, second deploy no-op.
7. Drop disposable DB.

Clean-install rehearsal remains useful as a separate check (`chora_migrate_clean_install`) but does **not** replace step 1–6.

---

## 8. Exact SQL / schema changes (not applied to production)

**No new migration file is required** for the eight-table recovery.

Current subscriptions (safe form already in repo):

```sql
CREATE TYPE "Plan" AS ENUM ('TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');
CREATE TABLE "Subscription" ( … );
-- FK to School
-- NO INSERT of school-addis
```

Catch-up (dependency / empty-table sensitive excerpts):

```sql
ALTER TYPE "AttendanceStatus" ADD VALUE 'excused';
ALTER TYPE "AttendanceStatus" ADD VALUE 'medical';
ALTER TYPE "UserRole" ADD VALUE 'staff';
-- AttendanceRecord: drop studentId, rewrite date, add studentProfileId NOT NULL (empty table only)
ALTER TABLE "Subscription" ADD COLUMN …;
-- + CREATE TYPE / CREATE TABLE for remaining release models
```

Operator bookkeeping command (not schema DDL):

```bash
npx prisma migrate resolve --rolled-back 20260530160000_subscriptions
```

---

## 9. What this agent did / did not do

| Did | Did not |
|-----|---------|
| Audited 50 migrations | Connect to production / `chora_db` |
| Validated clean install on disposable DB | Create backups |
| Validated **eight-table prod-state** recovery on disposable DB | `DROP SCHEMA`, merge, deploy, restart |
| Measured Prisma 6.19.3 checksum mismatch behavior | Run Phase D / `resolve --applied` on incomplete schema |
| Updated this plan | Introduce demo seeds |

---

## 10. Related docs

- `docs/PRODUCTION_MIGRATION_AUDIT.md` — static audit; Phase D only when diff empty  
- `docs/PRODUCTION_STARTUP_SAFETY.md` — no silent startup seeds  
- `docs/VPS_PRODUCTION_DEPLOYMENT.md` — code-only deploy (no migrate in systemd)
