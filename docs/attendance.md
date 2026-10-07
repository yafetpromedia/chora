# Attendance (students & staff)

School-scoped attendance for students and staff, plus leave and staff QR check-in.

## Permissions

| Key | Purpose |
| --- | --- |
| `attendance.read` / `attendance.manage` / `attendance.analytics` | Student attendance; **CSV export requires `attendance.analytics`** |
| `staff_attendance.read` / `manage` / `analytics` | Staff daily roll, edits, exports |
| `staff_attendance.self` | My Attendance (own summary/history/QR) |
| `staff_attendance.qr_manage` | Issue / rotate / deactivate staff QR |
| `leave.read` / `request` / `manage` / `approve` / `analytics` | Leave inbox & types |

Student attendance APIs use `PermissionsGuard`. Staff attendance and leave modules also use JWT + `SchoolTenantGuard` + roles + permissions + attendance module entitlement.

## Leave rules

- Weekday count only (Sat/Sun excluded). School holidays are **not** modeled yet.
- Approve upserts `StaffAttendanceRecord` with `on_leave` for each weekday in range.
- Cancel after approve corrects those rows (correction audit) and rolls back balance when applicable.
- Bulk “mark unmarked absent” skips users with approved leave that day.
- **Cancel authz:** owner may cancel **pending** only; cancelling **approved** (or another user’s request) requires `leave.manage` or `leave.approve` (or school admin).
- **Create for others:** only school admin or `leave.manage` may set `userId` to someone else.

## Staff hours & payroll CSV

- School expected hours: `/admin/staff-attendance` → **Hours** (`checkInTime`, `checkOutTime`, grace, overtime toggle).
- Per-day times: Manual / Correct on the daily roll.
- Check-out / correct / manual set `overtimeMinutes` when school `staffOvertimeEnabled` is true.
- `GET /staff-attendance/hours-summary` and `GET /staff-attendance/export-payroll` (requires `staff_attendance.analytics`).
- Analytics rate excludes `on_leave` from the denominator.
- No break clock yet (`breakMinutes` reserved for later).

## Staff QR payloads

Scan resolve order (always scoped by scanner’s `schoolId`):

1. `CAMPUS1-S:{token}` → `StaffQrCredential` (must be `active`; token unique per school)
2. `CAMPUS1-T:{cardCode}` → teacher card / profile
3. Student `CAMPUS1:…` → rejected

Tokens are random (crypto); payload is a gate credential, not PII. Regenerate invalidates the previous token. Self-service: `GET/POST /staff-attendance/me/qr` (always actor’s user id).

## Date / timezone

Dates are **UTC date-only** (no per-school timezone calendar yet).

## Migrations

Apply from `apps/api`:

```bash
npx prisma migrate deploy
npx prisma generate
```

If deploy hits Prisma `P3009`, apply SQL with `prisma db execute` then `prisma migrate resolve`, then regenerate the client. Stop the Nest process if Windows `EPERM` locks `query_engine`.

Relevant folders:

- `apps/api/prisma/migrations/20261007180000_staff_attendance`
- `apps/api/prisma/migrations/20261007200000_leave_ot_staff_qr` (OT field, leave tables, `StaffQrCredential`)

## UI routes

- Admin: `/admin/staff-attendance`, `/admin/staff-attendance/analytics`, `/admin/leave`, `/admin/my-attendance`, `/admin/attendance` (student + CSV export when permitted)
- Teacher: `/teacher/attendance` (homeroom), `/teacher/my-attendance`
- Parent: `/parent/attendance` (linked child summary only)
- Student: `/student/attendance` (permission requests)

## Manual checks before production

- Two-school QR / leave / export isolation with real JWTs
- Duplicate check-in/out and deactivated/rotated QR at the gate
- Approve leave → daily roll shows On leave; bulk absent does not overwrite
- Parent A cannot load Parent B’s `studentProfileId` via summary API
