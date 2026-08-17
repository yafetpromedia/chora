# CampusOne Web

Next.js 16 (App Router) school and platform portals.

## Run locally

```powershell
cd apps\web
npm run dev   # port 3000
```

Set env from template:

```powershell
copy .env.example .env.local
```

In **development**, API calls go through `/backend/*` on the web server (no extra config needed). For production, set `NEXT_PUBLIC_API_BASE_URL`.

From repo root: `npm run dev:clean` starts web + API.

## Portals

| Path | Role |
|------|------|
| `/login` | School tenant login |
| `/admin` | Admin & staff (permission-filtered nav) |
| `/teacher` | Teachers — results, attendance, library |
| `/parent` | Parents — fees, timetable |
| `/student` | Students — results, fees, library, ID card |
| `/platform` | CampusOne platform team |

## Notable routes

- Assessment templates: `/admin/results/templates`
- Teacher score entry: `/teacher/results`
- Student published results: `/student/results`

**Docs:** [../../docs/README.md](../../docs/README.md) · [../../docs/USER-GUIDE.md](../../docs/USER-GUIDE.md) · [../../docs/STUDENT-PARENT-PORTAL.md](../../docs/STUDENT-PARENT-PORTAL.md)
