This repository contains the TaskFlow web app built with Next.js App Router + TypeScript.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Quality Checks

Run all quality checks before creating a PR:

```bash
npm run lint
npm run typecheck
npm run test
```

## Environment Variables

- See `.env.local.example` for local setup.
- For production deployment, follow `docs/deploy/vercel-env-checklist.md`.
- For post-deploy verification, follow `docs/deploy/release-smoke-checklist.md`.
- Important: never expose secret keys as `NEXT_PUBLIC_*`.

## Contribution Workflow

- Branch from `main` using `feature/*`, `fix/*`, or `chore/*`.
- Open a PR to `main` using the repository PR template.
- Ensure GitHub Actions CI is green before merge.
- See `CONTRIBUTING.md` for full rules.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
