# User Guide

How to use CampusOne day-to-day, by role. For technical setup, see the [main README](../README.md).

---

## Getting started

### School login (`/login`)

1. Enter your **school code** (e.g. `BRIGHT1`) → **Continue**.
2. Sign in with **username** + **password** (not email on the login form).
3. You are redirected to your workspace: Admin, Teacher, Parent, or Student.

**Students** can also sign in with their **Student ID** (`STU-…`) as username.

**Platform team** uses a separate login: `/platform/login`.

### Join an existing school

- **Join code:** `/join` — enter school code, then register.
- **Invite link:** `/invite/[token]` — from your school admin.

### Register a new school

`/register` — creates a new school tenant, runs setup wizard, provisions curriculum.

---

## Admin & staff (`/admin`)

### Setup (first week)

1. **Setup wizard** (`/admin/setup`) — grades, sections, attendance mode.
2. **Settings** (`/admin/settings`) — school name, logo, **school code**, bank details, **authorized signature** (for ID cards & report cards).
3. **Subjects & teachers** — `/admin/subjects`, `/admin/subjects/assign`.
4. **Assessment templates** — `/admin/results/templates` (weights must total 100%).
5. **Academic year & terms** — `/admin/academics` or `/admin/results/terms`.

### Daily operations

| Task | Where |
|------|--------|
| Mark attendance (manual or QR) | `/admin/attendance` |
| Enter / approve / publish scores | `/admin/results` |
| Manage students | `/admin/students` |
| Manage teachers & staff | `/admin/teachers`, `/admin/staff` |
| Fee schedules & payments | `/admin/finance` |
| Announcements | `/admin/announcements` |
| eLibrary | `/admin/library` |
| Timetable | `/admin/timetable` |
| Admissions | `/admin/admissions` |

### Results workflow

1. Teachers enter scores → **Submit for approval**.
2. Academic office **Approves** subject sheets.
3. Admin **Publishes** — scores become visible to students/parents.
4. **Report cards** — print when all subjects for a class are published.

Details: [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md).

### Score correction approvals

When a student or parent **reports** a wrong published mark:

1. Teacher receives notification → **Score reports** (`/teacher/results/score-reports`) → proposes corrected score.
2. Admin reviews → **Results → Approvals** tab → Approve or Reject.
3. Approved corrections update the published score.

Details: [SCORE-CORRECTIONS.md](./SCORE-CORRECTIONS.md).

### Staff roles

Not everyone needs full admin access. Assign **role templates** (Registrar, Finance Officer, Academic Director, etc.) on `/admin/teachers` or `/admin/staff`. See [PERMISSIONS.md](./PERMISSIONS.md).

---

## Teacher (`/teacher`)

### Dashboard

Overview of homeroom, today’s classes, pending attendance, and score entry progress.

### Attendance

- **Homeroom / assigned classes:** `/teacher/attendance`
- **QR scan:** Scan student ID cards for quick marking; duplicates show a warning (already marked present).

### Results

- **Score matrix:** `/teacher/results` — enter scores per class/subject.
- **Submit for approval** when the sheet is complete.
- **Score reports:** `/teacher/results/score-reports` — respond to family-reported score issues.

Teachers only see **classes they teach** (homeroom + assignments). See [TEACHER-SCOPING.md](./TEACHER-SCOPING.md).

### Other

| Feature | Path |
|---------|------|
| Classwork & worksheets | `/teacher/classwork` |
| Timetable | `/teacher/timetable` |
| eLibrary | `/teacher/library` |
| ID card | `/teacher/id-card` |
| Profile | `/teacher/profile` |

---

## Parent (`/parent`)

### Dashboard

Child overview: today’s attendance, published scores chart, recent attendance, top subjects, alerts, announcements.

Select child if you have multiple linked students.

### Results

- **Term scores:** `/parent/results` — subject matrix for selected child.
- **Report wrong mark:** Use **Report** under a published score cell.
- **My score reports:** History of submitted reports and status (with teacher / awaiting school / corrected / declined).

Blocked if the student turned off parent access in Profile.

### Other

| Feature | Path |
|---------|------|
| Fees | `/parent/fees` |
| Report card | `/parent/report-card` |
| Timetable | `/parent/timetable` |
| Exam schedules | `/parent/exams` |
| Profile | `/parent/profile` |

Details: [STUDENT-PARENT-PORTAL.md](./STUDENT-PARENT-PORTAL.md).

---

## Student (`/student`)

### Dashboard

Attendance rate, subject score chart, recent attendance, top subjects, announcements, learning resources.

### Results

- **My results:** `/student/results` — scores by subject; published vs in-progress subjects labeled.
- **Report issue:** **Report** on a published score → describe the problem.
- **My score reports:** Track status until the school finishes review.

### Other

| Feature | Path |
|---------|------|
| Attendance history | `/student/attendance` |
| Report card | `/student/report-card` |
| Classwork | `/student/classwork` |
| eLibrary + AI study | `/student/library` |
| Fees | `/student/fees` |
| Campus ID card | `/student/id-card` |
| Profile (privacy, password) | `/student/profile` |

Students can enable/disable **parent access to results** in Profile.

Details: [STUDENT-PARENT-PORTAL.md](./STUDENT-PARENT-PORTAL.md).

---

## Platform team (`/platform`)

CampusOne staff login at `/platform/login`.

| Task | Where |
|------|--------|
| Manage schools (create, suspend) | `/platform` |
| Curriculum packages | Platform → Curriculum |
| Assessment templates per school | Platform → Assessments |
| Billing & invoices | Platform → Billing |
| Support inbox | Platform → Support |
| Global settings | Platform → Settings |

---

## Notifications

- **Announcement bell** — all school portals; school-wide posts.
- **Parent alerts** — fee and attendance notifications (parent dashboard).
- **Score correction** — targeted announcements when reports are filed or decided.

---

## Printing

| Item | Path |
|------|------|
| Student ID cards (bulk) | `/admin/students/cards`, `/print/student-id-cards` |
| Teacher ID cards | `/admin/teachers/cards` |
| Report cards | `/admin/results/print`, `/student/report-card` |
| Certificates / transcript | Student academic record → print actions |

School **authorized signature** (Settings) appears on ID cards and report cards when configured.

---

## Getting help

- **Login issues:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Permissions:** ask your school admin to adjust role template on `/admin/teachers`
- **Support tickets:** `/admin/support` (school) or platform support inbox
