# School day workflow

CampusOne is organized around **one daily loop**, not isolated modules:

```text
Morning → Attendance → Classes → Assessments → Fees → Communication → Reports
```

Each role lands on a **Today** dashboard that links into the right module.

## Entry points

| Role | URL | Today panel shows |
|------|-----|-------------------|
| Admin / staff | `/admin` | Attendance %, pending payments, result approvals, alerts |
| Teacher | `/teacher` | My subjects, attendance pending, scores pending |
| Parent | `/parent` | Each child: attendance, fees due, performance snapshot |

Data comes from `GET /dashboards/me` → `day` object.

## Academic year controls everything

| Area | Scoped by current `AcademicYear` |
|------|----------------------------------|
| Class subjects | `ClassSubject.academicYearId` |
| Fee schedules | `FeeSchedule.academicYearId` |
| Enrollment history | `StudentEnrollment` per year (frozen after promotion) |
| Active student grade | `StudentProfile.gradeId` (working placement) |

### End-of-year promotion

1. Create next year: `/admin/results/academic-years`
2. Map grades: `/admin/results/promotion`
3. Run promotion — archives old enrollments, moves students, sets new year current

API: `GET /results/promotion/preview`, `POST /results/promotion/execute`

New students auto-get a current-year enrollment row on create/update.

## Module connections

| From | To | How |
|------|-----|-----|
| Attendance | Report cards | Term attendance % on HTML report |
| Assessment templates | Scores | Weighted columns auto-sync |
| Scores | Report cards | Weighted average + letter grade |
| Workflow | Parents | Report visible only when `PUBLISHED` |
| Fees | Parent dashboard | Outstanding balance per child |
| Fee payment | Parent inbox | In-app notification on approve |

## What’s next (workflow polish)

- Report card PDF + student photo on print
- Timetable (periods → structured attendance)
- Copy class subjects & fees when opening a new year

See [PRODUCT-ROADMAP.md](./PRODUCT-ROADMAP.md).
