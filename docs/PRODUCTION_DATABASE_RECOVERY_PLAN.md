# Chora — Production Database Recovery Plan

**Branch:** `sync/production-hardening`  
**Mode:** Repository audit + disposable local validation only.  
**Production `chora_db` was not connected, modified, migrated, dumped, reset, or backed up by this work.**

**Do not execute recovery commands on production without explicit human approval.**  
**Do not merge, deploy, or restart services as part of this document.**

---

## Decision (read this first)

### Can existing `chora_db` reach the release schema through a tested, data-preserving recovery **without dropping or recreating the database**?

| Answer | Detail |
|--------|--------|
| **YES — conditional** | Use `prisma migrate resolve --rolled-back 20260530160000_subscriptions` then `prisma migrate deploy` on the **current** migration files. |
| **Hard precondition** | All seven application tables still have **zero rows** (re-confirm with read-only `COUNT(*)` immediately before execution). |
| **Why safe when empty** | Catch-up’s `DROP COLUMN "studentId"` / `ADD … studentProfileId TEXT NOT NULL` / `User.username TEXT NOT NULL` succeed only because there is no row data to rewrite. Repaired subscriptions SQL creates `Plan` + `Subscription` and does **not** insert `school-addis`. |
| **Why not a wipe** | Init / schools / invites objects and their `_prisma_migrations` rows are kept. The failed subscriptions attempt remains visible as a rolled-back history row. |
| **If any application row appears** | **STOP — procedure is unsafe.** Disposable probe with seeded rows: catch-up failed `23502` (`studentProfileId` nulls); release schema was **not** reached. A different, hand-designed data migration would be required. |

**Phase D / `resolve --applied` while the schema diff is non-empty: forbidden.** Proven on disposable replica: marking failed subscriptions `--applied` then `deploy` fails in catch-up (`42P01` relation `"Subscription" does not exist`).

**Release status:** Deployment remains blocked until this recovery is approved and executed on production (or an alternative you choose).

---

## 0. Production facts this plan targets

| Fact | Value |
|------|--------|
| Database | `chora_db` (untouched in this investigation) |
| Public relations | **8** = 7 empty application tables + `_prisma_migrations` |
| Enums present | `UserRole`, `AttendanceStatus` only (no `Plan`) |
| Application tables | `User`, `AttendanceRecord`, `ResultRecord`, `Announcement`, `AnnouncementRead`, `School`, `SchoolInvite` — **0 rows** |
| History shape | **Five** records: `init` rolled back once, `init` succeeded, `schools` succeeded, `invites` succeeded, `subscriptions` **failed** / incomplete |
| Failed cause | Old `INSERT … school-addis` → FK `23503` |
| After failure | No `Subscription` table / indexes; no `Plan` enum (txn rolled back) |
| Checksum | Stored failed subscriptions checksum ≠ current repaired file |
| Schema vs release | Diff **non-empty** (~118 models / ~60 enums target) |

Exact production timestamps/log text were not available in-repo; the disposable replica reproduces **structure and failure mode** (five rows, rolled-back init + failed subscriptions with old checksum, eight tables, zero app rows, no Plan/Subscription).

---

## 1. Prisma version used for validation

| Item | Value |
|------|--------|
| Prisma **CLI** | **6.19.3** (`npm exec --workspace apps/api -- prisma version`) |
| `@prisma/client` | **6.19.3** |
| Query / schema engine hash | `c2990dca591cba766e3b7ef5d9e8a84796e47ab7` (normal companion to 6.19.3; hash alone is not the CLI version) |
| Host | Local Windows disposable Postgres `127.0.0.1:8000` — **not** `chora_db` |

---

## 2. Disposable replica accuracy checklist

Validated database: `chora_migrate_prod_replica`

