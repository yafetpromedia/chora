# CampusOne API

NestJS REST API + Prisma (PostgreSQL).

## Run locally

```powershell
cd apps\api
npm run db:setup   # first time
npm run dev        # port 3001
```

From repo root: `npm run dev:clean` starts API + web together.

## Key modules

| Module | Base path | Purpose |
|--------|-----------|---------|
| `auth` | `/auth` | Login, register, JWT |
| `schools` | `/schools` | Tenant profile, settings |
| `students` | `/schools/students` | CRUD, import, portal |
| `results` | `/results` | Academics, templates, score matrix, workflow, **score corrections** |
| `library` | `/schools/library` | eLibrary hub & resources |
| `attendance` | `/schools/attendance` | Roster, scan, analytics |
| `announcements` | `/announcements` | Posts + read tracking |
| `platform` | `/platform` | Cross-tenant admin |

## Prisma

```powershell
npx prisma generate
npx prisma db push      # dev
npm run prisma:migrate:dev
```

Runtime uploads: `uploads/library/` (gitignored).

**Docs:** [../../docs/README.md](../../docs/README.md) · [../../docs/API-REFERENCE.md](../../docs/API-REFERENCE.md) · [../../docs/DEVELOPER-GUIDE.md](../../docs/DEVELOPER-GUIDE.md)
