# Release Smoke Checklist

Use this for `T191` after each production deploy.

## Preconditions
- Production URL is reachable.
- Vercel env vars are set per `docs/deploy/vercel-env-checklist.md`.

## Smoke Flows
1. Public pages
- `/` opens without error.
- `/auth/signup` and `/auth/login` render correctly on desktop/mobile widths.

2. Auth
- Email signup can send verification mail.
- Email login succeeds.
- Google login succeeds and returns to app.
- Logout returns to login page.

3. Dashboard and Team
- `/app` loads teams/projects without server errors.
- Team creation works.
- Project creation works.
- Member invite creation works.
- Role update / member removal works.

4. Board and Task
- Board page opens.
- Card drag-and-drop persists after refresh.
- Task detail update works.
- Comment, reply, reaction, attachment work.

5. Wiki
- Wiki page list loads.
- Create/edit/delete wiki page works.

6. Notifications
- Mention creates notification.
- Notification read and read-all actions work.

7. Security sanity checks
- Mutating actions fail when unauthenticated.
- No raw internal error detail is displayed to user.
- Sensitive keys are not exposed in browser-side env.

## Logging
- Record results in `docs/ops-log.md` with date and pass/fail notes.
