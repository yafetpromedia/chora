# Academic Engine (CampusOne)

Multi-tenant results workflow for private K–12 schools.

## Data model

```
School
 └── AcademicYear (isCurrent)
      └── AcademicTerm
           └── ClassSubject (grade + section + subject + teacher + template)
                └── Assessment (from template sync)
                     └── StudentAssessmentScore
                └── ClassSubjectTermSheet (workflow per term)
           └── StudentTermReport (comments per student/term)
```

### Workflow statuses

| Status | Who can edit scores |
|--------|---------------------|
| `DRAFT` | Assigned teacher, admin, staff |
| `SUBMITTED` | Locked — academic office reviews |
| `APPROVED` | Locked — ready to publish |
| `PUBLISHED` | Locked — visible on parent/student report cards |

Flow: **Teacher → Submit → Academic Director → Approve → Publish**

## API (`/results`)

| Endpoint | Role |
|----------|------|
| `GET/POST /academic-years` | Admin, staff |
| `POST /academic-years/:id/set-current` | Admin, staff |
| `GET /class-subjects/by-grade` | Admin, staff |
| `PATCH /class-subjects/:id` | Admin, staff (teacher, template) |
| `GET /workflow/pending` | Admin, staff |
| `POST /workflow/submit` | Teacher, admin, staff |
| `POST /workflow/approve` | Admin, staff |
| `POST /workflow/publish` | Admin, staff |
| `POST /workflow/reopen` | Admin, staff |
| `GET /score-matrix` | Includes `workflow` object |
| `GET /report-card` | Parents/students require all class subjects `PUBLISHED` |

## Admin UI

- `/admin/results` — score matrix, pending approvals, report preview
- `/admin/results/academic-years` — year calendar
- `/admin/results/subjects` — assign teachers per class
- `/admin/results/templates` — weighted assessment components

## Teacher UI

- `/teacher/results` — scoped classes only; submit sheets for approval

## Report cards

HTML via `GET /results/report-card/html` includes logo, weighted subject averages, attendance (daily records), teacher/principal comments, signature placeholders.

PDF export is a later sprint.

## Demo

After `npm run dev:clean`, use `teacher@eduos.local` / `admin@eduos.local` with password `Passw0rd!`.

### Quick test flow

1. **Admin** → Results → **Subject & teacher assignment** — assign teachers to class subjects.
2. **Admin** → Results → **Assessment templates** — confirm grade templates (seeded on demo school).
3. **Teacher** → Results — enter scores → **Submit for approval**.
4. **Admin** → Results — **Pending approvals** → Approve → Publish.
5. **Admin** → Preview report card → **Print / PDF** (browser print).

---

## Related docs

| Doc | Topic |
|-----|--------|
| [WHAT-WE-HAVE.md](./WHAT-WE-HAVE.md) | Full feature inventory |
| [ASSESSMENT-TEMPLATES.md](./ASSESSMENT-TEMPLATES.md) | Weighted components per grade |
| [TEACHER-SCOPING.md](./TEACHER-SCOPING.md) | Teacher-only classes |
| [PRODUCT-ROADMAP.md](./PRODUCT-ROADMAP.md) | What’s next |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Fayda, SMS, payments |
