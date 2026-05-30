# Deployment and Pilot Runbook

## Environments

- `dev`: local Docker + npm workspaces
- `staging`: mirrors production config for migration dry-runs
- `production`: live tenant traffic

## CI/CD Gates

Pipeline in `.github/workflows/ci.yml` runs:
- lint
- API e2e tests
- web + api builds

## Suggested Hosting

- Web (`apps/web`): Vercel
- API (`apps/api`): AWS ECS/Fargate or GCP Cloud Run
- Data: managed PostgreSQL + managed Redis

## Legacy Migration (Pilot)

1. Set env vars on API runner:
   - `LEGACY_DB_HOST`
   - `LEGACY_DB_USER`
   - `LEGACY_DB_PASSWORD`
   - `LEGACY_DB_NAME`
   - `LEGACY_DB_PORT`
2. Run dry-run export:
   - `npm run migration:dry-run --workspace apps/api`
3. Validate generated JSON files in `apps/api/migration-output`
4. Load transformed data into staging PostgreSQL
5. Execute UAT with one pilot school
6. Repeat dry-run and diff before production cutover
