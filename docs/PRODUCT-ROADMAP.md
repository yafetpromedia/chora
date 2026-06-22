# CampusOne Product Roadmap

This document captures product priorities for CampusOne. **Do not restructure app folders** until a module forces it—focus on school workflows and feature completeness.

## Strategic question

**Will CampusOne support only K–12 private schools, or also universities and training centers later?**

| Decision | Implication |
|----------|-------------|
| **K–12 first (recommended now)** | Grades 1–12, sections, homeroom, terms, report cards, parent fees |
| **Multi-institution later** | Keep `AcademicYear`, `StudentEnrollment`, and `TeacherAssignment` as first-class; avoid overwriting historical grade/section on the student row |

Current schema direction: **schools-first**, with enrollment history so promotion year-over-year does not erase data.

---

## Digital school workplace

CampusOne is not one shared “Admin” login. Each department gets a **role template** (Registrar, Finance, Academic director, Principal, Teacher) with only the permissions they need. Templates live in the database; assign custom permission grants per user without deploying code.

See [PERMISSIONS.md](./PERMISSIONS.md).

---

## Priority 1: Roles & Permissions ✅

### Platform roles

| Role | Purpose |
|------|---------|
| `OWNER` | Full platform access |
| `SUPPORT` | View/help schools, limited writes |
| `SALES` | Onboard schools, trials, no destructive ops |

### School portal roles (`User.role`)

Still drives **which app shell** you get: `admin`, `teacher`, `parent`, `student`.

### School staff roles (`User.staffRole`)

Granular permissions inside the school:

| Staff role | Typical access |
|------------|----------------|
| `SCHOOL_ADMIN` | Everything in the school |
| `VICE_PRINCIPAL` | Results, report cards, attendance analytics—not billing or school delete |
| `FINANCE_OFFICER` | Fees, payments, receipts—not grades or teachers |
| `HOMEROOM_TEACHER` | Class attendance, parent comms, class performance |
| `SUBJECT_TEACHER` | Scores and attendance for **assigned** classes only |

Implementation: `apps/api/src/common/permissions/` + `PermissionsGuard` + JWT `permissions[]`.

See [PERMISSIONS.md](./PERMISSIONS.md) for the full matrix.

---

## Priority 2: Teacher management ✅

```
Teacher (User)
 ├── staffRole
 ├── subjects (via TeacherAssignment + ClassSubject.teacherId)
 ├── grades / sections
 ├── homeroom class
 └── (future) timetable
```

- API: `GET/POST/PATCH /schools/teachers`, assignments on `TeacherProfile`
- UI: `/admin/teachers` — homeroom (any teacher); `/admin/subjects/assign` — subject teacher per grade
- **Scoped:** attendance, results, grade pickers, teacher dashboard — [TEACHER-SCOPING.md](./TEACHER-SCOPING.md)

---

## Priority 3: Results & report cards ✅ (core)

Delivered:

```
Academic Year → Term → ClassSubject → AssessmentTemplate → Scores
  → ClassSubjectTermSheet (DRAFT → SUBMITTED → APPROVED → PUBLISHED)
  → Report card (weighted average, rank, attendance, comments, HTML print)
```

- Admin: `/admin/results`, `/admin/results/academic-years`, `/admin/results/subjects`, `/admin/results/templates` (component editor, edit/delete)
- Teacher: `/teacher/results` (scoped score matrix)
- Student: `/student/results` (published only) + print view
- Platform: `/platform` → Assessments (per-school template management)
- See [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md), [ASSESSMENT-TEMPLATES.md](./ASSESSMENT-TEMPLATES.md)

**Still on roadmap:**

- PDF export (browser print works)
- Subject-specific templates (Art, PE)
- Bulk term comments UI

---

## Priority 4: Academic year engine ✅ (core)

`AcademicYear` + `StudentEnrollment` (per year grade/section, `isCurrent`).

- End-of-year promotion: `/admin/results/promotion`
- Enrollment sync on student create/update
- API: `GET /results/promotion/preview`, `POST /results/promotion/execute`, `POST /results/enrollments/sync`

**Next:** auto-copy class subjects & fee schedules into new year.

---

## Priority 7: Content & Curriculum Engine (next major platform sprint)

Turn provisioning from a **one-time copy** into a **platform operating layer**. Full design: [CONTENT-CURRICULUM-ENGINE.md](./CONTENT-CURRICULUM-ENGINE.md).

| Phase | Deliverable |
|-------|-------------|
| 1 | Platform Curriculum Packages — DB/UI authority (extend existing `CurriculumPackage`) |
| 2 | Platform Subject Repository → school copies |
| 3 | Platform eLibrary Repository — upload once, inherit to schools |
| 4 | Provisioning Engine v2 + `SchoolProvisioningLog` |
| 5 | Inheritance (`sourceId`, `isCustomized`) + safe sync |
| 6 | Marketplace (installable packs) — revenue, later |

**Foundation already shipped:** `SchoolProvisioningService`, `CurriculumPackage` models, package picker at register, platform Assessments per school, communication templates in packages.

**Goal:** Registration → fully configured school in **&lt; 5 minutes** without manual subject/template setup.

---

## Priority 4b: Student portal & eLibrary ✅ (core)

- Student: `/student/results`, `/student/fees`, `/student/library`, `/student/id-card`, `/student/timetable`
- eLibrary: admin/teacher/student hubs, `LibraryAudience`, local file upload — [ELIBRARY.md](./ELIBRARY.md)
- Announcement **notification bell** on all school portals (read/unread)

---

## Priority 5: Parent communication (Sprint 4)

Structured tickets, not open chat:

- Absence → homeroom teacher  
- Academic → subject / admin  
- Fees → finance officer  

In-app `ParentNotification` exists today for fees and attendance events.

---

## Priority 6: Online payments (Sprint 5)

Telebirr + Chapa: parent pays → webhook confirms → balance + receipt.

**Today:** manual bank-transfer + finance verification — [INTEGRATIONS.md](./INTEGRATIONS.md).

---

## Integrations (do not block pilot)

| Integration | Pilot status |
|-------------|----------------|
| Fayda | Mock OTP — schema ready |
| SMS | In-app notifications only |
| Chapa / Telebirr | Manual verify; live gateway later |

---

## Suggested sprint order

| Sprint | Focus | Status |
|--------|--------|--------|
| 1 | Teacher management + scoping on attendance/results | ✅ Done |
| 2 | Academic engine: templates, workflow, report cards | ✅ Core done |
| 3 | Academic year promotion + enrollment history | ✅ Core done |
| 3b | Unified school-day dashboards | ✅ Admin / teacher / parent |
| 3c | Student portal (results, fees, library) + announcement bell | ✅ Core done |
| 4 | Report card PDF, subject templates, parent messaging | Planned |
| 5 | Timetable | ✅ `/admin/timetable` + portal views |
| 6 | Chapa + Telebirr live | Planned |
| 7 | Content & Curriculum Engine (phases 1–4) | Planned — see [CONTENT-CURRICULUM-ENGINE.md](./CONTENT-CURRICULUM-ENGINE.md) |

After sprint 3–4, CampusOne is viable for a full academic year at a private school in Ethiopia. Sprint 7 makes **onboarding scale** for many schools without per-tenant manual setup.

---

## What NOT to build before first pilot

These do not unblock the first school as much as solid academics:

- Live Fayda API  
- SMS provider  
- Mobile native app  
- AI assistant  
- University / multi-campus modes  

See [INTEGRATIONS.md](./INTEGRATIONS.md).
