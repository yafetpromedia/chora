# External integrations strategy

CampusOne does **not** block launch on Fayda, SMS, or payment gateways. Those are **pluggable connectors** activated when schools need them and contracts exist.

## Priority: core school workflows first

| Priority | Feature | Status |
|----------|---------|--------|
| 1 | Teacher scoping & dashboard | ✅ [TEACHER-SCOPING.md](./TEACHER-SCOPING.md) |
| 2 | Academic engine (templates, workflow, report cards) | ✅ [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md) |
| 3 | Academic year promotion | Sprint 3 — year CRUD exists |
| 4 | Timetable | Sprint 5 |
| 5 | Principal dashboard | Partial (read-only overview) |

## Fayda (national ID)

**Now:** Mock verification in student registration.

- Demo FAN in UI; OTP `123456`
- DB fields: `fan`, `fcn`, `fayedaVerifiedAt`
- API: `POST /fayeda/send-otp`, `POST /fayeda/verify`

**Later:** Swap `FayedaService` implementation; keep routes and UI unchanged.

## SMS

**Now:** In-app parent notifications (`ParentNotification` → `/parent`).

Attendance absences, payment confirmations, and fee reminders use the notification center.

**Later:** SMS provider adapter (e.g. Africa's Talking) behind the same event hooks.

## Chapa / Telebirr

**Now:** Manual bank-transfer workflow.

1. Admin sets bank account in **Settings → School profile**
2. Parent: **Pay fee** → sees account → enters reference + optional screenshot
3. Finance: **Finance → Pending payment verification** → Approve / Reject
4. On approve: balance updated, receipt generated, parent notified in-app

`PaymentMethod.TELEBIRR` and `CHAPA` remain in schema for future auto-settlement.

**Later:** Implement `PaymentGateway` interface; webhook marks payment `COMPLETED`.

## What schools ask in demos

Usually:

- Can teachers enter grades? ✅
- Can we print report cards? ✅ HTML print; PDF export on roadmap
- Can parents see attendance? ✅
- Can we manage fees? ✅ (manual verify + cash at office)
- Can we track students? ✅

Rarely: “Do you have Chapa?” — can answer “bank transfer + verification today; online payments on roadmap.”

## 30–60 day focus

**Ignore** until core is sold:

- Live Fayda API
- SMS provider
- Chapa / Telebirr live checkout

**Build:**

1. Academic year promotion / enrollment history (Sprint 3)
2. Report card PDF + subject-specific templates
3. Timetable
4. Parent messaging (routed tickets)
