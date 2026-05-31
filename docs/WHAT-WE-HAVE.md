# CampusOne — What We Have

Living reference for the `edu-os` monorepo: what exists today, where it lives, and what is planned next.

**Brand:** CampusOne  
**Folder:** `c:\xampp\htdocs\school\edu-os`  
**Stack:** Next.js 16 + NestJS + PostgreSQL (Prisma)

---

## What CampusOne is

A **multi-tenant school SaaS** aimed at Ethiopian private schools (K–12 first):

- One **PostgreSQL** database; schools isolated by `schoolId`
- **Platform layer** — CampusOne team manages all schools
- **School layer** — each school has admin, staff, teachers, parents, students

---

## Tech stack

| Layer | Technology |
|--------|------------|
| Frontend | Next.js 16 (App Router), React, feature CSS |
| Backend | NestJS, JWT, Prisma ORM |
| Database | PostgreSQL |
| Monorepo | `apps/web`, `apps/api`, `packages/*` |
| Local dev | Web `http://localhost:3000`, API `http://localhost:3001` |

---

## Project structure

```
edu-os/
├── apps/web/          → UI (pages & components)
├── apps/api/          → REST API + Prisma schema
├── docs/              → Architecture, permissions, roadmap
├── SETUP-WINDOWS.md   → Run on Windows / XAMPP
└── package.json       → npm run dev:clean
```

---

## Who logs in (two layers)

### Platform (CampusOne staff)

| Item | Value |
|------|--------|
| Login | `/platform/login` |
| Dashboard | `/platform` — list / create / suspend schools |
| Demo user | `platform@campusone.local` / `Passw0rd!` |

### School tenant

| Action | URL |
|--------|-----|
| Register new school | `/register` |
| Login | `/login` |
| Join with code / invite | `/join`, `/invite/[token]` |

| Portal role | Workspace | Who |
|-------------|-----------|-----|
| `admin` | `/admin` | School owner / full admin |
| `staff` | `/admin` (filtered nav) | Registrar, finance, academic office |
| `teacher` | `/teacher` | Homeroom & subject teachers |
| `parent` | `/parent` | Guardians |
| `student` | `/student` | Students |

**Demo school:** `admin@eduos.local` / `Passw0rd!`  
Also seeded: `teacher@`, `parent@`, `student@` (same password)

---

## Permissions (digital workplace)

Schools are not limited to one shared “Admin” login. Each person gets a **role template** and a list of **permission keys** in their JWT.

### Role templates (per school, in DB)

| Slug | Typical job |
|------|-------------|
| `school_admin` | Full access |
| `principal` | Dashboards + school-wide read |
| `academic_director` | Results, staff, analytics |
| `registrar` | Students, admissions, ID cards |
| `finance_officer` | Fees & payments |
| `homeroom_teacher` | Class attendance & comms |
| `subject_teacher` | Scores + attendance (assigned classes) |

### Example permission keys

`students.read`, `students.create`, `finance.manage`, `attendance.manage`, `results.approve`, `teachers.manage`, …

- Enforced on API via `PermissionsGuard`
- Sidebar filtered on web via `permissions[]` in localStorage (after login)

**UI:** `/admin/teachers` — add staff with a template; edit per-user permission grants  
**Details:** [PERMISSIONS.md](./PERMISSIONS.md) · [PRODUCT-ROADMAP.md](./PRODUCT-ROADMAP.md)

---

## Features by module

### Onboarding & setup

| Feature | Location |
|---------|----------|
| School registration | `/register` |
| Setup wizard (grades, attendance mode) | `/admin/setup` |
| School settings (profile, logo, invites, plan) | `/admin/settings` |
| Grades & sections (KG–12 presets) | API + setup |
| Invite links | Settings |

### Students

| Feature | Location |
|---------|----------|
| List, search, grade filter | `/admin/students` |
| Register / edit / remove | Drawers |
| CSV import | Toolbar |
| Fayeda verification (mock OTP `123456`) | Register drawer |
| Extra fields | FAN, FCN, photo, DOB, address |

### ID cards & scan attendance

| Feature | Location |
|---------|----------|
| Printable QR ID cards | `/admin/students/cards` |
| Student `cardCode` + backfill | API `/schools/student-cards` |
| QR payload | `CAMPUS1:{cardCode}` |
| Scan attendance (admin) | `/admin/attendance` → Scan QR |
| Scan attendance (teacher) | `/teacher/attendance` |
| Manual attendance | Card grid + bulk save |
| Camera scanner | `AttendanceScanner` component |

