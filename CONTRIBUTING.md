# Contributing

## Branch Strategy
- `main`: production-ready branch. Direct pushes should be avoided when possible.
- `feature/<ticket-or-topic>`: feature implementation branch.
- `fix/<ticket-or-topic>`: bug fix branch.
- `chore/<topic>`: maintenance branch (deps, docs, CI, etc.).

## Pull Request Rules
1. Keep each PR focused on one task.
2. Rebase or merge `main` before opening PR if your branch is behind.
3. Make sure CI is green (`lint`, `typecheck`, `test`).
4. Fill all required sections of the PR template.
5. For DB/Auth/RLS related changes, describe migration impact and rollback plan.

## Local Checks Before PR
```bash
npm run lint
npm run typecheck
npm run test
```
