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

## Use on your phone (same Wi‑Fi as this PC)

CampusOne is a **website** — open it in **Chrome or Safari** on your phone. It is responsive and works for login, attendance scan, ID cards, etc.

`http://localhost:3000` only works on the computer running the app. On your phone, use your PC’s **LAN IP** (same Wi‑Fi).

1. Find your PC IP (PowerShell):
   ```powershell
   ipconfig
   ```
   Use the **IPv4 Address** under Wi‑Fi (example: `192.168.1.42`).

2. Edit `apps/web/.env.local` (create from `.env.example` if needed):
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://192.168.1.9:3001
   ```
   Replace `192.168.1.9` with your real IP.

3. If the login page is **blank** (nav only), set your IP in `apps/web/next.config.ts` → `LAN_DEV_ORIGIN` (already `192.168.1.9` by default) — Next.js 16 blocks `/_next/*` from LAN until `allowedDevOrigins` is set.

4. Restart dev:
   ```powershell
   npm run dev:clean
   ```

5. On your phone’s browser open:
   ```text
   http://192.168.1.9:3000/login
   ```
   School login: `/login` · Platform: `/platform/login`

6. If login still fails, run `npm run ports:free` then `npm run dev:clean` (fixes API `EADDRINUSE` on 3001). Allow **Windows Firewall** for ports **3000** and **3001** on private networks.

**Note:** Your phone must stay on the **same Wi‑Fi** as the PC. For access from anywhere (not just home Wi‑Fi), deploy to a public server or use a tunnel (e.g. ngrok) later.
