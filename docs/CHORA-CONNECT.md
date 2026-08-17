# Chora Connect

**Status:** Planned — shown publicly as **Coming Soon**  
**Brand name:** Chora Connect  
**Tagline:** Stay connected to what matters.

---

## What it is

**Chora Connect** is the planned **communication layer** for the Chora school platform — connecting parents, teachers, students, and administrators in one place.

It is **not built yet**. The landing page and docs describe it as **Coming Soon** to build brand awareness without exposing unfinished functionality.

---

## Relationship to what exists today

Chora already ships:

- School **announcements** (`/admin/announcements`)
- **Notification bell** on all portals (read/unread)
- **Targeted announcement recipients**
- **Parent alerts** (fees, attendance via `/notifications`)

**Chora Connect** will become the **advanced communication layer** when built — direct messaging, department channels, structured support requests, file sharing, and smart notification routing.

Until then, existing announcements and notifications remain separate and fully functional.

---

## Planned capabilities

| Feature | Description |
|---------|-------------|
| Direct messaging | Parent ↔ teacher, student ↔ teacher, staff ↔ staff |
| Parent communication | Updates about a child's academic and school activities |
| School announcements | Important updates delivered to the right people |
| Smart notifications | Important events without notification overload |
| Message requests / support | Structured communication with school departments |
| File sharing | Documents, assignments, notices, and resources |
| Department communication | Registrar, finance, academic office, etc. |
| Role-based communication | Users only communicate where permissions allow |

---

## Product architecture (vision)

```text
                         CHORA
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
     ACADEMICS          OPERATIONS          LEARNING
        │                  │                  │
     Results           Attendance          eLibrary
     Timetable         Finance            Classwork
     Assessments       Admissions          AI
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │    CHORA    │
                    │   CONNECT   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
           Parents      Teachers     Students
              │            │            │
              └────────────┼────────────┘
                           │
                         School
```

Chora Connect sits **below** the operational modules and **above** the community — the connective tissue between people.

---

## Public messaging

### Landing card (simple)

**Chora Connect**  
**Your school. Your people. Connected.**

> Communication between schools, teachers, students, and parents — designed for one connected school community.

**COMING SOON**

### Section headline

**Stay connected to what matters.**

> A smarter way for schools, teachers, students, and parents to communicate — all in one place.

---

## Implementation (when development starts)

Suggested approach:

1. **Phase 1:** Department message requests (registrar, finance) — extends existing support patterns
2. **Phase 2:** Teacher ↔ parent threads tied to a student context
3. **Phase 3:** Staff ↔ staff and student ↔ teacher messaging
4. **Phase 4:** Smart notification preferences and file attachments

**Do not** merge with current announcement bell until Connect is stable — run in parallel during transition.

---

## Code & UI locations

| Item | Path |
|------|------|
| Brand constants | `apps/web/src/lib/brand.ts` |
| Landing section | `apps/web/src/components/landing/landing-chora-connect.tsx` |
| Landing styles | `apps/web/src/styles/landing.css` (`.lp3-connect*`) |
| Nav anchor | `#connect` on landing page |

---

*Last updated: August 2026*
