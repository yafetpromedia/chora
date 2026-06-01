# CampusOne eLibrary (Digital Learning Hub)

**Tagline:** *Learn anywhere. Read anytime.*

The eLibrary is a standalone digital hub (not the LMS). It centralizes books, notes, exams, videos, and more for students, teachers, and admins.

## Routes (web)

| Role    | URL                 |
|---------|---------------------|
| Student | `/student/library`  |
| Teacher | `/teacher/library`  |
| Admin   | `/admin/library`    |

## API (`/schools/library`)

- `GET /hub` — categories, featured, recent, stats (admin), student shelf
- `GET /resources` — search (`q`, `categoryId`, `gradeId`, `resourceType`)
- `POST /resources` — create (admin/staff publish; teacher → pending)
- `POST /resources/:id/publish` — approve (requires `library.manage`)
- `POST /upload` — file → `uploads/library/{schoolId}/`
- `GET /files/:schoolId/:filename` — open PDFs/docs
- `POST /resources/:id/favorite` — student saved list
- `PATCH /resources/:id/progress` — reading progress %

## Permissions

| Key              | Who typically has it        |
|------------------|-----------------------------|
| `library.read`   | Admin/staff nav             |
| `library.upload` | Teachers, academic director |
| `library.manage` | Approve, delete, analytics  |

Existing schools may need role permissions refreshed in **Settings → Staff roles** if eLibrary nav is missing.

## Coming soon (UI placeholder)

- AI study assistant (summarize, quiz, Amharic translate)
- Gamification badges
- Cloud storage (S3/MinIO) and cover images (Cloudinary)
