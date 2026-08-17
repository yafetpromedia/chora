# Contributing to CampusOne

Thank you for contributing to the CampusOne school platform.

---

## Before you start

1. Read [docs/README.md](./docs/README.md) for documentation index.
2. Read [docs/DEVELOPER-GUIDE.md](./docs/DEVELOPER-GUIDE.md) for local setup.
3. Never commit secrets (`.env`, `.env.local`, API keys).

---

## Development workflow

1. **Fork / branch** from `main` (or your team’s default branch).
2. **Install & run:**
   ```powershell
   npm install
   npm run dev:clean
   ```
3. **Make focused changes** — one feature or fix per PR when possible.
4. **Lint & test:**
   ```powershell
   npm run lint
   npm run test --workspace apps/api
   ```
5. **Update docs** if you add user-facing features (see below).

---

## Code guidelines

- **Match existing patterns** in the module you edit (NestJS modules, Next.js app routes, CSS files).
- **Multi-tenancy:** always scope school data by `schoolId` from JWT.
- **Permissions:** add keys to `permission-catalog.ts` when introducing new protected actions.
- **Prisma:** create migrations for schema changes; run `db:setup` locally to verify.
- **Minimal diffs** — avoid drive-by refactors.

---

## Documentation expectations

When shipping a feature, update as appropriate:

| Change type | Update |
|-------------|--------|
| New user-facing flow | [docs/USER-GUIDE.md](./docs/USER-GUIDE.md) or feature doc in `docs/` |
| New API routes | [docs/API-REFERENCE.md](./docs/API-REFERENCE.md) |
| Feature inventory | [docs/WHAT-WE-HAVE.md](./docs/WHAT-WE-HAVE.md) |
| Env vars | `apps/api/.env.example` or `apps/web/.env.example` |
| Setup changes | [README.md](./README.md) |

---

## Commit messages

Use clear, imperative subjects:

```
Add score correction approve endpoint
Fix attendance rate for partial roster
Document student portal results flow
```

---

## Pull requests

Include in the PR description:

- **What** changed and **why**
- **Test plan** — steps you ran locally
- Screenshots for UI changes (when helpful)

---

## Questions

- Architecture: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- Troubleshooting: [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
- Roadmap: [docs/PRODUCT-ROADMAP.md](./docs/PRODUCT-ROADMAP.md)
