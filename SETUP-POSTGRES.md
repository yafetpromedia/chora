# CampusOne — PostgreSQL (your machine)

## Already configured for you

| Setting | Value |
|---------|--------|
| Server | PostgreSQL 18 (`Local Postgres` in pgAdmin) |
| Host | `127.0.0.1` |
| Port | **`8000`** (not 5432 — see `postgresql.conf`) |
| Database | `edu_os` |
| User | `postgres` |
| Password | `CampusOne2026!` |

**pgAdmin:** connect with the password above on port **8000**.

**API env** (`apps/api/.env`):
```env
DATABASE_URL=postgresql://postgres:CampusOne2026%21@127.0.0.1:8000/edu_os?schema=public
```
(`%21` is `!` in the URL)

Tables were created with `prisma db push`. Demo users are seeded when the API starts.

## Start the app

```powershell
# Terminal 1 — API
cd C:\xampp\htdocs\school\edu-os\apps\api
npm run dev

# Terminal 2 — Web
cd C:\xampp\htdocs\school\edu-os\apps\web
npm run dev
```

## Demo login

- http://localhost:3000/login
- `admin@eduos.local` / `Passw0rd!`
- Join code: `BRIGHT1` at `/join`

## If PostgreSQL service stops

Windows Services → **postgresql-x64-18** → Start

Or PowerShell (Admin):
```powershell
Start-Service postgresql-x64-18
```
