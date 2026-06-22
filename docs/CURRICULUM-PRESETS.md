# Curriculum packages & school provisioning (v1)

CampusOne ships **starter academic packages** so new schools are not empty on day one.

> **Strategic direction:** This module evolves into the full **[Content & Curriculum Engine](./CONTENT-CURRICULUM-ENGINE.md)** — platform repositories, inheritance, and provisioning v2. What follows documents **what runs today**.

## Flow

```text
Create school (register or Super Admin)
      ↓
Choose curriculum package
      ↓
SchoolProvisioningService copies tenant-owned copies:
  • Grades (from package grade preset)
  • Academic year + Semester 1 & 2
  • Subjects (primary/secondary filtered by school type)
  • Departments
  • Grading scale (A–F)
  • eLibrary starter resources
  • SMS / teacher templates
```

Each school gets **its own rows** — edits never affect other tenants.

## Packages (master catalog)

| Key | Label |
|-----|--------|
| `ETHIOPIAN_PRIVATE` | Ethiopian private school (default) |
| `CAMBRIDGE` | Cambridge / IGCSE |
| `AMERICAN` | American curriculum |
| `BLANK` | Empty — manual setup |

Definitions live in `apps/api/src/provisioning/curriculum-packages.data.ts` and sync to PostgreSQL on API start.

## Super Admin

**Platform → Curriculum** — view master package contents.

**Platform → Schools → New school** — pick package at creation.

`POST /platform/schools/:id/provision` — re-apply package (blocked if students enrolled).

## Public API

`GET /schools/curriculum-packages` — list packages for registration UI (no auth).

## v1 limitations (by design)

- Package content is defined in **code** (`curriculum-packages.data.ts`) and synced to DB — not edited in platform UI yet
- Subjects/library/templates are **copied**, not linked — no `sourceId` / `isCustomized` yet
- Platform eLibrary files are **not** shared across tenants; each school gets metadata-only starter rows
- Assessment templates are **not** selected per package at provision time (seeded separately)

See [CONTENT-CURRICULUM-ENGINE.md](./CONTENT-CURRICULUM-ENGINE.md) for the target architecture.

## Related

- [CONTENT-CURRICULUM-ENGINE.md](./CONTENT-CURRICULUM-ENGINE.md) — platform engine vision & sprint plan
- [ELIBRARY.md](./ELIBRARY.md) — school eLibrary after provisioning
- [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md) — results & grading
