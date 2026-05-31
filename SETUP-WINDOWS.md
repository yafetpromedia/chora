# CampusOne — Windows setup

This project uses **PostgreSQL** (pgAdmin). See **[SETUP-POSTGRES.md](./SETUP-POSTGRES.md)** for full steps.

## Port already in use (`EADDRINUSE` / "Another next dev server")

You started the app twice. Free the ports, then start again:

```powershell
cd C:\xampp\htdocs\school\edu-os
npm run ports:free
```

Or manually:
```powershell
taskkill /PID 9132 /F   # use the PID shown in your terminal
```

Then start **one** API terminal and **one** web terminal (not multiple).

```powershell
npm run dev:clean
```
starts both after clearing ports 3000 and 3001.

## Quick start

1. In pgAdmin: create database **`edu_os`** on **Local Postgres** (port **8000** on this PC)
2. Edit `apps/api/.env` — set your postgres password in `DATABASE_URL`
3. Run:
   ```powershell
   cd apps\api
   npm run db:setup
   npm run dev
   ```
4. In another terminal:
   ```powershell
   cd apps\web
   npm run dev
   ```
5. Open http://localhost:3000/login

**School portal:** `admin@eduos.local` / `Passw0rd!`  
**Platform admin:** http://localhost:3000/platform/login — `platform@campusone.local` / `Passw0rd!`

See [docs/WHAT-WE-HAVE.md](./docs/WHAT-WE-HAVE.md) for a full feature list.  
See [docs/ACADEMIC-ENGINE.md](./docs/ACADEMIC-ENGINE.md) for results, workflow, and report cards.  
See [docs/TENANT-ARCHITECTURE.md](./docs/TENANT-ARCHITECTURE.md) for the 2-layer SaaS model.

## After pulling permission / schema updates

If the API shows many TypeScript errors (`roleTemplate does not exist`, `UserRole.staff` missing), the Prisma client is stale. **Stop dev servers first**, then regenerate:

```powershell
cd C:\xampp\htdocs\school\edu-os
npm run ports:free
cd apps\api
npx prisma generate
npx prisma db push
cd ..\..
npm run dev:clean
```

`EPERM` on `prisma generate` almost always means port 3001 is still running — run `npm run ports:free` again.

Log out and log in again so your JWT includes `permissions` and `roleTemplateSlug`.
