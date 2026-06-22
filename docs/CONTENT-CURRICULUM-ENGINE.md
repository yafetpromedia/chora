# CampusOne Content & Curriculum Engine

**Status:** Phases 1–5 shipped (marketplace deferred); see shipped table below  
**Replaces:** “copy some subjects on register” as the mental model  
**Builds on:** Existing `CurriculumPackage`, `SchoolProvisioningService`, platform `/platform` console

### Shipped

| Item | Location |
|------|----------|
| `PlatformSubject` master catalog | `/platform` → **Subjects** |
| `PlatformLibraryCategory` + `PlatformLibraryResource` | `/platform` → **eLibrary** |
| `PlatformMessageTemplate` | `/platform` → **Messages** |
| `PlatformAcademicStructure` | `/platform` → **Structures** |
| `PlatformAssessmentTemplate` + components | `/platform` → **Assessments** (catalog tab) |
| Inheritance on school rows | `Subject`, `LibraryResource`, `AssessmentTemplate`, `SchoolMessageTemplate` |
| Provisioning audit trail | `/platform` → **Provisioning** |
| Package-driven provision | Grades, subjects, library, messages, assessments from package |
| Package metadata edit (DB) | `PATCH /platform/curriculum-packages/:key` |
| Full catalog sync | `POST /platform/catalog/sync`, `POST /platform/content/sync` |

### Not yet shipped

| Item | Notes |
|------|--------|
| Marketplace / installable packs | Revenue feature — future |
| Platform file upload UI for eLibrary | Metadata sync works; shared PDF upload TBD |
| Safe sync push to customized schools | Inheritance flags exist; sync job TBD |

---

## Why elevate this?

CampusOne already provisions schools from curriculum packages (`ETHIOPIAN_PRIVATE`, `CAMBRIDGE`, etc.) via `SchoolProvisioningService`. That is **v1 provisioning**: a static catalog synced from `curriculum-packages.data.ts` into `CurriculumPackage` rows, then **copied once** into tenant tables.

That is necessary but not sufficient. The product goal is:

> A new school goes from registration to fully configured in **under five minutes**, with content that can evolve at the platform layer without breaking school customizations.

That requires a **first-class Platform module** — the **Content & Curriculum Engine** — alongside Schools, Billing, and Assessments.

---

## Target platform navigation

```text
/platform

├── Dashboard
├── Schools
├── Curriculum Packages          ← expand existing “Curriculum”
├── Subject Repository           ← new
├── eLibrary Repository          ← new
├── Assessment Templates         ← exists (per-school); → platform repository
├── Academic Structures          ← new
├── Communication Templates      ← partial (package SMS/email today)
├── School Provisioning          ← formalize engine + logs
├── Analytics                    ← future
└── Billing                      ← exists
```

Current web sections today: `overview`, `schools`, `curriculum`, `assessments`, `billing`, … — see `platform-types.ts`. New sections should be added incrementally, not in one UI dump.

---

## Architecture overview

```text
                    ┌─────────────────────────────┐
                    │   Platform content layer    │
                    │  (master catalogs & packs)  │
                    └──────────────┬──────────────┘
                                   │ provision / sync
                                   ▼
                    ┌─────────────────────────────┐
                    │   School tenant layer       │
                    │  (editable copies + flags)  │
                    └─────────────────────────────┘
```

**Inheritance fields** (on every provisioned entity):

| Field | Purpose |
|-------|---------|
| `isSystem` | Row originated from platform catalog |
| `sourceId` | `Platform*` record id (or package line id) |
| `isCustomized` | School edited; block destructive platform overwrites |

---

## 1. Subject Repository

### Today

```text
Subject (per school, schoolId + code)
ClassSubject (grade + subject + teacher + template)
```

Provisioning copies package subjects with `upsert` on `schoolId_code` — no platform master row, no `sourceId`.

### Target

```text
PlatformSubject
  → copy on provision →
School Subject (same Subject model, + inheritance fields)
```

**Platform admin can:**

- Create / archive subjects
- Categorize by curriculum (Ethiopian, Cambridge, …)
- Assign grade ranges
- Icons & descriptions

**School gets an editable copy.** Edits set `isCustomized = true`.

### API sketch