| Requirement | Result |
|-------------|--------|
| Eight tables including `_prisma_migrations` | **Pass** |
| Two enums (`UserRole`, `AttendanceStatus`) | **Pass** |
| Seven application tables, zero rows | **Pass** |
| Five history rows (rolled-back init + finished init/schools/invites + failed subscriptions) | **Pass** |
| Failed subscriptions checksum = historical SQL (with `school-addis`); ≠ current file | **Pass** |
| No `Plan` / `Subscription` after failure | **Pass** |

---

## 3. Prisma 6.19.3 checksum + command behavior (this state)

| Action | Observed on replica | Appropriate for prod eight-table state? |
|--------|---------------------|----------------------------------------|
| Stored failed checksum vs current file | Mismatch confirmed | Expected; do not hand-edit |
| `migrate status` | Exit 1; lists pending; mentions failed migration indirectly via incomplete apply set | Read-only diagnostic |
| `migrate deploy` (before resolve) | **P3009** — blocked | Not yet |
| Corrupt checksum on a **finished** migration | `status`/`deploy` still succeed after recovery; **no** checksum warning in CLI | Leave finished checksums alone |
| `migrate resolve --applied` on failed subscriptions (objects missing) | Marks applied, then `deploy` → catch-up **P3018** `Subscription` does not exist | **No — unsafe** |
| `migrate resolve --rolled-back` then `deploy` (empty tables) | Applies current subscriptions + catch-up + no-ops; diff empty; 119 tables / 60 enums; no demo rows | **Yes — when zero rows** |
| Second `migrate deploy` | “No pending migrations” | Expected |

**Checksum conclusion:** For Prisma **6.19.3**, a mismatch between a **finished** row’s stored checksum and the file on disk does **not** block `migrate deploy` / `migrate status`. The gate that matters here is **P3009** (failed / unfinished subscriptions). Clearing it with `--rolled-back` causes `deploy` to run the **current** file (checksum `ca23942b…`), not the historical `school-addis` SQL.

---

## 4. Data-preservation probe (counterfactual)

Disposable `chora_migrate_prod_replica_data`: same history/schema as production, but with sample rows in `School` / `User` / `AttendanceRecord` / etc.

| Result | Detail |
|--------|--------|
| `resolve --rolled-back` | Succeeded |
| `migrate deploy` | Failed in **catch-up** with `23502`: `studentProfileId` contains null values |
| Seed `User` after failure | Still present (`user_keep_still=1`) — partial apply stopped; release schema **not** reached |
| Verdict | Procedure is **not** data-preserving into the release schema if early-table rows exist |

Therefore “data-preserving” for current production means: **no application data exists to lose**, and empty-table ALTERs complete. It does **not** mean catch-up is safe on a populated early schema.

---

## 5. Exact recovery sequence (future conditional — production)

### Preconditions (all required)

1. Explicit written approval for database recovery on `chora_db`.
2. **Immediate pre-write gate** (§5.1) — all seven tables zero rows **and** `current_database() = 'chora_db'`. Do not rely on an earlier inspection.
3. Read-only confirm: failed migration is `20260530160000_subscriptions`; `Plan` / `Subscription` absent; schema diff non-empty.
4. Approved worktree SHA of `sync/production-hardening` (repaired subscriptions file, no `school-addis` INSERT).
5. Writers paused / maintenance window.
6. Backups: **not** created in this investigation; take any backup your policy requires **before** you approve writes (separate human step).

### 5.1 Immediate pre-write gate (READ-ONLY — run immediately before any write)

Must return `GATE_PASS`. If `GATE_FAIL_STOP` or any count ≠ 0 → **STOP**. Does not authorize writes by itself.

