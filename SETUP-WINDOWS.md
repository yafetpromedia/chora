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

Demo: `admin@eduos.local` / `Passw0rd!`
