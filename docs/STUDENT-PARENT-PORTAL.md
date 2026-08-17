# Student & Parent Portal

Features and behavior for `/student/*` and `/parent/*` workspaces.

---

## Login

| Role | Username | Password |
|------|----------|----------|
| Student | Student ID (`STU-…`) or portal username | Set by school (temp password in Manage student → Profile) |
| Parent | Username from school | Set at join / invite |

Both use **school code** on `/login` first.

---

## Dashboards (modern layout)

### Student (`/student`)

- Hero with date, school name, class
- KPI cards: Attendance, Results average, Open tasks, News
- **Attendance** ring + status breakdown (present / absent / late / excused)
- **Subject scores** bar chart (averaged per subject, not per assessment)
- Recent attendance list, top subjects, learning resources, announcements sidebar

### Parent (`/parent`)

- Child selector bar (multi-child families)
- Hero with child name, class, today’s attendance
- KPI cards: Attendance rate, Results average, Fees due, Timetable
- Same chart pattern as student dashboard for selected child
- Alerts (fees, published results), announcements

**Note:** Attendance rate = present ÷ **enrolled** roster (unmarked = absent).

---

## Results (`/student/results`, `/parent/results`)

### Score matrix

- Organized by **subject** rows, assessment columns from templates
- **Published** subjects show official scores; in-progress subjects marked pending
- Term filter synced with school academic calendar

### Report a score

- Available on **published** cells only
- Opens dialog → describe issue → sends to subject teacher
- **My score reports** section below shows full history and status

See [SCORE-CORRECTIONS.md](./SCORE-CORRECTIONS.md).

### Parent privacy

Students can disable parent results access:

**Student → Profile → Results privacy → “Allow parents to see my results”**

When off, parent sees a privacy message instead of scores.

---

## Report card

| Portal | Path |
|--------|------|
| Student | `/student/report-card` |
| Parent | `/parent/report-card` |

Available when the school has **published all subjects** for the class/term. Includes weighted averages, attendance, comments, school logo, **authorized signature** (if configured in admin Settings).

Print-friendly views available.

---

## Attendance

| Portal | Path |
|--------|------|
| Student | `/student/attendance` |
| Parent | (via dashboard + child overview) |

Shows daily status history. Students can submit **permission requests** (absence excuses) where enabled.

---

## Fees

| Portal | Path |
|--------|------|
| Student | `/student/fees` |
| Parent | `/parent/fees` |

Outstanding balances, payment history, bank transfer instructions from school settings.

---

## eLibrary

| Portal | Path |
|--------|------|
| Student | `/student/library` |
| Student AI study | Integrated in library / AI widget |

Browse school-approved resources, favorites, reading progress.

---

## Classwork

| Portal | Path |
|--------|------|
| Student | `/student/classwork`, `/student/worksheets` |

View assignments, submit work, see grades when released.

---

## Campus ID

| Portal | Path |
|--------|------|
| Student | `/student/id-card` |

Digital CR80-style card with QR for attendance scanning. Printable.

---

## Profile

| Portal | Path |
|--------|------|
| Student | `/student/profile` |
| Parent | `/parent/profile` |

Change password, contact info; students control parent results privacy.

---

## Navigation

Side nav is role-specific (see `nav-config.ts`). Quick links were removed from dashboards in favor of KPI cards and main nav.

---

## API endpoints (common)

| Endpoint | Purpose |
|----------|---------|
| `GET /dashboards/me` | Role dashboard payload |
| `GET /results/student-subject-matrix` | Portal score matrix |
| `GET /results/score-corrections` | Report history |
| `POST /results/score-corrections` | Submit report |
| `GET /attendance/student/summary` | Attendance stats |
| `GET /announcements` | School news |

Full list: [API-REFERENCE.md](./API-REFERENCE.md).

---

## Related

- [USER-GUIDE.md](./USER-GUIDE.md)
- [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md)
- [SCORE-CORRECTIONS.md](./SCORE-CORRECTIONS.md)
