# CSRF Policy

Last updated: 2026-02-18

## Background
- TaskFlow uses cookie-based authentication with Supabase SSR.
- State-changing endpoints (`POST/PATCH/DELETE`) must validate request origin to reduce CSRF risk.

## Policy
- For all mutating API Route Handlers, run `verifyCsrfOrigin(req)` before business logic.
- Accept origin only when it matches one of:
  - `NEXT_PUBLIC_APP_URL` origin
  - `CSRF_TRUSTED_ORIGINS` (comma-separated list)
  - `http://localhost:3000` in non-production
- If origin check fails, return `403` with error message.
- In test environment (`NODE_ENV=test`), origin check is bypassed for deterministic automated tests.

## Implemented Targets
- Tasks: create/reorder/update, subtasks update/delete/create
- Comments: create/update/delete/reaction
- Attachments: upload/delete
- Wiki: create/update/delete
- Notifications: mark-read / mark-all-read
- Upload sign placeholder endpoint

## Notes / Limitations
- This policy is focused on API routes.
- Server Actions are protected by Next.js framework mechanisms and same-site cookies, and are not directly covered by `verifyCsrfOrigin`.
- Additional hardening should include:
  - strict `SameSite` cookie settings review
  - rate-limiting + anomaly logging
  - periodic authz/csrf regression tests
