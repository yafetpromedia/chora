# CampusOne Tenant Architecture

## Two layers

| Layer | Who | URL (dev) | API prefix |
|-------|-----|-----------|------------|
| **Platform** | CampusOne team | `/platform` | `/platform/*` |
| **School (tenant)** | Schools | `/admin`, `/teacher`, `/parent` | `/schools`, `/attendance`, … |

## Tenant isolation rule

Every school user JWT includes:

```json
{
  "scope": "school",
  "schoolId": "school_abc123",
  "role": "admin"
}
```

Platform JWT:

```json
{
  "scope": "platform",
  "role": "OWNER"
}
```

## Enforcement (backend)

1. **`JwtAuthGuard`** — validates token
2. **`SchoolTenantGuard`** — school routes only; blocks cross-`schoolId`; rejects suspended schools
3. **`PlatformGuard`** — platform routes only
4. **Services** — all queries filter by `schoolId` from the authenticated user

## Database

- Shared PostgreSQL database
- Row-level isolation via `schoolId` on `User`, `StudentProfile`, fees, attendance, etc.
- `PlatformUser` table is separate (no `schoolId`)

## Permissions

School staff use `staffRole` + JWT `permissions[]`. See [PERMISSIONS.md](./PERMISSIONS.md) and [PRODUCT-ROADMAP.md](./PRODUCT-ROADMAP.md).

## Demo logins

| Portal | Email | Password |
|--------|-------|----------|
| Platform | `platform@campusone.local` | `Passw0rd!` |
| School admin | `admin@eduos.local` | `Passw0rd!` |

## Production URLs (target)

- `admin.campusone.com` → Platform login
- `app.campusone.com` → School register / login
- Per-school subdomain (optional later): `bright.campusone.com`
