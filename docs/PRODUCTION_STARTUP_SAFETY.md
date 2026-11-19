# Chora — Production Startup Safety

## Goal

Normal production API startup and ordinary read traffic must **not** silently create or mutate catalog/owner/role rows.

## What was removed from automatic startup

| Former behavior | Now |
|-----------------|-----|
| `PermissionsService.onModuleInit` seeded permission definitions, created missing school role templates for every school, and migrated legacy staff roles | Removed from startup. Available only via explicit bootstrap. |
| `PlanCatalogService.onModuleInit` / `findAll` → `ensureSeeded()` inserted default plans when empty | No startup hook. `findAll` / `findListed` / `getLimits` are **read-only** (in-memory defaults when DB empty). |
| `PlatformAuthService.onModuleInit` created a platform owner from env credentials | Removed from startup. Available only via explicit bootstrap. |

## What still runs on startup (safe)

| Hook | Behavior |
|------|----------|
| `PrismaService.onModuleInit` | `$connect()` only |
| `PlatformAccessService.onModuleInit` | Reads `platformSettings.rolePermissions` into memory cache — **no writes** |

## Authorized writes that remain (not startup)

These run only after normal application flows:

- `PermissionsService.ensureSchoolRoleTemplates(schoolId)` when creating/configuring a school or users (operator/admin actions).
- `SchoolTenantGuard` may set `subscription.isActive = false` when a trial/period has ended (authenticated school request).
- Platform/school CRUD, finance, academics, etc. after authenticated user actions.
- `PlanCatalogService.syncListedPricesFromDefaults()` only when an operator invokes that API/path deliberately (not on boot).

## Explicit opt-in bootstrap

Script: `apps/api/scripts/runtime-bootstrap.mjs`  
npm: `npm run runtime:bootstrap --workspace apps/api`

Requirements:

1. API must already be built (`dist/` present).
2. `CHORA_ALLOW_RUNTIME_BOOTSTRAP=1`
3. `DATABASE_URL` set to the **intended** target (never casually `chora_db`).

Actions performed when allowed:

1. Seed permission definition catalog (upsert keys; empty `update` preserves custom labels).
2. Ensure default role templates per school.
3. Migrate legacy `staffRole` → `roleTemplateId` where still null.
4. Seed `PlanCatalog` rows **only if the table is empty**.
5. Optionally create platform owner if `PLATFORM_OWNER_EMAIL` + `PLATFORM_OWNER_PASSWORD` are set and that email does not exist.

**Do not** put this script in systemd `ExecStart` / `ExecStartPre`.  
**Do not** run it against production as part of a routine code deploy.

## Tests

- `plan-catalog.startup-safety.spec.ts` — reads do not call `create`
- `permissions.startup-safety.spec.ts` — no `onModuleInit`; explicit bootstrap is separate
- `platform-auth.startup-safety.spec.ts` — no `onModuleInit`; env owner create is opt-in
- Web: `npm run test:api-url --workspace apps/web` — production URL never falls back to localhost

## Related docs

- `docs/VPS_PRODUCTION_DEPLOYMENT.md` — nginx, systemd, code-only deploy
- `docs/PRODUCTION_MIGRATION_AUDIT.md` — migration hazards for `chora_db`
