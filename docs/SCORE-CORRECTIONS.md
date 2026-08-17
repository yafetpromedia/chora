# Score Corrections

Workflow for reporting and fixing incorrect **published** scores. Families flag issues; teachers propose fixes; school office approves before the live score changes.

---

## Overview

```
Student/Parent reports issue
        ↓
   OPEN (with teacher)
        ↓
Teacher proposes corrected score
        ↓
   PROPOSED (awaiting admin)
        ↓
Admin approves or rejects
        ↓
APPROVED (score updated)  or  REJECTED (unchanged)
```

---

## Who can do what

| Role | Action |
|------|--------|
| **Student** | Report a published score on `/student/results` |
| **Parent** | Report on `/parent/results` (if child allows parent results access) |
| **Teacher** | View reports for their subjects; **propose** corrected score |
| **Admin / staff** | **Approve** or **reject** proposed corrections (`results.approve` permission) |

---

## Reporting (student / parent)

1. Open **Results** for the current term.
2. Find a **published** score (not “pending”).
3. Click **Report** under that cell.
4. Describe what is wrong (at least a few words).
5. Submit — appears in **My score reports** below the score sheet.

Status labels in the portal:

| Status | Meaning |
|--------|---------|
| With teacher | Report received; teacher has not responded |
| Awaiting school approval | Teacher proposed a fix; admin must approve |
| Corrected | Admin approved; published score updated |
| Declined | Admin rejected; score unchanged |

---

## Teacher response

**Path:** `/teacher/results/score-reports`

1. Open a report (status **OPEN**).
2. Review the family message and current score.
3. Enter **proposed score** (≤ max for that assessment).
4. Optional reply note → submit for admin approval.

Teachers cannot change published scores directly — only propose.

---

## Admin approval

**Path:** `/admin/results` → **Approvals** tab

1. Filter by term / status (**PROPOSED**).
2. Open a correction — see current vs proposed score and messages.
3. **Approve** — published score updates for everyone.
4. **Reject** — optional review note; published score stays the same.

Bulk queue shows pending **PROPOSED** count on the results workspace.

---

## API

| Method | Path | Role |
|--------|------|------|
| `POST` | `/results/score-corrections` | Student, parent |
| `GET` | `/results/score-corrections` | Filtered by role (student sees own; parent sees linked children; teacher sees assigned subjects; admin sees all) |
| `PATCH` | `/results/score-corrections/:id/propose` | Teacher |
| `POST` | `/results/score-corrections/:id/approve` | Admin |
| `POST` | `/results/score-corrections/:id/reject` | Admin |

Query params: `termId`, `status` (`OPEN`, `PROPOSED`, `APPROVED`, `REJECTED`).

---

## Database

Model: `ScoreCorrectionRequest` in Prisma.

Key fields: `assessmentId`, `studentProfileId`, `message`, `currentScore`, `proposedScore`, `status`, `reviewNote`, `teacherId`, `reviewedById`.

Migration: `20260817150000_score_correction_requests`.

---

## Notifications

Creating, proposing, approving, or rejecting a correction can trigger a **targeted announcement** to relevant users (not a separate inbox module).

---

## Related docs

- [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md) — publish workflow
- [USER-GUIDE.md](./USER-GUIDE.md) — portal paths
- [STUDENT-PARENT-PORTAL.md](./STUDENT-PARENT-PORTAL.md) — results UI