```sql
-- READ-ONLY. Target must be chora_db.
SELECT current_database() AS db_name;  -- must equal 'chora_db'

SELECT
  (SELECT count(*) FROM "User")              AS "User",
  (SELECT count(*) FROM "AttendanceRecord")  AS "AttendanceRecord",
  (SELECT count(*) FROM "ResultRecord")      AS "ResultRecord",
  (SELECT count(*) FROM "Announcement")      AS "Announcement",
  (SELECT count(*) FROM "AnnouncementRead")  AS "AnnouncementRead",
  (SELECT count(*) FROM "School")            AS "School",
  (SELECT count(*) FROM "SchoolInvite")      AS "SchoolInvite";

SELECT CASE
  WHEN current_database() = 'chora_db'
   AND (SELECT count(*) FROM "User") = 0
   AND (SELECT count(*) FROM "AttendanceRecord") = 0
   AND (SELECT count(*) FROM "ResultRecord") = 0
   AND (SELECT count(*) FROM "Announcement") = 0
   AND (SELECT count(*) FROM "AnnouncementRead") = 0
   AND (SELECT count(*) FROM "School") = 0
   AND (SELECT count(*) FROM "SchoolInvite") = 0
  THEN 'GATE_PASS'
  ELSE 'GATE_FAIL_STOP'
END AS gate;
```

Also confirm `DATABASE_URL` path/dbname is `chora_db` (not `edu_os`, not a disposable name) before exporting it into the shell that will run Prisma.

### Commands

```bash
# FUTURE CONDITIONAL — only after approval + GATE_PASS. Example paths/URL.
cd /path/to/approved/chora/apps/api
export DATABASE_URL='postgresql://…/chora_db?schema=public'
# assert: URL database name is exactly chora_db

# 1) FUTURE CONDITIONAL — bookkeeping only; does not create schema objects
npx prisma migrate resolve --rolled-back 20260530160000_subscriptions

# 2) FUTURE CONDITIONAL — applies ALL pending migrations (47 on replica: subscriptions + catch-up + 45 no-ops)
npx prisma migrate deploy
# expect every "Applying migration …" line to succeed; final: All migrations have been successfully applied.

# 3) READ-ONLY proof — direction matters:
#    --from-url     = the SAME database just migrated (chora_db)
#    --to-schema-datamodel = release prisma/schema.prisma
#    Pass = exit code 0 AND empty/no-op SQL ("This is an empty migration.")
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script --exit-code

npx prisma migrate status
# expect: Database schema is up to date!

# 4) READ-ONLY — second deploy must be a no-op
npx prisma migrate deploy
# expect: No pending migrations to apply.

# 5) READ-ONLY — no demo seed
# SELECT count(*) FROM "School" WHERE id = 'school-addis';  -- expect 0
```

### 5.2 Verified on disposable replica (see evidence log)

Full sanitized transcript: `docs/_evidence_prod_recovery_sequence.log` (Prisma CLI **6.19.3**, DB `chora_migrate_evidence`, **not** `chora_db`).

| Check | Result |
|-------|--------|
| Seven-table zero-row gate (replica analog) | `GATE_PASS` — all seven counts 0 |
| `resolve --rolled-back` | exit 0 — “Migration … marked as rolled back.” |
| `migrate deploy` pending sequence | **47/47** applied successfully (complete list in evidence log) |
| `migrate diff` direction | `--from-url` = replica DB; `--to-schema-datamodel prisma/schema.prisma`; **exit 0**; `-- This is an empty migration.` |
| `migrate status` | exit 0 — “Database schema is up to date!” |
| Second `migrate deploy` | exit 0 — “No pending migrations to apply.” |

### Why each step is safe (under zero-row precondition)

| Step | Effect | Safety rationale |
|------|--------|------------------|
| `resolve --rolled-back` | Sets `rolled_back_at` on failed subscriptions row; clears P3009 | Does not claim success; does not run SQL; preserves failure visibility |
| `migrate deploy` | Re-applies **current** subscriptions (no demo INSERT), then catch-up, then no-ops | Current file checksum stored on new successful row; empty tables allow NOT NULL / DROP COLUMN |
| `migrate diff --exit-code` | Compares live DB to `schema.prisma` | Read-only verification |
| History after | Two subscriptions rows: rolled-back (old checksum) + finished (current checksum); init rolled-back + finished retained | Failure not concealed |

### Stop conditions

