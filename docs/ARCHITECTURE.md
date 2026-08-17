# School OS Architecture (Phase 1)

## Modules

| Module | Scope |
|--------|--------|
| Auth & RBAC | JWT, portal roles, permission grants |
| Tenancy | All school data via `schoolId` |
| Students & setup | Grades, sections, import, Fayeda hook |
| Attendance | Manual, bulk, QR scan, analytics |
| Teachers | Profiles, assignments, scoped dashboards |
| **Academic engine** | Years, terms, subjects, templates, scores, workflow, report cards, score corrections |
| Finance | Fees, schedules, manual payment verification |
| eLibrary | Resources, upload, audience, favorites, reading progress |
| Announcements & notifications | School posts + bell on all portals; parent fee/attendance inbox |
| Platform | Cross-tenant schools, curriculum packages (v1), assessment templates |
| **Content & Curriculum Engine** (planned) | Platform repositories + inheritance + provisioning v2 — [CONTENT-CURRICULUM-ENGINE.md](./CONTENT-CURRICULUM-ENGINE.md) |

Deep dives:

- [TENANT-ARCHITECTURE.md](./TENANT-ARCHITECTURE.md)
- [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md)
- [TEACHER-SCOPING.md](./TEACHER-SCOPING.md)
- [PERMISSIONS.md](./PERMISSIONS.md)

## Academic data flow

```text
School
 └── AcademicYear (isCurrent)
      └── AcademicTerm
           └── ClassSubject (grade, section, subject, teacher, template)
                └── Assessment (synced from template)
                     └── StudentAssessmentScore
                └── ClassSubjectTermSheet (workflow status)
           └── StudentTermReport (comments)
```

## API layout (`apps/api/src`)

```
auth/          schools/       grades/        students/
teachers/      attendance/    results/       finance/
library/       permissions/   announcements/ notifications/
platform/      timetable/     dashboards/
```

`results/` contains academics, assessment templates, workflow, and report card generation.

## Web layout (`apps/web/src/app`)

```
admin/     teacher/     parent/     student/     platform/
```

Admin academics under `admin/results/` (years, subjects, templates, print).

## Runtime

- Frontend: Next.js (App Router)
- API: NestJS
- Data: PostgreSQL (Prisma); Redis planned for cache/sessions

## Deployment targets

- Web: Vercel
- API and data services: AWS/GCP

See [DEPLOYMENT.md](./DEPLOYMENT.md).
