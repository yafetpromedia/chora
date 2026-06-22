# Assessment templates

CampusOne supports **different grading structures per grade and subject** — not one hardcoded exam list for the whole school.

## Data model

```
AssessmentTemplate
  └── AssessmentTemplateComponent (name, weightPercent, maxScore)

Assignment (priority):
  1. ClassSubject.assessmentTemplateId  → per grade + subject + year
  2. AssessmentTemplateGrade            → grade-wide or grade + subject
  3. (none)                             → manual assessments only

Per term, components sync to Assessment rows for score entry.
```

## Example templates (seeded on demo school)

| Template | Grades | Components |
|----------|--------|------------|
| Primary (1–4) | 1–4 | Activity 10%, Worksheet 10%, Participation 10%, Mid 20%, Final 50% |
| Middle (5–8) | 5–8 | Assignment 15%, Quiz 15%, Group Work 10%, Mid 20%, Final 40% |
| Secondary (9–12) | 9–12 | Assignment 15%, Project 10%, Mid 25%, Final 50% |

Weights must total **100%**.

## Admin workflow

1. **Sidebar → Assessment templates** (`/admin/results/templates`) — or **Results** → link to templates
2. **Create template** — name, description, and **components** (worksheet, activity, quiz, test, assignment, etc.)
3. Set each component: label, **weight %**, **max score** — live total must equal **100%**
4. **Edit** or **delete** templates; assign to a **grade** (all subjects) or override on a **class subject**
5. Ensure **class subjects** exist (grade + subject + academic year) via **Subjects → Assign**

The UI uses a shared **component editor** (`template-components-editor.tsx`) with add, remove, and reorder.

## Teacher workflow

1. Open **Results** (`/teacher/results`)
2. Select **term** and **class + subject**
3. Score matrix loads columns from the template (auto-sync)
4. Enter scores per student per component → **Save all scores**

## Report cards

Weighted average uses existing `weightedTermAverage()`:

```text
( score / maxScore ) × 100 × weightPercent  →  sum / totalWeight
```

Example: Activity 8/10 (10%), Final 42/50 (50%) → overall % and letter from grading scale.

## Platform superadmin

CampusOne staff can manage templates for any school from **`/platform` → Assessments**:

| Method | Path |
|--------|------|
| GET | `/platform/schools/:id/assessment-templates` |
| POST | `/platform/schools/:id/assessment-templates` |
| PATCH | `/platform/schools/:id/assessment-templates/:templateId` |
| POST | `/platform/schools/:id/assessment-templates/:templateId/delete` |

## School API (`/results`)

| Method | Path |
|--------|------|
| GET | `/results/assessment-templates` |
| GET | `/results/assessment-templates/:id` |
| POST | `/results/assessment-templates` |
| PATCH | `/results/assessment-templates/:id` |
| POST | `/results/assessment-templates/:id/delete` |
| POST | `/results/assessment-templates/:id/assign-grade` |
| POST | `/results/class-subjects/:id/template` |
| GET | `/results/score-matrix?termId=&classSubjectId=` |
| POST | `/results/score-matrix` |
| POST | `/results/workflow/submit` · `approve` · `publish` · `reopen` |

## Approval workflow

Each **class subject + term** has a `ClassSubjectTermSheet`:

| Status | Meaning |
|--------|---------|
| `DRAFT` | Teacher can edit scores |
| `SUBMITTED` | Locked; awaiting academic office |
| `APPROVED` | Locked; ready to publish |
| `PUBLISHED` | Parents/students can see on report cards |

Teachers **Submit** from the score matrix; admins **Approve** / **Publish** from `/admin/results` (pending queue) or the matrix panel.

**Students** only see results after publish: `/student/results` (report card + browser print at `/student/results/print`).

Full flow: [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md).

## Future

- Subject-specific overrides (e.g. Art = Project + Portfolio only)
- Template library per school type (KG vs preparatory)
- PDF report cards (HTML print works today)

See also [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md), [INTEGRATIONS.md](./INTEGRATIONS.md), [PRODUCT-ROADMAP.md](./PRODUCT-ROADMAP.md).