### Staff & teachers

| Feature | Location |
|---------|----------|
| Staff roster | `/admin/teachers` |
| Add staff (role template) | Drawer |
| Per-user permission editor | `/admin/teachers` |
| Teacher profile & assignments | `TeacherProfile`, `TeacherAssignment` |
| Homeroom assignment | On create |
| Teacher dashboard | `/teacher` — classes, pending attendance & results |
| **Scoped access** | Teachers only see assigned classes — see [TEACHER-SCOPING.md](./TEACHER-SCOPING.md) |

### Attendance (admin)

| Feature | Location |
|---------|----------|
| Overview & analytics | `/admin/attendance` |
| Mark manually | Mark tab |
| Scan QR | Scan tab |

### Results & academics (Academic Engine)

Full pipeline: **Academic Year → Terms → Subjects → Assessment Templates → Scores → Approval → Report Cards**.

| Feature | Location / API |
|---------|----------------|
| Academic years (create, set current) | `/admin/results/academic-years` |
| End-of-year promotion | `/admin/results/promotion` |
| School day dashboards (admin, teacher, parent) | `/admin`, `/teacher`, `/parent` |
| Subject + teacher assignment | `/admin/results/subjects` |
| Assessment templates (weighted components) | `/admin/results/templates` — see [ASSESSMENT-TEMPLATES.md](./ASSESSMENT-TEMPLATES.md) |
| Score matrix (admin) | `/admin/results` |
| Score matrix (teacher, scoped) | `/teacher/results` |
| Workflow: DRAFT → SUBMITTED → APPROVED → PUBLISHED | Score matrix + pending queue on `/admin/results` |
| Report card (JSON + HTML) | API; print via `/admin/results/print` |
| Report card content | Weighted averages, rank, attendance %, teacher/principal comments, logo |
| Parent/student visibility | Report cards only when all class subjects are **PUBLISHED** |

**Details:** [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md)

### Finance

| Feature | Status |
|---------|--------|
| Years, fee types, schedules, payments | API ✅ |
| Admin UI | `/admin/finance` ✅ |
| Parent due amounts | `/parent/fees` ✅ |
| Manual bank-transfer verification | Settings bank fields + finance approve/reject ✅ |
| Telebirr / Chapa live checkout | Roadmap — see [INTEGRATIONS.md](./INTEGRATIONS.md) |

### Announcements & platform

| Feature | Location |
|---------|----------|
| School announcements | `/admin/announcements` |
| Parent in-app notifications | API `/notifications` → `/parent` |
| Platform school management | `/platform` |
| Subscription plans | TRIAL, STARTER, PROFESSIONAL, ENTERPRISE |
| Upgrade | `/admin/upgrade` |

### Auth & security

- Email/password + optional Google sign-in
- JWT + refresh tokens
- `SchoolTenantGuard` — all school data scoped by `schoolId`
- Rate limiting, audit logging

### Marketing

- Landing page `/` with FAQ, preview, animations

---

## Database (Prisma models)

**Tenancy & access:** `School`, `User`, `Subscription`, `SchoolInvite`, `PermissionDefinition`, `RoleTemplate`, `RoleTemplatePermission`, `UserPermissionGrant`, `PlatformUser`

**Structure:** `Grade`, `Section`, `StudentProfile`, `StudentEnrollment`, `AcademicYear`, `AcademicTerm`, `Subject`, `ClassSubject`

**Academics & results:** `AssessmentTemplate`, `AssessmentTemplateComponent`, `AssessmentTemplateGrade`, `Assessment`, `StudentAssessmentScore`, `ClassSubjectTermSheet`, `StudentTermReport`, `GradingScale`, `GradingBand`, `ResultRecord` (legacy)

**People:** `TeacherProfile`, `TeacherAssignment`, `ParentStudent`

**Operations:** `AttendanceRecord`, `Announcement`, `ParentNotification`

**Finance:** `FeeType`, `FeeSchedule`, `StudentFee`, `FeeInstallment`, `Payment`, `PaymentAllocation`

---

## API modules

