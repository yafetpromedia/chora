# Teacher scoping

CampusOne restricts teachers to **only their assigned classes** — homeroom and/or subject assignments. Admins and staff (`portalRole: admin | staff`) remain school-wide.

**Status:** ✅ Implemented (Sprint 1). Subject assignment UI: `/admin/results/subjects`.

## Data model

| Model | Purpose |
|--------|---------|
| `TeacherProfile` | One per teacher user; `homeroomGradeId`, `homeroomSectionId` |
| `TeacherAssignment` | Extra classes: `gradeId`, `sectionId?`, `subjectId?`, `isHomeroom` |

**Scope rule:** A teacher can access a class when:

1. **Homeroom** matches `gradeId` (+ optional `sectionId`), or  
2. An **assignment** matches `gradeId` (+ optional `sectionId`), or  
3. **`ClassSubject.teacherId`** equals the teacher (results), or  
4. User is **admin/staff** (unrestricted).

Grade-wide scope (`sectionId = null`) allows any section in that grade.

Subject-only assignment (`subjectId` set) still gates by **grade/section** today; subject-level-only teachers are a future enhancement.

## Backend

### `TeacherScopeService`

`apps/api/src/teachers/teacher-scope.service.ts`

- `getClassScopes(schoolId, userId, role)` → `null` (unrestricted), `ClassScope[]`, or `[]`
- `assertCanAccessClass(scopes, gradeId, sectionId?)` → throws `403` if denied
- `listGradesForTeacher(schoolId, userId)` → grades/sections for UI pickers

### `TeacherDashboardService`

`apps/api/src/teachers/teacher-dashboard.service.ts`

- `GET /schools/teachers/me/dashboard` — today's classes, attendance pending, results pending, assignments

### Enforcement matrix

| Endpoint | Teachers scoped? |
|----------|------------------|
| `GET /schools/teachers/me/classes` | Yes |
| `GET /schools/grades` | Yes (same as `me/classes`) |
| `GET /attendance/roster` | Yes |
| `POST /attendance/bulk`, `POST /attendance/scan` | Yes |
| `GET /attendance/student`, `.../summary` | Yes (via `resolveStudentProfileId`) |
| `GET /results/class-subjects` | Yes |
| `GET /results/assessments` | Yes |
| `GET /results/assessments/:id/grid` | Yes |
| `POST /results/scores/bulk` | Yes |
| `POST /results/assessments` | Yes (create only for assigned class) |
| `GET /results/report-card` | Yes (`assertCanViewStudent`) |
| `GET /dashboards/me` | Real pending counts (not placeholders) |

**Not scoped (by design or later):**

- `GET /attendance/analytics` — school-wide; principals use `school.dashboard`
- Legacy `POST /results`, `GET /results/student` — deprecated; avoid for teachers

## Frontend

| Route | Behavior |
|-------|----------|
| `/teacher` | `TeacherDashboard` — classes, pending attendance/results, announcements |
| `/teacher/attendance` | Grade/section pickers use `listGradesForAttendance()` → `me/classes` |
| `/teacher/results` | Assessments list filtered by API |
| Dashboard links | `?gradeId=&sectionId=` pre-select class on attendance |

### Session

Permissions and assignments are resolved at login (JWT `permissions[]`). After admin changes assignments, teacher should **log out and back in**.

## Example

**Mr. Samuel** — Math, Grade 10-A, Grade 10-B:

After login he sees only 10-A and 10-B in attendance and results — not Grade 9 or 11.

## Testing

1. Log in as `teacher@eduos.local` / `Passw0rd!`
2. Open `/teacher` — verify class list matches seed assignments
3. Try `/teacher/attendance` — only assigned grades in dropdown
4. Open another grade via API (devtools) — expect `403 You do not have access to this class`
5. Log in as `admin@eduos.local` — all grades visible

## Next sprints

See `PRODUCT-ROADMAP.md`:

1. ~~Teacher scoping~~ (this doc)  
2. Report cards & GPA  
3. Academic year / `StudentEnrollment`  
4. Timetable  
5. Chapa + Telebirr  
