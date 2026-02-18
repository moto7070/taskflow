# Error Handling Policy

## Goal
- Never expose raw internal errors (database/storage/provider details) to end users.
- Keep actionable diagnostics in server logs only.

## Rules
- Route Handlers and Server Actions must return a safe, fixed fallback message.
- Use `toPublicErrorMessage(error, fallback)` for all `500`-class responses and action redirects.
- Do not return `error.message`, stack traces, SQL text, or provider internals in JSON or query params.
- Non-sensitive validation/auth errors (`400/401/403/404`) may remain explicit.

## Implementation
- Shared helper: `src/lib/server/error-policy.ts`
- Current behavior:
  - Logs internal error with `console.error("[TaskFlow][ServerError]", error)`
  - Returns caller-provided fallback message

## Operations
- For debugging, use server logs (Vercel + Supabase logs), not client-visible messages.
- If more traceability is needed later, add request IDs/correlation IDs in logs and return only that ID to clients.
