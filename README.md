# Edu OS

Phase 1 monorepo for the School OS platform.

## Workspaces

- `apps/web`: Next.js web portal
- `apps/api`: NestJS API backend
- `packages/ui`: shared UI components
- `packages/types`: shared domain/auth types
- `infra`: local Docker services and environment templates
- `docs`: architecture and implementation docs

## Quick Start

1. Install dependencies:
   - `npm install`
2. Start local infrastructure:
   - `docker compose -f infra/docker-compose.yml up -d`
3. PostgreSQL (pgAdmin): create database `edu_os`, then set `apps/api/.env` — see [SETUP-POSTGRES.md](./SETUP-POSTGRES.md)
4. Initialize database schema:
   - `npm run prisma:generate --workspace apps/api`
   - `npm run prisma:push --workspace apps/api`
5. Run web + api:
   - `npm run dev`

## Demo Credentials

- `admin@eduos.local` / `Passw0rd!`
- `teacher@eduos.local` / `Passw0rd!`
- `student@eduos.local` / `Passw0rd!`
- `parent@eduos.local` / `Passw0rd!`

## Validation Commands

- `npm run lint`
- `npm run test:e2e --workspace apps/api`

## Prisma Migrations

- Create/apply dev migration: `npm run prisma:migrate:dev --workspace apps/api`
- Apply migrations in deploy: `npm run prisma:migrate:deploy --workspace apps/api`
- Reset local database: `npm run prisma:migrate:reset --workspace apps/api`
- Initial migration committed at `apps/api/prisma/migrations/20260528113600_init/migration.sql`
- Cross-platform bootstrap (generate + migrate deploy): `npm run db:bootstrap --workspace apps/api`
- Windows bootstrap (generate + migrate deploy): `npm run db:bootstrap:win --workspace apps/api`

## Isolated E2E Database

- Copy `apps/api/.env.test.example` and set `TEST_DATABASE_URL`
- Run isolated suite: `npm run test:e2e:isolated --workspace apps/api`
- The test global setup resets only the test database via Prisma before tests run