- Any application `COUNT(*) > 0`
- Deploy error / “already exists” / unexpected P3018
- Diff exit ≠ 0 after deploy
- Do **not** then run `resolve --applied` to paper over failure

---

## 6. Command classification (investigation vs production)

### This investigation (already done / allowed)

| Command / action | Class |
|------------------|--------|
| Read repo migration files / docs | Read-only |
| `prisma version` on local workspace | Read-only |
| Create/drop disposable DBs `chora_migrate_*` on local Postgres | Local only |
| Disposable `migrate deploy` / `resolve` / `diff` / `status` | Local only |
| Update this document + push branch | Repo only |

### Production — do **not** run during investigation

| Command / action | Class |
|------------------|--------|
| Any connection to `chora_db` for writes | Forbidden now |
| `migrate resolve` / `migrate deploy` on `chora_db` | **Future conditional** (§5) |
| `migrate resolve --applied` on incomplete schema | **Forbidden** |
| `DROP SCHEMA` / `DROP DATABASE` / recreate | **Not required**; not recommended for this path |
| `migrate reset`, `db push`, `db-sync`, bootstrap, runtime-bootstrap | **Forbidden** for this recovery |
| `pg_dump` / backup creation | **Deferred** to your approval (not done here) |
| Merge PR / deploy app / restart services | **Out of scope** |

### Production — read-only diagnostics (when you choose to inspect)

```sql
-- READ-ONLY
SELECT migration_name, checksum, finished_at, rolled_back_at, left(logs, 200)
FROM _prisma_migrations ORDER BY started_at;

SELECT
  (SELECT count(*) FROM "User") AS users,
  (SELECT count(*) FROM "School") AS schools,
  (SELECT count(*) FROM "AttendanceRecord") AS attendance;
```

```bash
# READ-ONLY (still touches prod only if DATABASE_URL points at it — prefer a replica)
npx prisma migrate status
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script --exit-code
```

---

## 7. Clean-install vs eight-table path

| Test | Proves | Does not prove |
|------|--------|----------------|
| Empty DB + all 50 migrations | Chain can create a valid new install | Production’s failed history / eight-table state |
| Accurate five-row replica + recovery | **This** production starting state can be advanced without DROP DATABASE | Exact prod timestamps/log strings |

Both were validated. Only the eight-table path answers the decision question above.

---

## 8. Alternatives (if precondition fails or you reject continue-path)

| Alternative | When | Notes |
|-------------|------|--------|
| Hand-written data-preserving migration | Rows exist in early tables | Required; catch-up alone is insufficient (proven) |
| Controlled empty re-init (`DROP SCHEMA public CASCADE` + full deploy) | Leadership accepts destroying empty objects **and** history | Cleaner checksums; **not** needed for current empty continue-path; destroys history |
| New consolidated baseline | Policy rewrite of migration history | Unnecessary while continue-path works on empty DB |

---

## 9. Migration-chain notes (condensed)

- 50 folders: real `init` → `schools` → `invites` → repaired `subscriptions` → `schema_catchup` → 45 no-ops.
- No demo school/user INSERTs in current chain.
- Catch-up depends on `Subscription` existing; non-idempotent; empty-table-sensitive.

---

## 10. What this agent did / did not do

| Did | Did not |
|-----|---------|
| Verified Prisma **CLI 6.19.3** (not engine hash alone) | Connect to production `chora_db` |
| Built five-row / eight-table disposable replica | Create backups |
| Proved `--applied` unsafe; `--rolled-back`+`deploy` safe when empty | Drop/recreate production DB |
| Proved populated early tables block catch-up | Merge, deploy, restart |
| Updated this plan | Run §5 commands on production |

---

## 11. Related docs

- `docs/PRODUCTION_MIGRATION_AUDIT.md` — Phase D only when schema diff already empty  
- `docs/PRODUCTION_STARTUP_SAFETY.md` — no silent startup seeds  
- `docs/VPS_PRODUCTION_DEPLOYMENT.md` — code-only deploy
