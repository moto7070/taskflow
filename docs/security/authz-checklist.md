# Authorization Checklist

Last updated: 2026-02-18

## Scope
- API Route Handlers under `src/app/api/**/route.ts`
- Server Actions under `src/lib/server/team-actions.ts`
- Protected UI routing via `src/app/(protected)/layout.tsx`

## Checklist Items
- [x] Every mutating API (`POST/PATCH/DELETE`) checks authenticated user.
- [x] Project-scoped APIs validate membership or team-admin fallback.
- [x] Team management actions require admin role.
- [x] Comment edit/delete/attachment delete are restricted to author where required.
- [x] Protected routes redirect unauthenticated users to `/auth/login`.
- [x] Placeholder API `upload/sign` now enforces auth before returning `501`.

## Reviewed Endpoints
- `src/app/api/tasks/route.ts`
- `src/app/api/tasks/reorder/route.ts`
- `src/app/api/tasks/[taskId]/route.ts`
- `src/app/api/tasks/[taskId]/subtasks/route.ts`
- `src/app/api/tasks/[taskId]/subtasks/[subtaskId]/route.ts`
- `src/app/api/tasks/[taskId]/comments/route.ts`
- `src/app/api/tasks/[taskId]/comments/[commentId]/route.ts`
- `src/app/api/tasks/[taskId]/comments/[commentId]/reactions/route.ts`
- `src/app/api/tasks/[taskId]/comments/[commentId]/attachments/route.ts`
- `src/app/api/tasks/[taskId]/comments/[commentId]/attachments/[attachmentId]/route.ts`
- `src/app/api/projects/[projectId]/wiki/route.ts`
- `src/app/api/projects/[projectId]/wiki/[pageId]/route.ts`
- `src/app/api/mentions/route.ts`
- `src/app/api/notifications/route.ts`
- `src/app/api/notifications/read-all/route.ts`
- `src/app/api/notifications/[notificationId]/route.ts`
- `src/app/api/upload/sign/route.ts`
- `src/lib/server/team-actions.ts`

## Follow-up
- Add rate-limit controls per sensitive endpoint (`T151`).
- Define CSRF policy and apply where needed (`T152`).
- Standardize error response envelope across all handlers (`T153`).
