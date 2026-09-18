# API contract

All JSON under `/api`. Cookie session (`cv_session` HTTP-only). Public routes return sanitized fields only.

## Auth

- `POST /api/auth/google` `{ credential }` — verify Google ID token, upsert user, set cookie
- `POST /api/auth/demo` `{ email }` — hackathon only if `DEMO_AUTH=true`
- `GET /api/auth/me`
- `POST /api/auth/logout`

## Profile & config

- `GET|PATCH /api/users/me`
- `GET /api/config/categories`
- `GET /api/config/zones`
- `GET /api/config/slas`

## Reports & issues

- `POST /api/reports`
- `GET /api/reports/mine`
- `GET /api/reports/:reportId`
- `POST /api/reports/:reportId/evidence` (multipart `file`)
- `GET /api/issues`
- `GET /api/issues/:issueId`
- `GET /api/issues/nearby?lng=&lat=&categoryId=`
- `POST /api/reports/:reportId/attach` `{ issueId }`
- `POST /api/reports/:reportId/create-issue`
- `POST|DELETE /api/issues/:issueId/support`

## Officer

- `GET /api/officer/queue`
- `GET /api/officer/issues/:issueId`
- `POST /api/officer/issues/:issueId/accept`
- `POST /api/officer/issues/:issueId/status` `{ status, message }`
- `POST /api/officer/issues/:issueId/note` `{ message }`
- `POST /api/officer/issues/:issueId/resolution-evidence` (multipart)
- `POST /api/officer/issues/:issueId/resolve` `{ message }`

## Admin

- `GET /api/admin/analytics`
- `GET /api/admin/issues`
- `GET /api/admin/escalated`
- `GET /api/admin/officers`
- `POST /api/admin/officers`
- `PATCH /api/admin/officers/:userId`
- `POST /api/admin/zones`
- `PATCH /api/admin/zones/:zoneId`
- `PATCH /api/admin/config/slas`
- `GET /api/admin/audit`
- `POST /api/admin/reviews/:reportId/decision` `{ decision, message }`

## Public

- `GET /api/public/issues`
- `GET /api/public/issues/:publicId`

## Health

- `GET /api/health`
