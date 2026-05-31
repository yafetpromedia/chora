# School OS Architecture (Phase 1)

## Modules

| Module | Scope |
|--------|--------|
| Auth & RBAC | JWT, portal roles, permission grants |
| Tenancy | All school data via `schoolId` |
| Students & setup | Grades, sections, import, Fayeda hook |
| Attendance | Manual, bulk, QR scan, analytics |
| Teachers | Profiles, assignments, scoped dashboards |
| **Academic engine** | Years, terms, subjects, templates, scores, workflow, report cards |
| Finance | Fees, schedules, manual payment verification |
| Announcements & notifications | School posts, parent inbox |
| Platform | Cross-tenant school management |

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
permissions/   announcements/ notifications/ platform/
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