| Module | Purpose |
|--------|---------|
| `auth` | Login, register, join, refresh |
| `schools` | Profile, settings, invites, subscription |
| `grades` | Setup, grades, sections |
| `students` | CRUD, import, single card |
| `student-cards` | Bulk cards, backfill codes |
| `fayeda` | FAN verify (mock) |
| `teachers` | Staff CRUD, assignments, teacher dashboard |
| `permissions` | Templates, catalog, staff grants |
| `attendance` | Roster, bulk, scan, analytics |
| `results` | Academic years, terms, subjects, templates, score matrix, workflow, report cards |
| `finance` | Fees, payments, receipts |
| `announcements` | Posts |
| `notifications` | Parent inbox |
| `platform` | Cross-tenant admin |
| `dashboards` | Dashboard payloads |

---

## All web routes

**Public:** `/`, `/login`, `/register`, `/join`, `/invite/[token]`

**Platform:** `/platform/login`, `/platform`

**Admin:** `/admin`, `/admin/setup`, `/admin/students`, `/admin/students/cards`, `/admin/teachers`, `/admin/attendance`, `/admin/results`, `/admin/results/academic-years`, `/admin/results/promotion`, `/admin/results/subjects`, `/admin/results/templates`, `/admin/results/print`, `/admin/finance`, `/admin/announcements`, `/admin/settings`, `/admin/upgrade`

**Teacher:** `/teacher`, `/teacher/attendance`, `/teacher/results`

**Parent:** `/parent`, `/parent/fees`

**Student:** `/student`

---

## Web stylesheets

`landing.css`, `auth.css`, `dashboard.css`, `setup.css`, `students.css`, `attendance.css`, `results.css`, `settings.css`, `student-cards.css`, `teachers.css`

---

## Related docs

| File | Topic |
|------|--------|
| [SCHOOL-DAY-WORKFLOW.md](./SCHOOL-DAY-WORKFLOW.md) | Daily loop & connected modules |
| [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md) | Years, workflow, report cards |
| [ASSESSMENT-TEMPLATES.md](./ASSESSMENT-TEMPLATES.md) | Weighted grading per grade |
| [TEACHER-SCOPING.md](./TEACHER-SCOPING.md) | Assigned classes only |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Fayda, SMS, payments strategy |
| [TENANT-ARCHITECTURE.md](./TENANT-ARCHITECTURE.md) | Multi-tenant isolation |
| [PERMISSIONS.md](./PERMISSIONS.md) | Role templates & matrix |
| [PRODUCT-ROADMAP.md](./PRODUCT-ROADMAP.md) | Sprint priorities |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Deploy |
| [../SETUP-WINDOWS.md](../SETUP-WINDOWS.md) | Local setup |

---

## Solid today vs still growing

### Usable now

- Register school + setup wizard  
- Students (Fayeda mock, import, edit)  
- ID cards + QR scan attendance  
- Manual attendance + analytics  
- Role templates + filtered navigation + per-user permission grants  
- Staff management + teacher dashboard  
- **Teacher scoping** on attendance, results, grade pickers  
- **Academic engine:** years, subject assignment, templates, score matrix, approval workflow, HTML report cards  
- Settings, invites, finance UI (manual payment verification)  
- Platform school management  

### Next (polish & integrations)

- Report card **PDF** export (HTML print works today)  
- Subject-specific templates (e.g. Art / PE only)  
- ~~Academic year promotion~~ ✅ `/admin/results/promotion`  
- Admissions module UI  
- Timetable  
- Structured parent messaging (routed tickets)  
- Telebirr + Chapa live payments  
- Live Fayda API + SMS provider  
- Librarian / admissions officer roles  

---

## How to run locally

```powershell
cd C:\xampp\htdocs\school\edu-os
npm run dev:clean
```

After schema changes:

```powershell
npm run ports:free
cd apps\api
npx prisma generate
npx prisma db push
cd ..\..
npm run dev:clean
```

Log out and log in again after permission/schema updates.

---

## Suggested sprint order

1. ~~Teacher scoping~~ ✅  
2. ~~Results, templates, approval workflow, report cards (HTML)~~ ✅  
3. Academic year promotion + enrollment history  
4. Report card PDF + subject-specific templates  
5. Parent communication (routed tickets)  
6. Chapa + Telebirr online payments  

---

## One-line summary

CampusOne is a **multi-tenant school operating system** with tenants, students, Fayeda hook (mock), attendance (manual + QR), ID cards, finance (manual verify), and a full **academic results engine** (templates, teacher scoping, approval workflow, report cards) plus a **department-based permission workplace** — ready for a pilot school’s daily academics; next wins are **year promotion, PDF report cards, and payment gateways**.