| Method | Path |
|--------|------|
| GET/POST/PATCH | `/platform/subjects` |
| POST | `/platform/curriculum-packages/:id/subjects` (link to package) |
| — | Provisioning reads package → `PlatformSubject` → school `Subject` |

---

## 2. eLibrary Repository

### Today

```text
LibraryCategory / LibraryResource (per school)
CurriculumPackageLibraryItem (metadata only — no shared file)
```

Starter items are **created per school** at provision time; files are uploaded per tenant under `uploads/library/{schoolId}/`.

### Target

```text
PlatformLibraryCategory
PlatformLibraryResource  (platform uploads once)
  → Inherited Resource (school row, points at platform file OR copy)
  → Custom Resource (school-only)
```

**Examples:** Grade 9 Biology book, National Exam 2025, teacher lesson plan.

Platform stores the canonical file; schools get a **reference** or optional **local override** (`isCustomized`).

---

## 3. Curriculum Packages

### Today ✅ (foundation)

- `CurriculumPackage` + child tables in Prisma
- Synced from `apps/api/src/provisioning/curriculum-packages.data.ts`
- `GET /schools/curriculum-packages`, `POST /platform/schools/:id/provision`
- Packages: `ETHIOPIAN_PRIVATE`, `CAMBRIDGE`, `AMERICAN`, `BLANK`

### Target

A package is a **bundle of references**, not only inline rows:

```text
Ethiopian Curriculum
  ├── PlatformSubjects (links)
  ├── AcademicStructure template
  ├── Assessment template set
  ├── PlatformLibraryResource set
  ├── Promotion rules (future)
  └── Communication templates

Cambridge IGCSE
  └── different defaults
```

**Rename in product copy:** “Curriculum presets” → **Curriculum packages** (already used in code).

---

## 4. Academic Structure Templates

### Today

- `GradePreset` enum (`KG_12`, etc.) → `GradesService.setupGrades()`
- Chosen at register / provision

### Target

```text
PlatformAcademicStructure
  e.g. "Primary School" → Grade 1–8
  e.g. "KG + Primary + Secondary" → Nursery, KG, Grade 1–12
```

**Onboarding flow:**

```text
Register school
  → Choose academic structure
  → Auto-create grades, sections, departments
```

Structures are composable into curriculum packages.

---

## 5. Communication Template Center

### Today ✅ (partial)

- `CurriculumPackageTemplate` → copied to `SchoolMessageTemplate` at provision
- Seeded: attendance alert, fee reminder, etc. (`curriculum-packages.data.ts`)
- School announcements are separate (`Announcement` + bell UI)

### Target

```text
PlatformMessageTemplate
  → package assignment
  → provision → SchoolMessageTemplate (+ inheritance)
```

Examples: Attendance alert, fee reminder, exam results ready, parent meeting notice.

Platform UI: **Communication Templates** section; schools can edit copies without affecting master.

---

## 6. Assessment Repository

### Today ✅ (partial)

- Per-school `AssessmentTemplate` + components
- Platform superadmin: `/platform` → Assessments — CRUD per school id
- Seeded templates on demo school via `AssessmentTemplatesService`

### Target

```text
PlatformAssessmentTemplate
  → assign to CurriculumPackage
  → provision → school AssessmentTemplate (+ sourceId)
```

Same inheritance rules: customized school templates skip platform pushes.

---

## 7. School Provisioning Engine

### Today ✅

`SchoolProvisioningService.provisionSchool()` on register / `POST /platform/schools/:id/provision`:

| Step | Done |
|------|------|
| Grades from preset | ✅ |
| Academic year + 2 terms | ✅ |
| Subjects from package | ✅ |
| Departments | ✅ |
| Grading scale | ✅ |
| eLibrary categories + starter resources | ✅ |
| Message templates | ✅ |
| Assessment templates | ⚠️ via academics seed, not package-driven |
| Default roles / permissions | ✅ (separate seed) |

### Target

Single orchestrated pipeline with **audit log**:

```text
SchoolProvisioningLog
  schoolId, packageKey, step, status, error?, createdAt
```

`POST /schools` (and platform create) always runs:

```text
Create school → roles → structure → subjects → sections
  → templates → library → assessments → notifications
```

Everything driven by selected **Curriculum package** version.

