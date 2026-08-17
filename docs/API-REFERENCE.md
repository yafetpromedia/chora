# API Reference (Overview)

REST API served by NestJS at `http://localhost:3001` (dev). All school routes require JWT unless noted.

**Auth header:** `Authorization: Bearer <access_token>`

**Dev proxy:** Browser uses `/backend/*` on port 3000 → API port 3001.

---

## Health

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | No |

---

## Auth (`/auth`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/school-code/:code` | Validate school code (pre-login) |
| POST | `/auth/login` | Username + password + school code |
| POST | `/auth/register-school` | New school registration |
| POST | `/auth/join-school` | Join with school code |
| POST | `/auth/join-invite` | Join via invite token |
| POST | `/auth/verify-student` | Pre-login student enrollment check |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/google` | Google OAuth |
| GET | `/auth/profile` | Current user profile |
| PATCH | `/auth/profile` | Update profile / password |

---

## Schools (`/schools`)

| Method | Path | Description |
|--------|------|-------------|
| GET/PATCH | `/schools/me` | School profile & settings |
| POST | `/schools/logo` | Upload school logo |
| POST | `/schools/signature` | Upload authorized signature |
| GET/POST | `/schools/invites` | Staff invite links |

---

## Students (`/schools/students`, `/students`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/schools/students` | List / search |
| POST | `/schools/students` | Create student |
| GET/PATCH | `/schools/students/:id` | Detail / update |
| POST | `/schools/students/import` | CSV import |
| GET | `/schools/students/:id/records/*` | Academic record tabs |

---

## Teachers (`/schools/teachers`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/schools/teachers` | Roster / create |
| PATCH | `/schools/teachers/:id` | Update assignments, homeroom |

---

## Attendance (`/attendance`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/attendance/roster` | Class roster for date |
| POST | `/attendance/bulk` | Save attendance |
| POST | `/attendance/scan` | QR scan mark (duplicate-safe) |
| GET | `/attendance/student/summary` | Student/parent summary |
| GET | `/attendance/analytics` | Admin analytics |
| GET/POST | `/attendance/permission-requests` | Absence permissions |

---

## Results (`/results`)

### Academics setup

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/results/academic-years` | Academic years |
| GET/POST/PATCH/DELETE | `/results/terms` | Terms |
| GET/POST/PATCH | `/results/subjects` | Subject catalog |
| GET/POST/PATCH | `/results/class-subjects` | Class + subject + teacher |

### Assessment templates

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/results/assessment-templates` | Templates |
| POST | `/results/assessment-templates/:id/assign-grade` | Assign to grade |

### Scores & workflow

| Method | Path | Description |
|--------|------|-------------|
| GET | `/results/score-matrix` | Class score grid |
| POST | `/results/score-matrix` | Save scores |
| GET | `/results/student-subject-matrix` | Student/parent portal matrix |
| GET | `/results/workflow/pending` | Pending approvals |
| POST | `/results/workflow/submit` | Teacher submit |
| POST | `/results/workflow/approve` | Admin approve |
| POST | `/results/workflow/publish` | Admin publish |

### Score corrections

| Method | Path | Description |
|--------|------|-------------|
| POST | `/results/score-corrections` | Report issue |
| GET | `/results/score-corrections` | List (role-filtered) |
| PATCH | `/results/score-corrections/:id/propose` | Teacher propose |
| POST | `/results/score-corrections/:id/approve` | Admin approve |
| POST | `/results/score-corrections/:id/reject` | Admin reject |

### Report cards

| Method | Path | Description |
|--------|------|-------------|
| GET | `/results/report-card` | JSON report card |
| GET | `/results/report-card/html` | HTML for print |
| POST | `/results/report-card/publish` | Publish class report cards |

See [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md) and [SCORE-CORRECTIONS.md](./SCORE-CORRECTIONS.md).

---

## Finance (`/finance`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/finance/fee-types` | Fee types |
| GET/POST | `/finance/schedules` | Fee schedules |
| GET | `/finance/student-fees` | Student balances |
| POST | `/finance/payments` | Record payment |
| PATCH | `/finance/payments/:id/verify` | Verify bank transfer |

---

## Library (`/schools/library`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/schools/library/resources` | Resources |
| POST | `/schools/library/resources/:id/upload` | File upload |
| GET | `/schools/library/student` | Student shelf |

See [ELIBRARY.md](./ELIBRARY.md).

---

## Classwork (`/schools/classwork`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/schools/classwork/assignments` | Assignments |
| GET | `/schools/classwork/student` | Student view |
| POST | `/schools/classwork/student/:id/submit` | Submit work |

---

## Timetable (`/schools/timetable`)

| Method | Path | Description |
|--------|------|-------------|
| GET/PUT | `/schools/timetable` | Weekly grid |
| GET/POST | `/schools/timetable/periods` | Bell schedule |

See [TIMETABLE.md](./TIMETABLE.md).

---

## Announcements (`/announcements`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/announcements` | List / create |
| POST | `/announcements/:id/read` | Mark read |
| GET | `/announcements/unread-count` | Badge count |

---

## Dashboards (`/dashboards`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboards/me` | Role-specific “today” payload |

---

## Platform (`/platform/*`)

Cross-tenant routes for CampusOne staff (`scope: platform` JWT).

| Area | Examples |
|------|----------|
| Schools | CRUD, suspend, usage |
| Content | Curriculum packages, assessment templates |
| Billing | Plans, invoices |
| Support | Ticket inbox |

---

## Permissions

Routes may require permission keys (e.g. `results.approve`, `students.create`). See [PERMISSIONS.md](./PERMISSIONS.md).

---

## Errors

Standard HTTP status codes. Body shape:

```json
{ "message": "Human-readable error", "statusCode": 400 }
```

---

## OpenAPI / Swagger

Not yet published. This document is the living overview; inspect controllers in `apps/api/src/*/`.controller.ts for full DTOs.
