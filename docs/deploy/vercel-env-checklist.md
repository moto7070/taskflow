# Vercel Environment Checklist

Use this checklist before production release (`T190`).

## Required Variables

### Public (`NEXT_PUBLIC_*`)
- `NEXT_PUBLIC_APP_URL`
  - Production: `https://taskflow-dusky-eight.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL`
  - `https://<project-ref>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Supabase publishable key (`sb_publishable_...`) or anon key
  - Never use service role / secret keys

### Server-only (must NOT be `NEXT_PUBLIC_*`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `INVITE_EMAIL_FROM`
- `INVITE_EMAIL_REPLY_TO` (optional)
- `CSRF_TRUSTED_ORIGINS`

## Security Rules
- Do not define `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.
- Do not store Stripe secret keys in `NEXT_PUBLIC_*`.
- Keep secret keys only in Vercel server-side env scopes.

## CSRF Trusted Origins
- Include production app origin:
  - `https://taskflow-dusky-eight.vercel.app`
- Include preview origin only if needed.

## Verification
- Redeploy after env updates.
- Confirm auth flows:
  - Email signup/login
  - Google login callback
- Confirm mutating APIs do not fail CSRF in production.
