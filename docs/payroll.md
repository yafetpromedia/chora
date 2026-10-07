# HR, Compensation & Payroll

School workforce payroll extends existing `User` records with an optional `EmployeeProfile` (1:1). Student fees (`Payment` / Fee*) stay separate; salary disbursement uses `PayrollPayment`.

## Module entitlement

Billable module key: **`payroll`**. Schools with attendance enabled are grandfathered for payroll on subscription load.

Frontend nav **fails closed**: payroll/People/My Payslips stay hidden until subscription entitlements are loaded successfully. Backend `SchoolModuleGuard` remains authoritative.

## Money

- All stored amounts use **integer cents** (`*Cents Int`). Never floating point for stored/computed payroll.
- Helpers: `apps/api/src/payroll/money.util.ts`.
- UI: `EtbAmount`.

## HR structure

- `EmployeeProfile` → User (unique), school-scoped `employeeCode`, employment type/status, `HrDepartment` / `HrPosition`, supervisor, bank fields, hire/contract dates.
- `EmploymentHistory` records employment changes (effective-dated).
- Org seeds default departments/positions per school (editable).
- Curriculum `SchoolDepartment` is **not** used for HR org chart.

## Compensation

- Catalog: `CompensationComponent` (school-scoped).
- Packages: `EmployeeCompensation` + lines (effective-dated). Salary change creates a new row and closes the previous (`effectiveTo`); history is never overwritten.
- Lines must reference a **same-school** `componentId` or the API rejects the request.

## Payroll lifecycle

`DRAFT` → `CALCULATING` → `CALCULATED` → (`UNDER_REVIEW` reserved) → `APPROVED` → `PAID` → `CLOSED`

- Recalculate allowed while `DRAFT` / `CALCULATED` / `UNDER_REVIEW` (replaces snapshots/lines/payslips in a transaction — no duplicate lines).
- After `APPROVED` / `PAID` / `CLOSED`: calculate and adjustments are locked.
- **Close** requires all employee payments `PAID`, unless **force-close** with an audited reason.

## Attendance integration

Reads existing `StaffAttendanceRecord` only (no second OT engine):

- `overtimeMinutes` with school OT multiplier / approval gate (`PayrollSettings`).
- Absences only reduce salary when `absenceDeductionMethod` ≠ `NO_DEDUCTION`.

## Leave policy

- Uses approved `LeaveRequest` + `LeaveType.isPaid`.
- Days are **intersected** with the payroll period (not the full leave request length).
- Paid leave does not create deductions.
- When `absenceDeductionMethod === NO_DEDUCTION`: **neither absence nor unpaid leave** auto-reduces salary.
- When deduction policy is enabled: unique calendar union of absence days + unpaid leave days (no double-count).
- Daily pay: payable days = present-style attendance ∪ paid leave − unpaid leave (`on_leave` is not double-counted as worked + deduction).

## Payments

Flow: calculate → approve → **record payment in Chora** → run becomes `PAID` when all are paid → close.

**Recording a payment in Chora is not equivalent to confirming an external bank transfer unless a verified payment integration is connected.**

Fields: method (`BANK_TRANSFER` | `CASH` | `OTHER`), optional reference, status, amount cents, paidAt. Payment status changes write `PayrollAuditEvent` (no bank account numbers in audit payloads).

## Payslips

- Immutable JSON payload on calculate (includes school name/logo/contact when available).
- `payslip.self`: own payslips only.
- `payslip.manage`: same-school employee payslips.
- `payroll.view` alone does **not** grant peer payslip access.
- Self-service payload omits employer-cost / employer contribution details.

## Permissions

| Key | Purpose |
| --- | --- |
| `hr.employees.read` / `hr.employees.manage` | Directory & profiles |
| `hr.org.manage` | Departments & positions |
| `payroll.view` | Runs & reports |
| `payroll.calculate` | Periods, runs, calculate |
| `payroll.adjust` | Manual adjustments (reason required) |
| `payroll.approve` / `payroll.pay` / `payroll.close` | Lifecycle |
| `payroll.export` | CSV |
| `payroll.settings` | Components, OT/absence policies, rule packs |
| `payslip.self` | Own payslips |
| `payslip.manage` | Admin payslip access |

Template **`payroll_officer`** includes the full payroll set. Finance officers get view/pay/export without calculate/settings by default.

## Bank data

- Prefer at-rest encryption via `PAYROLL_BANK_ENCRYPTION_KEY` (AES-256-GCM, `enc:v1:` prefix). Legacy plaintext remains readable until next save.
- Read-only HR views receive **masked** account (`****1234`) only; holder/name omitted unless `hr.employees.manage` or `payroll.pay`.
- Never log full account numbers in audit events or CSV exports.

## Statutory rules

`PayrollRuleSet` / brackets / contributions are versioned. An inactive Ethiopia placeholder pack is seeded per school.

On calculate, `PayrollRun.ruleSetId` is set to the associated pack for history, and `statutoryActive` is always `false`.

**Ethiopian statutory tax and pension calculations remain disabled until authoritative verification and implementation approval.**

Do not invent MoF rates.

## Tenant isolation

Every HR/payroll query binds externally supplied IDs to JWT `schoolId` (components, supervisors, departments, positions, runs, payslips, payments, adjustments). Controllers never trust client `schoolId`.

## Migrations

```bash
cd apps/api
npx prisma migrate deploy
# or during dev:
npx prisma migrate dev
```

Migration folder: `prisma/migrations/20261007220000_hr_payroll` (additive).

Optional env:

```
PAYROLL_BANK_ENCRYPTION_KEY=long-random-secret
```

## Key routes

API: `/hr/*`, `/payroll/*`  
Web: `/admin/hr/employees`, `/admin/hr/departments`, `/admin/hr/positions`, `/admin/hr/employees/[userId]`, `/admin/payroll`, `/admin/payroll/settings`, `/admin/payroll/payslips/[id]`, `/admin/payroll/me`, `/teacher/payroll/me`, `/teacher/payroll/payslips/[id]`

## Production limitations (current)

- No bank/auto-transfer APIs.
- No live ET tax/pension amounts.
- Monthly basic is not mid-period prorated for hires/terminations (daily/hourly use attendance).
- Adjustments require recalculate to appear on lines.
