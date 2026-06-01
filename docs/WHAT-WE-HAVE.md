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
| `student` | `/student` | Students — login with **Student ID** or portal email |

**Demo school:** `admin@eduos.local` / `Passw0rd!`  
Also seeded: `teacher@`, `parent@`, `student@` (same password)

**Student portal login:** Username is the school **Student ID** (`STU-xxxxxxxx`, stored on `User.externalRef`). Login accepts **Student ID or email**. On enroll, a synthetic email is created (`stu-{id}.{joinCode}@students.campusone.app`) and a **temporary password** is shown in **Manage student → Profile** until the student changes their password.

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
| Register / edit / remove | Register drawer + **Manage student** drawer (tabs: Contact, Profile, Parents, Class, ID card) |
| Auto Student ID | `STU-` + 8 random chars on create (override optional) |
| CSV import | Toolbar |
| Fayeda verification (mock OTP `123456`) | Register drawer |
| Extra fields | FAN, FCN, photo, DOB, address, gender |
| Portal credentials | Manage → Profile: username, temp password, reset password |
| Photo upload | Client resize/compress before API (10 MB body limit on API) |

### ID cards & scan attendance

| Feature | Location |
|---------|----------|
| **CR80 student ID** (ISO 7810) | Component `.sid` — front/back, watermark, barcode + QR on back |
| Preview in Manage student | **ID card** tab (same layout as print modal) |
| Print / PDF (single or bulk) | Manage → **Open full card · Print**, `/admin/students/cards`, `/print/student-id-cards` |
| Printable QR ID cards | `/admin/students/cards` |
| Student `cardCode` + backfill | API `/schools/student-cards` |
| QR payload | `CAMPUS1:{cardCode}` |
| Scan attendance (admin) | `/admin/attendance` → Scan QR |
| Scan attendance (teacher) | `/teacher/attendance` |
| Manual attendance | Card grid + bulk save |
| Camera scanner | `AttendanceScanner` component |

**Front card body:** photo + barcode (left); name/grade; 4×2 grid (Student ID, FAN, DOB, Age, Sex, Academic year, Address, Phone).  
**Styles:** `apps/web/src/styles/student-cards.css`

### Staff & teachers

| Feature | Location |
|---------|----------|
| Teachers roster | `/admin/teachers` |
| Office staff roster | `/admin/staff` (shared `PeopleDirectoryPanel`) |
| Add staff (role template) | Drawer |
| Per-user permission editor | Teachers / staff drawers |
| **Homeroom** (one class) | Any teacher — set grade/section on `/admin/teachers` (not tied to role name) |
| **Subject teaching** (other grades) | `/admin/subjects/assign` — assigns `ClassSubject.teacherId` per grade/subject |
| Teacher profile | `TeacherProfile.homeroomGradeId` + `TeacherAssignment` + class subjects |
| Teacher dashboard | `/teacher` — homeroom, teaching slots, pending attendance & results |
| **Scoped access** | Homeroom + assignments + subjects they teach — see [TEACHER-SCOPING.md](./TEACHER-SCOPING.md) |

**Example:** Homeroom for **Grade 11**, teaches **Math** in Grades **9** and **10** via Subject assignment.

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
| Subject catalog | `/admin/subjects` |
| Subject + teacher per class | `/admin/subjects/assign` |
| Legacy results subjects UI | `/admin/results/subjects` |
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
- **Students:** login with Student ID or portal email + password
- JWT + refresh tokens
- `SchoolTenantGuard` — all school data scoped by `schoolId`
- Rate limiting, audit logging
- API JSON body limit **10 MB** (student photos)

### Marketing

- Landing page `/` with FAQ, preview, animations

---

## Database (Prisma models)

**Tenancy & access:** `School`, `User`, `Subscription`, `SchoolInvite`, `PermissionDefinition`, `RoleTemplate`, `RoleTemplatePermission`, `UserPermissionGrant`, `PlatformUser`

**Structure:** `Grade`, `Section`, `StudentProfile`, `StudentEnrollment`, `AcademicYear`, `AcademicTerm`, `Subject`, `ClassSubject`

**Academics & results:** `AssessmentTemplate`, `AssessmentTemplateComponent`, `AssessmentTemplateGrade`, `Assessment`, `StudentAssessmentScore`, `ClassSubjectTermSheet`, `StudentTermReport`, `GradingScale`, `GradingBand`, `ResultRecord` (legacy)

**People:** `TeacherProfile` (`homeroomGradeId`, `homeroomSectionId`), `TeacherAssignment`, `StudentProfile` (`portalTempPassword`), `ParentStudent`

**Operations:** `AttendanceRecord`, `Announcement`, `ParentNotification`

**Finance:** `FeeType`, `FeeSchedule`, `StudentFee`, `FeeInstallment`, `Payment`, `PaymentAllocation`

---

## API modules

| Module | Purpose |
|--------|---------|
| `auth` | Login, register, join, refresh |
| `schools` | Profile, settings, invites, subscription |
| `grades` | Setup, grades, sections |
| `students` | CRUD, import, portal reset, `STU-*` IDs |
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

**Admin:** `/admin`, `/admin/setup`, `/admin/students`, `/admin/students/cards`, `/admin/teachers`, `/admin/staff`, `/admin/subjects`, `/admin/subjects/assign`, `/admin/attendance`, `/admin/results`, `/admin/results/academic-years`, `/admin/results/promotion`, `/admin/results/subjects`, `/admin/results/templates`, `/admin/results/print`, `/admin/finance`, `/admin/announcements`, `/admin/settings`, `/admin/upgrade`

**Print:** `/print/student-id-cards`

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
- Students (Fayeda mock, import, manage drawer, auto Student ID, portal login)  
- **CR80 ID cards** (print/PDF, manage preview, bulk) + QR scan attendance  
- Manual attendance + analytics  
- Role templates + filtered navigation + per-user permission grants  
- Teachers + staff directories; **homeroom + multi-grade subject teaching**  
- **Teacher scoping** (homeroom, assignments, class subjects)  
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

CampusOne is a **multi-tenant school operating system** with tenants, students (Fayeda mock, portal login by Student ID), **CR80 ID cards**, attendance (manual + QR), finance (manual verify), **homeroom + subject teacher** workflows, and a full **academic results engine** (templates, scoping, approval, report cards) plus a **department-based permission workplace** — ready for pilot daily use; next wins are **PDF report cards, timetable, and payment gateways**.
