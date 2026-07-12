# Altair OS contributor guide

<!-- BEGIN:nextjs-agent-rules -->
## This is not the Next.js you know

This project uses Next.js 16.2.6, React 19.2.4, and the App Router. This version has breaking changes: APIs, conventions, and file structure may differ from prior versions. Before changing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` and heed its deprecation notices.
<!-- END:nextjs-agent-rules -->

## Architecture overview

Altair OS is a multi-tenant field-service SaaS. Next.js is both the UI framework and the backend-for-frontend; there is no separate application server in this repository.

- App Router pages and layouts are Server Components by default.
- Interactive UI is implemented with Client Components marked `"use client"`.
- Mutations are Next.js Server Actions under `app/actions/`.
- Public and integration HTTP endpoints are Route Handlers under `app/api/` and `app/auth/callback/`.
- Server-side business logic and integrations live under `lib/`.
- Supabase provides PostgreSQL, authentication, row-level security, and storage. The normal server/browser clients use the anon key and the authenticated user's session. A server-only service-role client exists for explicitly authorized administrative and automation work.
- The active company context combines the authenticated user, profile, membership, company, role, and permission map. Database operations are scoped by company ID and backed by Supabase RLS.
- Vercel is the intended deployment platform. `vercel.json` configures the workflow-reminder cron endpoint.

Typical request flow:

1. The request boundary refreshes the Supabase session and handles basic redirects.
2. A route layout/page performs user and active-company checks.
3. Server Components call `lib/database/` queries and services.
4. Client Components invoke authorized Server Actions for mutations.
5. Supabase RLS remains the final tenant boundary.

## Important directories

- `app/`: route tree, layouts, pages, Route Handlers, and Server Actions.
- `app/(admin)/`: authenticated office/admin product surfaces.
- `app/(auth)/`: login, signup, password recovery, and reset flows.
- `app/technician/`: current database-backed technician experience.
- `app/tech/`: older technician routes; the root still uses mock dashboard data.
- `app/actions/`: mutation boundary. Actions must authenticate, resolve company context, check permissions, validate input, and revalidate affected routes as appropriate.
- `lib/database/`: company context, access control, typed queries, domain services, revalidation helpers, and database types.
- `lib/supabase/`: browser, server-cookie, request-boundary, and service-role Supabase clients.
- `lib/auth/`: authentication operations, callback routing, invitations, and safe redirects.
- `lib/ai/`, `lib/email/`, `lib/payments/`, `lib/sms/`, `lib/integrations/`: server-side external-service integrations.
- `shared/components/`: reusable UI grouped by product domain. North Star variants are colocated in domain-specific `north-star-*` folders.
- `shared/design-system/`: tokens, shell, signature, components, and design-system documentation.
- `shared/types/`: domain models, validation/normalization helpers, and action-facing types.
- `shared/data/`: legacy/sample mock data; do not assume it is production data.
- `supabase/migrations/`: ordered PostgreSQL schema, RLS, function, trigger, and grant migrations.
- `public/`: static assets, PWA files, import templates, and marketing screenshots.
- `scripts/`: integration smoke scripts and local asset/screenshot tooling.
- `docs/altair/ALTair_MASTER_STATUS.md`: current product-state source of truth.
- `docs/altair/ALTair_BRAIN.md`: confirmed architecture and production-module inventory.
- `docs/internal-alpha-smoke-test.md`: manual authenticated smoke checklist.

The root `README.md`, `ARCHITECTURE.md`, `supabase/DATA_MODEL.md`, and `docs/backend-data-map.md` contain template, early-phase, or explicitly outdated material. Verify their claims against current code and the status documents above.

## Installation and development

```bash
npm install
npm run dev
```

The development server normally runs at `http://localhost:3000`.

Production startup:

```bash
npm run build
npm run start
```

Founder screenshot tooling, when needed:

```bash
npm run capture:founder-auth
npm run capture:founder-screenshots
```

## Checks and tests

Run linting:

```bash
npm run lint
```

Run the strict TypeScript check without emitting files:

```bash
npx tsc --noEmit
```

Run the production build:

```bash
npm run build
```

There is no general `npm test` command or configured Jest/Vitest/Cypress suite. The repository contains these targeted integration/smoke scripts:

```bash
node scripts/test-expense-workflow.mjs
node scripts/test-workflow-reminder-evaluation.mjs
node scripts/test-workflow-reminder-dashboard.mjs
```

