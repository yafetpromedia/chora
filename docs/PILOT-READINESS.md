# Pilot readiness checklist

Use this before putting a real school on CampusOne.

## 1. Database (reliable sync)

From repo root:

```powershell
cd C:\xampp\htdocs\school\edu-os
npm run db:sync
```

This runs `prisma migrate deploy`, and if migration history is broken (common on dev DBs), **falls back to `prisma db push`** so schema still matches.

Fresh server with empty database:

```powershell
cd apps\api
npm run prisma:migrate:deploy
```

## 2. Run the app

```powershell
npm run dev:clean
npm run health
```

Open http://localhost:3000/login — demo: `BRIGHT1` / `admin` / `Passw0rd!`

## 3. Automated smoke tests

```powershell
npm run ports:free
npm run db:sync
npm run test:e2e
```

Requires `DATABASE_URL` in `apps/api/.env` (loaded automatically). **Stop `npm run dev` first** so Prisma is not locked. Uses your existing `edu_os` database (demo seed on API start).

Covers: health, username login, academic years/terms, students list, attendance, legacy results, report card HTML.

## 4. Registrar week-one setup

Follow **Admin → Academics** in order:

1. Academic years  
2. Terms  
3. Teachers (separate from assignments)  
4. Subject catalog  
5. Assign subjects to classes  
6. Timetable  

## 5. Parent & student login handout

**Admin → Settings → Access & invites** — copy **Pilot login handout** text (school code + login URL).

## 6. Report cards (PDF via browser)

1. Enter and publish scores (all class subjects **Published**)  
2. **Admin → Results** → preview → **Print / Save PDF**  
3. In the dialog, choose **Save as PDF** or **Microsoft Print to PDF**

## 7. What is still manual in pilot

- Fee payments (bank transfer + admin verify) — no Telebirr/Chapa live yet  
- Fayeda ID verify — mock flow  
- SMS notifications — not wired  
- Native mobile app — use phone browser on school Wi‑Fi ([SETUP-WINDOWS.md](../SETUP-WINDOWS.md))

## 8. Go / no-go for first school

| Check | Pass? |
|-------|-------|
| `npm run db:sync` succeeds | |
| `npm run test:e2e` passes | |
| Registrar completes Academics steps 1–5 | |
| 10+ students enrolled with portal passwords | |
| Teacher marks attendance on phone | |
| One term scores submitted → approved → published | |
| Report card prints to PDF | |
| Parent can log in with handout | |

When all pass, you are **pilot-ready**. Next product work: live payments, then SMS.