---

## 8. Inheritance & sync system

**Rules:**

1. **First provision:** copy platform → school; set `isSystem=true`, `sourceId`, `isCustomized=false`.
2. **School edit:** set `isCustomized=true`.
3. **Platform update:** push only to rows where `isCustomized=false` (optional `sync` endpoint per resource type).
4. **Re-provision:** blocked when students enrolled (already enforced) — future: “merge package v2” for non-customized rows only.

This is what separates CampusOne from a one-time import script.

---

## 9. Marketplace (future revenue)

Platform-published **installable packs**:

```text
Exam banks · Worksheets · Teacher guides · Lesson plans
```

School admin: **Install** → copies into tenant with inheritance (like WordPress plugins).

Not in scope for sprint 1–3; design `sourceId` + package versioning now so marketplace is additive.

---

## Proposed database additions

| Model | Role |
|-------|------|
| `PlatformCurriculumPackage` | Evolve from `CurriculumPackage` + versioning |
| `PlatformSubject` | Master subject catalog |
| `PlatformLibraryCategory` | Master library taxonomy |
| `PlatformLibraryResource` | Master files + metadata |
| `PlatformAcademicStructure` | Grade/section templates |
| `PlatformMessageTemplate` | Master comms templates |
| `PlatformAssessmentTemplate` | Master assessment structures |
| `SchoolProvisioningLog` | Provision audit trail |

**Tenant extensions** (add columns to existing models):

```prisma
// Example on Subject, LibraryResource, AssessmentTemplate, SchoolMessageTemplate
isSystem      Boolean  @default(false)
sourceId      String?  // platform entity id
isCustomized  Boolean  @default(false)
```

---

## Current code map (v1 → v2)

| Capability | v1 location | v2 direction |
|------------|-------------|--------------|
| Package definitions | `provisioning/curriculum-packages.data.ts` | Admin UI + DB as source of truth |
| Package sync | `CurriculumCatalogService` | Versioned packages |
| Provision orchestration | `school-provisioning.service.ts` | + log + assessment/library from platform files |
| Platform curriculum UI | `platform-curriculum` (web) | Curriculum Packages editor |
| Platform assessments | `platform.controller.ts` | Platform repository → package link |
| School subjects | `Subject` | + `sourceId` / `isCustomized` |
| School library | `LibraryResource` | inherited vs custom |

---

## Recommended sprint order

Aligned with existing multi-tenant stack (`schoolId`, `/platform`, assessments, eLibrary).

| Phase | Focus | Outcome |
|-------|--------|---------|
| **1** | Platform Curriculum Packages (UI + DB authority) | Edit packages without code deploy |
| **2** | Platform Subject Repository | Master subjects → provisioned copies |
| **3** | Platform eLibrary Repository | Upload once; schools inherit references |
| **4** | School Provisioning Engine v2 | One pipeline + `SchoolProvisioningLog` |
| **5** | Inheritance & sync | `sourceId` / `isCustomized`; safe platform updates |
| **6** | Marketplace | Installable content packs |

**Do not block pilot** on phases 5–6. Phases 1–4 deliver “registration to configured in &lt; 5 minutes.”

---

## Success metrics

- New school: grades + subjects + terms + starter library + templates + assessment skeleton **without manual admin setup**
- Platform team updates Ethiopian package **without** redeploying API (after phase 1)
- School customization **never** overwritten silently (after phase 5)
- Time-to-first-login usable workspace: **&lt; 5 minutes** from register

---

## Related docs

| Doc | Topic |
|-----|--------|
| [CURRICULUM-PRESETS.md](./CURRICULUM-PRESETS.md) | Current v1 provisioning (what ships today) |
| [TENANT-ARCHITECTURE.md](./TENANT-ARCHITECTURE.md) | `schoolId` isolation |
| [ASSESSMENT-TEMPLATES.md](./ASSESSMENT-TEMPLATES.md) | School assessment workflow |
| [ELIBRARY.md](./ELIBRARY.md) | School eLibrary |
| [PRODUCT-ROADMAP.md](./PRODUCT-ROADMAP.md) | Sprint priorities |
| [WHAT-WE-HAVE.md](./WHAT-WE-HAVE.md) | Feature inventory |