These scripts require local environment configuration, connect to Supabase, and may create or modify test data. Inspect the script and confirm the target environment before running it. Use `docs/internal-alpha-smoke-test.md` for the manual end-to-end production workflow.

## Coding conventions

- TypeScript is strict and uses the `@/*` alias for project-root imports.
- Use App Router file conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, and `route.ts`.
- Keep components server-side unless browser APIs, client state, event handlers, or client hooks require `"use client"`.
- Put mutations in focused `"use server"` action modules under `app/actions/`.
- Treat every Server Action and Route Handler as a public security boundary. Resolve the user/company context and check the required permission in the action itself; hiding a UI control is not authorization.
- Keep database reads/writes in `lib/database/queries/` or `lib/database/services/`, not embedded throughout presentation components.
- Scope tenant-owned database operations with `company.id` from the active company context.
- Use the centralized access-control and role helpers instead of duplicating role-name checks.
- Validate and normalize action inputs with the domain helpers in `shared/types/` or `shared/lib/`.
- Return typed action-result objects for expected user-facing failures; existing actions commonly use `{ error?: string }`-style results.
- After successful mutations, revalidate every affected route with `revalidatePath` where the existing data flow requires it.
- Use `import "server-only"` in modules that handle secrets or privileged integrations.
- Use the Supabase browser client only in client-side code, the server-cookie client for user-scoped server work, and the service-role client only after explicit application authorization.
- Preserve existing loading, error, and not-found boundaries when adding routes.
- Reuse domain components and design-system primitives before adding another parallel component pattern.

## Do not edit manually

- `node_modules/`: installed dependency output, including the bundled Next.js documentation.
- `.next/`: generated development/build output.
- `next-env.d.ts`: generated by Next.js and ignored by Git.
- `tsconfig.tsbuildinfo`: generated TypeScript incremental-build state and ignored by Git.
- `.vercel/`: local Vercel metadata.
- `.playwright/founder-auth.json`: generated local authentication state that may contain session credentials.
- Generated PWA PNGs under `public/icons/`: regenerate them with `node scripts/generate-pwa-icons.mjs` when changing their SVG source.
- Existing applied SQL migrations: add a new ordered migration for schema/RLS/grant changes rather than rewriting database history.

Do not commit `.env.local`, Playwright auth state, build output, credentials, access tokens, service-role keys, webhook secrets, or customer data.

## Security and environment precautions

- Base Supabase configuration uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Only variables intentionally prefixed with `NEXT_PUBLIC_` may be exposed to browser code. Never expose `SUPABASE_SERVICE_ROLE_KEY`, Stripe secrets, Resend keys, OpenAI keys, Twilio credentials, `CRON_SECRET`, integration encryption keys, or OAuth client secrets.
- Use `.env.example` as a starting point, but verify integration-specific variables against the corresponding `lib/*/env.ts` module because the example does not list every supported variable.
- The service-role client bypasses RLS. Use it only in server-only code after the caller and operation have been authorized.
- Public estimate approvals, invoice-payment tokens, webhooks, auth callbacks, and cron handlers are unauthenticated/public entry points and require their token, signature, or secret checks to remain intact.
- Preserve safe redirect sanitization in authentication and invite flows.
- Do not log secrets, raw tokens, payment details, auth storage state, or customer data.
- Confirm the target Supabase project and Stripe mode before running scripts or workflows that mutate external systems.

## Definition of done

A change is complete when all applicable items are true:

- The implementation follows the installed Next.js documentation and existing server/client boundaries.
- Authentication, active-company resolution, permissions, tenant scoping, validation, and RLS implications have been addressed for every new read or mutation.
- Expected failures produce safe, typed, user-facing results without leaking sensitive details.
- Affected loading, empty, error, not-found, mobile, and North Star/legacy states have been considered.
- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npm run build` passes for changes that can affect compilation, routing, rendering, or deployment.
- Relevant targeted scripts and the applicable sections of `docs/internal-alpha-smoke-test.md` have been run when the change touches their workflows.
- New configuration is documented in `.env.example` without real values, and secrets remain server-only.
- Database changes are delivered as a new ordered migration with appropriate RLS, grants, and typed application updates.
- Current source-of-truth documentation is updated when architecture, production status, setup, commands, routes, or operational procedures change.
- No generated output, credentials, local auth state, or unrelated user changes are included in the diff.
