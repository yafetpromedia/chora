# Timetable module

**Status:** ✅ Sprint A — initial release

Weekly class schedules connect subjects, teachers, grades, and rooms to daily school operations.

## Data model

| Model | Purpose |
|--------|---------|
| `Timetable` | One per **academic year** per school |
| `TimetablePeriod` | Bell schedule (Period 1–8, optional start/end times) |
| `TimetableRoom` | Room names (created on save or via API) |
| `TimetableEntry` | One slot: weekday + period + grade/section + subject + teacher + room |

`Weekday` enum: `MONDAY` … `SUNDAY` (grid uses Mon–Sat by default).

## Permissions

| Key | Who |
|-----|-----|
| `timetable.read` | View grid and portals |
| `timetable.manage` | Edit periods and entries |

**Academic director** template includes `timetable.*`. Teachers/parents/students use portal routes without staff permissions.

## API (`/schools/timetable`)

| Method | Path | Role |
|--------|------|------|
| POST | `/ensure` | Admin — create timetable + default periods |
| GET | `/periods?academicYearId=` | Staff |
| PATCH | `/periods` | Staff — replace period list |
| GET | `/grid?academicYearId=&gradeId=&sectionId=` | Staff — edit grid data |
| PATCH | `/entries` | Staff — save class week |
| GET | `/me/today` | Teacher, student, parent |
| GET | `/me/week` | Teacher, student, parent |

## Admin UI

- **`/admin/timetable`** — grid editor (grade/section, Mon–Sat × periods)
- Linked from **Subjects** hub and sidebar **Timetable**

## Portals

| Route | Audience |
|-------|----------|
| `/teacher/timetable` | Teacher week view |
| `/student/timetable` | Student week view |
| `/parent/timetable` | Today's classes for linked children |
| Teacher **Overview** | Today's timetable slots when published |

## Workflow

1. Set current **academic year**.
2. Assign **subjects + teachers** per grade (`/admin/subjects/assign`).
3. Open **Timetable**, pick grade/section, fill cells, **Save**.
4. Teachers/students/parents see schedules on dashboards.

## Validation

- Teacher **double-booking** blocked (same period + day).
- Entries require a **subject**; teacher and room are optional.

## Next (roadmap)

- Period-aware attendance (link `AttendanceRecord.periodNumber` to timetable period)
- Substitutions / cover lessons
- PDF export of class timetable
- Room capacity conflicts

See [PRODUCT-ROADMAP.md](./PRODUCT-ROADMAP.md).
