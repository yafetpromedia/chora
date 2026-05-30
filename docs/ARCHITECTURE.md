# School OS Architecture (Phase 1)

## Modules

- Auth and RBAC
- Tenant scoping (`school_id`)
- Dashboards (student/teacher/parent/admin)
- Attendance
- Results
- Announcements

## Runtime

- Frontend: Next.js
- API: NestJS
- Data: PostgreSQL + Redis

## Deployment Targets

- Web: Vercel
- API and data services: AWS/GCP
