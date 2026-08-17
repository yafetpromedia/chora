# Troubleshooting

Common issues when running CampusOne locally or in a pilot.

---

## Login: “NetworkError when attempting to fetch resource”

**Symptom:** Red error on `/login` when entering a school code and clicking **Continue**.

**Cause:** The browser could not reach the API (port 3001).

**Fix:**

1. Ensure both servers are running from the repo root:
   ```powershell
   npm run dev
   ```
   Or after port conflicts:
   ```powershell
   npm run dev:clean
   ```

2. Check API health:
   ```powershell
   npm run health
   ```
   Expected: JSON response from `http://localhost:3001/health`.

3. **Hard refresh** the login page (Ctrl+Shift+R).

4. In development, the web app proxies API calls through `/backend/*` on the same origin (port 3000). You do not need to open port 3001 in the browser manually.

5. If using a **LAN IP** (phone testing), add your IP to `allowedDevOrigins` in `apps/web/next.config.ts` or set `NEXT_PUBLIC_LAN_ORIGIN` in `apps/web/.env.local`.

---

## Port 3000 or 3001 already in use

**Symptom:** `EADDRINUSE` or dev server fails to start.

**Fix:**

```powershell
npm run ports:free
npm run dev
```

Or use the combined command:

```powershell
npm run dev:clean
```

See [SETUP-WINDOWS.md](../SETUP-WINDOWS.md) for details.

---

## Database connection failed

**Symptom:** API crashes on start with Prisma / PostgreSQL errors.

**Checklist:**

1. PostgreSQL is running (pgAdmin or Windows service).
2. Database `edu_os` exists.
3. `apps/api/.env` has a valid `DATABASE_URL`.
4. Special characters in passwords must be URL-encoded (`!` → `%21`).

Example (port 8000 on this project’s Windows setup):

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:8000/edu_os?schema=public
```

5. Apply schema:
   ```powershell
   cd apps\api
   npm run db:setup
   ```

See [SETUP-POSTGRES.md](../SETUP-POSTGRES.md).

---

## Migrations fail / drift

**Symptom:** `prisma migrate deploy` errors on old migration history.

**Fix:** Use the project’s sync script (migrate deploy with fallback to db push):

```powershell
npm run db:sync --workspace apps/api
```

For a **fresh dev database**, you can reset in pgAdmin (drop/recreate `edu_os`) then run `db:setup` again.

---

## Invalid school code

**Symptom:** “Invalid school code” (not a network error).

**Fix:** Use the demo code **`BRIGHT1`** or the code shown in **Admin → Settings → School profile**. Codes are case-insensitive but stored uppercase.

---

## Student cannot see results

**Checklist:**

1. Admin has **published** the subject sheet (workflow: DRAFT → SUBMITTED → APPROVED → **PUBLISHED**).
2. Student is viewing the correct **term**.
3. Parent: student has not disabled **“Allow parents to see my results”** in Profile.

---

## Attendance shows 100% with few students marked

Fixed in recent versions: rate = **present ÷ enrolled**; unmarked students count as absent. Restart API if you see old behavior.

---

## Next.js stale cache / weird UI after git pull

```powershell
npm run web:cache:clear
npm run dev
```

---

## Still stuck?

1. Check terminal output for `[1]` (API) and `[0]` (web) errors.
2. Read [DEVELOPER-GUIDE.md](./DEVELOPER-GUIDE.md) for architecture context.
3. Open an issue with: OS, Node version (`node -v`), exact error message, and steps to reproduce.
