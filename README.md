# CampusOne

Multi-tenant school platform — register your school, invite teachers/students/parents, and run attendance, grades, and announcements in one place.

**Repo:** https://github.com/yafetpromedia/campusone

## Workspaces

| Path | Description |
|------|-------------|
| `apps/web` | Next.js web portal |
| `apps/api` | NestJS API + Prisma |
| `packages/*` | Shared UI and types |
| `infra` | Docker Compose for local services |
| `docs` | Architecture notes |

## First-time setup

### 1. Clone and install

```powershell
git clone https://github.com/yafetpromedia/campusone.git
cd campusone
npm install
```

### 2. PostgreSQL

Create database **`edu_os`** in pgAdmin (or `psql`). See **[SETUP-POSTGRES.md](./SETUP-POSTGRES.md)** for connection details.

Copy env templates and set your password:

```powershell
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env.local
```

Edit `apps/api/.env` — set `DATABASE_URL` (encode `!` in passwords as `%21`).

Example (port **8000** on this project’s Windows setup):

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:8000/edu_os?schema=public
PORT=3001
WEB_APP_URL=http://localhost:3000
```

### 3. Database schema

```powershell
cd apps\api
npm run db:setup
```

### 4. Run the app

From the repo root:

```powershell
npm run dev:clean
```

- Web: http://localhost:3000  
- API health: http://localhost:3001/health  

**Windows tips:** [SETUP-WINDOWS.md](./SETUP-WINDOWS.md) (port conflicts, pgAdmin).

### 5. Optional — Google sign-in

In `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

## Demo login

| Email | Password | Role |
|-------|----------|------|
| `admin@eduos.local` | `Passw0rd!` | Admin |
| `teacher@eduos.local` | `Passw0rd!` | Teacher |
| `student@eduos.local` | `Passw0rd!` | Student |
| `parent@eduos.local` | `Passw0rd!` | Parent |

School join code for `/join`: **`BRIGHT1`**

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Web + API (concurrent) |
| `npm run dev:clean` | Free ports 3000/3001, then dev |
| `npm run ports:free` | Kill processes on dev ports |
| `npm run lint` | Lint workspaces |
| `npm run test:e2e --workspace apps/api` | API e2e tests |

## Prisma

- Dev migrate: `npm run prisma:migrate:dev --workspace apps/api`
- Deploy migrate: `npm run prisma:migrate:deploy --workspace apps/api`
- Bootstrap: `npm run db:bootstrap --workspace apps/api`

## Security note

Never commit `.env` or `.env.local` — they are gitignored. Use `.env.example` files as templates only.
