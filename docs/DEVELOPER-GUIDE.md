# Developer Guide

Guide for engineers working on the CampusOne (`edu-os`) monorepo.

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 22 |
| npm | 10+ (workspaces) |
| PostgreSQL | 14+ (local or Docker) |
| Git | Any recent |

**OS:** Windows (primary), macOS/Linux supported. See [SETUP-WINDOWS.md](../SETUP-WINDOWS.md).

---

## Repository layout

```
CampusOne/
├── apps/
│   ├── api/                 NestJS REST API
│   │   ├── prisma/          Schema + migrations
│   │   └── src/             Feature modules
│   └── web/                 Next.js 16 App Router
│       └── src/
│           ├── app/         Routes (admin, teacher, parent, student, platform)
│           ├── components/  UI by domain
│           └── lib/         API clients, auth, helpers
├── packages/
│   ├── types/               Shared TypeScript types
│   ├── ui/                  Shared UI components
│   └── config/              Shared config
├── docs/                    Documentation (start at docs/README.md)
├── infra/                   Docker Compose (Postgres, Redis)
└── package.json             Root scripts
```

---

## First-time setup

```powershell
git clone https://github.com/yafetpromedia/campusone.git
cd campusone
npm install

copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local

# Edit apps/api/.env — DATABASE_URL, JWT secrets
cd apps\api
npm run db:setup

cd ..\..
npm run dev:clean
```

- **Web:** http://localhost:3000  
- **API:** http://localhost:3001/health  

---

## Daily development

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start web + API concurrently |
| `npm run dev:clean` | Free ports 3000/3001, clear Next cache, then dev |
| `npm run dev:web` | Web only |
| `npm run dev:api` | API only |
| `npm run lint` | Lint both apps |
| `npm run test --workspace apps/api` | Unit tests |
| `npm run test:e2e --workspace apps/api` | E2E tests (needs test DB) |
| `npm run health` | Ping API health endpoint |

---

## API ↔ Web communication

### Development proxy

In dev, the browser calls **`/backend/*`** on the web origin; Next.js rewrites to `http://127.0.0.1:3001/*` (see `apps/web/next.config.ts`). This avoids CORS and LAN hostname issues.

`getApiBaseUrl()` in `apps/web/src/lib/api.ts` returns `${window.location.origin}/backend` in local dev.

### Production

Set `NEXT_PUBLIC_API_BASE_URL` to your API URL (e.g. `https://api.yourschool.com`).

### Auth

- School tenants: JWT in `localStorage` after `/auth/login`
- Platform: separate login at `/platform/login`
- Guards: `SchoolTenantGuard`, `PlatformGuard`, `PermissionsGuard`

---

## Backend conventions (NestJS)

### Module structure

Each domain lives under `apps/api/src/<module>/`:

```
module/
├── module.ts
├── controller.ts
├── service.ts
└── dto/
```

### Multi-tenancy

All school data is scoped by `schoolId` from the JWT. Never query across tenants without platform guards.

### Permissions

Decorate routes with `@RequirePermissions('key')`. Catalog in `common/permissions/permission-catalog.ts`.

### Prisma

- Schema: `apps/api/prisma/schema.prisma`
- Migrations: `apps/api/prisma/migrations/`
- Client generation: `npm run prisma:generate --workspace apps/api`

**New migration:**

```powershell
cd apps\api
npm run prisma:migrate:dev -- --name describe_change
```

**Deploy (prod / CI):**

```powershell
npm run prisma:migrate:deploy --workspace apps/api
```

**Fallback sync:**

```powershell
npm run db:sync --workspace apps/api
```

---

## Frontend conventions (Next.js)

### Routing

App Router under `apps/web/src/app/`:

| Prefix | Role |
|--------|------|
| `/admin/*` | Admin + staff (RBAC-filtered nav) |
| `/teacher/*` | Teachers |
| `/parent/*` | Parents |
| `/student/*` | Students |
| `/platform/*` | CampusOne platform team |

### Components

Domain folders under `components/` — e.g. `results/`, `attendance/`, `dashboard/`.

### Styles

Feature CSS in `apps/web/src/styles/` (not Tailwind-first). Match existing patterns in the file you edit.

### API clients

Typed helpers in `apps/web/src/lib/` — e.g. `results.ts`, `attendance.ts`, `api.ts`.

### Auth session

After login, `persistAuthSession()` stores token + role. Role redirect via `getRolePath()` in `lib/auth.ts`.

---

## Testing

### API unit tests

```powershell
npm run test --workspace apps/api
```

### API E2E

Copy `apps/api/.env.test.example` → `.env.test`, create test database, then:

```powershell
npm run test:e2e --workspace apps/api
```

---

## Key architectural docs

| Topic | Doc |
|-------|-----|
| Tenant isolation | [TENANT-ARCHITECTURE.md](./TENANT-ARCHITECTURE.md) |
| Results pipeline | [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md) |
| Permissions | [PERMISSIONS.md](./PERMISSIONS.md) |
| Teacher scoping | [TEACHER-SCOPING.md](./TEACHER-SCOPING.md) |
| API endpoints | [API-REFERENCE.md](./API-REFERENCE.md) |

---

## Code style

- Match surrounding code — naming, imports, error handling
- Minimize diff scope; don’t refactor unrelated code
- Never commit `.env` or secrets
- Permission changes need catalog + migration if DB-backed

See [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel (web) + cloud API hosting, env vars, and CI gates.
