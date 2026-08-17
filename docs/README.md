# CampusOne Documentation

Central index for all project documentation. Start here based on your role.

---

## Quick start

| I want to… | Read |
|------------|------|
| Run the project locally | [../README.md](../README.md) → [../SETUP-WINDOWS.md](../SETUP-WINDOWS.md) |
| Set up PostgreSQL | [../SETUP-POSTGRES.md](../SETUP-POSTGRES.md) |
| Understand what exists today | [WHAT-WE-HAVE.md](./WHAT-WE-HAVE.md) |
| Use the product (admin, teacher, parent, student) | [USER-GUIDE.md](./USER-GUIDE.md) |
| Develop or extend the codebase | [DEVELOPER-GUIDE.md](./DEVELOPER-GUIDE.md) |
| Fix login / network / port issues | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) |
| Deploy to production | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| Prepare for a pilot school | [PILOT-READINESS.md](./PILOT-READINESS.md) |

---

## By audience

### School users (admin, staff, teachers, parents, students)

| Document | Description |
|----------|-------------|
| [USER-GUIDE.md](./USER-GUIDE.md) | Day-to-day use for every portal role |
| [STUDENT-PARENT-PORTAL.md](./STUDENT-PARENT-PORTAL.md) | Student & parent dashboards, results, fees, privacy |
| [SCHOOL-DAY-WORKFLOW.md](./SCHOOL-DAY-WORKFLOW.md) | Typical daily loop: attendance → classes → results → fees |
| [SCORE-CORRECTIONS.md](./SCORE-CORRECTIONS.md) | Report wrong published scores; teacher → admin approval |

### Developers & integrators

| Document | Description |
|----------|-------------|
| [DEVELOPER-GUIDE.md](./DEVELOPER-GUIDE.md) | Monorepo layout, conventions, local dev, testing |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | High-level module map and data flow |
| [TENANT-ARCHITECTURE.md](./TENANT-ARCHITECTURE.md) | Platform vs school tenant isolation |
| [API-REFERENCE.md](./API-REFERENCE.md) | REST endpoint overview by module |
| [PERMISSIONS.md](./PERMISSIONS.md) | RBAC, role templates, permission keys |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Chapa, Fayeda, SMS, AI |
| [../CONTRIBUTING.md](../CONTRIBUTING.md) | How to contribute code |

### Product & platform team

| Document | Description |
|----------|-------------|
| [PRODUCT-ROADMAP.md](./PRODUCT-ROADMAP.md) | Strategy and backlog |
| [CONTENT-CURRICULUM-ENGINE.md](./CONTENT-CURRICULUM-ENGINE.md) | Platform content layer |
| [CURRICULUM-PRESETS.md](./CURRICULUM-PRESETS.md) | School provisioning packages |
| [PILOT-READINESS.md](./PILOT-READINESS.md) | Pre-launch checklist |

---

## Feature deep-dives

| Topic | Document |
|-------|----------|
| Results workflow & report cards | [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md) |
| Assessment templates & weights | [ASSESSMENT-TEMPLATES.md](./ASSESSMENT-TEMPLATES.md) |
| Score correction reports | [SCORE-CORRECTIONS.md](./SCORE-CORRECTIONS.md) |
| Teacher class scoping | [TEACHER-SCOPING.md](./TEACHER-SCOPING.md) |
| eLibrary | [ELIBRARY.md](./ELIBRARY.md) |
| Timetable | [TIMETABLE.md](./TIMETABLE.md) |
| Student/parent portals | [STUDENT-PARENT-PORTAL.md](./STUDENT-PARENT-PORTAL.md) |

---

## App-specific READMEs

| Path | Description |
|------|-------------|
| [../apps/api/README.md](../apps/api/README.md) | NestJS API commands and modules |
| [../apps/web/README.md](../apps/web/README.md) | Next.js portals and routes |

---

## Environment templates

| File | Purpose |
|------|---------|
| [../apps/api/.env.example](../apps/api/.env.example) | API: database, JWT, Chapa, AI, Fayeda |
| [../apps/web/.env.example](../apps/web/.env.example) | Web: API URL, Google OAuth, LAN testing |
| [../infra/.env.example](../infra/.env.example) | Docker Postgres & Redis |

---

## Demo credentials (local dev)

| Portal | URL | Credentials |
|--------|-----|-------------|
| School login | `/login` | School code `BRIGHT1` → username `admin` / `Passw0rd!` |
| Teacher | `/teacher` | `teacher` / `Passw0rd!` |
| Student | `/student` | `student` / `Passw0rd!` or Student ID `STU-…` |
| Parent | `/parent` | `parent` / `Passw0rd!` |
| Platform | `/platform/login` | `platform@campusone.local` / `Passw0rd!` |

---

*Last updated: August 2026 — keep [WHAT-WE-HAVE.md](./WHAT-WE-HAVE.md) in sync when shipping features.*
