# CampusOne Permissions (RBAC)

CampusOne uses **portal roles** + **permission keys** + **role templates**.  
You can assign a template (Registrar, Finance, …) and add per-user permission overrides without code changes.

## Portal roles (`User.role`)

| Role | Workspace | Who |
|------|-----------|-----|
| `admin` | `/admin` | School owner / IT — full templates available |
| `staff` | `/admin` (filtered nav) | Registrar, finance, academic office |
| `teacher` | `/teacher` | Homeroom & subject teachers |
| `parent` | `/parent` | Guardians |
| `student` | `/student` | Learners |

## Permission keys (examples)

| Key | Used for |
|-----|----------|
| `school.dashboard` | Principal overview |
| `school.settings` | School profile, invites |
| `students.read` / `students.create` / `students.edit` | Student roster |
| `students.cards` | ID cards |
| `admissions.*` | Applications (future) |
| `finance.read` / `finance.manage` | Fees & payments |
| `results.read` / `results.manage` / `results.approve` | Grades, score matrix, workflow approve/publish — see [ACADEMIC-ENGINE.md](./ACADEMIC-ENGINE.md) |
| `attendance.read` / `attendance.manage` / `attendance.analytics` | Rolls & scan |
| `teachers.read` / `teachers.manage` | Staff directory |

Wildcards in templates: `finance.*`, `students.*` expand to all keys in that category.

## Default role templates (per school)

| Slug | Name | Typical user |
|------|------|----------------|
| `school_admin` | School admin | Owner — all permissions |
| `principal` | Principal | Dashboards + read-only insight |
| `academic_director` | Academic director | Results, exams, staff assignments |
| `registrar` | Registrar | Students, admissions, ID cards |
| `finance_officer` | Finance officer | Fees, payments, receipts |
| `homeroom_teacher` | Homeroom teacher | Class attendance & comms |
| `subject_teacher` | Subject teacher | Assigned classes only |

Templates are stored in `RoleTemplate` + `RoleTemplatePermission`.  
Customize per school in the database; assign via **Staff** page or API.

## Per-user overrides

`UserPermissionGrant` can grant or revoke individual keys on top of the template.

API:

- `GET /schools/role-templates`
- `GET /schools/permissions/catalog`
- `PATCH /schools/staff/:userId/role-template`
- `PATCH /schools/staff/:userId/permissions`

## JWT

Login returns `user.permissions[]`, `user.roleTemplateSlug`, and `user.roleTemplateName`.  
Re-login after role changes.
