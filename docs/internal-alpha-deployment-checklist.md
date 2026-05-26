# Internal Alpha Deployment Checklist

Use this checklist before and after deploying Altair OS to a private Vercel project for internal alpha testing.

## Deployment target

- **Platform:** Vercel (private project, invite-only team access)
- **Database:** Supabase project with all repo migrations applied
- **Audience:** Internal testers only — not public launch

---

## 1. Vercel environment variables

Set these in **Project Settings → Environment Variables**.

### Required (Production + Preview)

| Variable | Scope | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | Supabase project URL. Safe for browser. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Supabase anon/public key. Safe for browser. |

### Recommended

| Variable | Scope | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_ALPHA_HARDENING` | Preview (optional) | Set to `true` on Preview if you want alpha nav/Coming Soon behavior before Production. **Production enables alpha hardening automatically** via `NODE_ENV=production`. |

### Optional (not required for web app runtime)

| Variable | Scope | Notes |
|----------|-------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Development only (local) | Used by local workflow scripts. **Do not add to Vercel** unless you have a specific server-only need. Never expose to the browser. |

### Verify after deploy

- [ ] Production build succeeds (`npm run build`)
- [ ] `/settings/system-check` loads for a company **owner** and shows passing checks
- [ ] No secret values appear in client bundles or the system-check UI

---

## 2. Supabase Auth redirect URLs

Configure in **Supabase Dashboard → Authentication → URL Configuration**.

Replace `<PRODUCTION_DOMAIN>` with your Vercel production domain (e.g. `altair-os.vercel.app` or custom domain).

### Site URL

```
https://<PRODUCTION_DOMAIN>
```

### Redirect URLs (add all that apply)

Production:

```
https://<PRODUCTION_DOMAIN>/auth/callback
https://<PRODUCTION_DOMAIN>/login
https://<PRODUCTION_DOMAIN>/signup
https://<PRODUCTION_DOMAIN>/setup
```

Preview deployments (if testing PR previews):

```
https://*-<team-slug>.vercel.app/auth/callback
https://*-<team-slug>.vercel.app/login
https://*-<team-slug>.vercel.app/signup
https://*-<team-slug>.vercel.app/setup
```

Or add specific preview URLs as needed:

```
https://<preview-deployment>.vercel.app/auth/callback
```

### Email confirmation

If Supabase email confirmation is enabled:

- [ ] Confirmation emails redirect to a URL on your deployed domain
- [ ] `/auth/callback` is listed in Redirect URLs
- [ ] Test signup → email confirm → login → `/setup` or dashboard

---

## 3. Supabase Site URL

The **Site URL** must match your primary deployed origin:

```
https://<PRODUCTION_DOMAIN>
```

This affects auth email links and default redirects. Update it whenever the production domain changes.

---

## 4. `company-files` storage bucket

Migration: `supabase/migrations/021_job_attachments_foundation.sql`

- [ ] Bucket `company-files` exists in Supabase Storage
- [ ] Storage policies allow authenticated company members to read/write within their company prefix
- [ ] System check passes **company-files storage bucket** for an owner session
- [ ] Manual test: upload an expense receipt and a job attachment

---

## 5. `bootstrap_company_for_new_user` RPC

Migration: `supabase/migrations/031_setup_profile_rls_recursion_fix.sql` (and original in `003_auth_bootstrap.sql`)

- [ ] RPC exists in Supabase SQL editor / schema
- [ ] System check passes **bootstrap_company_for_new_user RPC** (read-only probe)
- [ ] Manual test: new user signup → company bootstrap → lands on dashboard or `/setup`

---

## 6. Production migration status

The repo currently contains **33** migrations through:

```
033_membership_activities_foundation.sql
```

- [ ] All migrations applied to the Supabase project (`supabase db push` or CI pipeline)
- [ ] System check passes **Production migration status** (membership_activities marker)
- [ ] No pending migration drift between repo and Supabase

**RLS note:** Do not modify RLS migrations for alpha deploy unless fixing a verified blocker. Document any RLS-related failures in launch blockers.

---

## 7. Alpha hardening env flag

Alpha hardening is **on by default in production** (`NODE_ENV=production`).

When enabled:

- `/network` is hidden from nav and shows Coming Soon if visited directly
- `/estimates` and `/price-book` show Coming Soon
- Post-login redirects avoid coming-soon destinations
- Admin shell shows a subtle **Internal Alpha** banner

Checklist:

- [ ] Production deploy shows Internal Alpha banner in admin shell
- [ ] Hidden nav items are not visible in sidebar/mobile nav
- [ ] Direct URLs to `/estimates`, `/price-book`, `/network` show Coming Soon (not broken pages)
- [ ] Optional: set `NEXT_PUBLIC_ALPHA_HARDENING=true` locally to mirror production behavior

---

## 8. Preview vs production deploy expectations

| Area | Preview | Production |
|------|---------|------------|
| Alpha hardening | Only if `NEXT_PUBLIC_ALPHA_HARDENING=true` | Always on (`NODE_ENV=production`) |
| Supabase env vars | Must be set on Preview | Must be set on Production |
| Auth redirect URLs | Preview URLs must be in Supabase allowlist | Production URLs must be in allowlist |
| Data | Same Supabase project (typical) or isolated project | Primary internal alpha data |
| System check | Owner-only at `/settings/system-check` | Same |
| Audience | Engineers / QA on PR branches | Internal alpha testers |

### Preview deploy workflow

1. Push branch → Vercel Preview URL generated
2. Add preview callback URL to Supabase if not using wildcard
3. Run smoke tests on preview before promoting to production

### Production deploy workflow

1. Merge to main → Vercel Production deploy
2. Run `/settings/system-check` as owner
3. Run `docs/internal-alpha-smoke-test.md` checklist
4. Share URL only with invited internal testers

---

## 9. Post-deploy verification (quick)

- [ ] Owner can open `/settings/system-check` — all critical checks pass
- [ ] Login / signup / setup flow works end-to-end
- [ ] Technician account routes to `/technician`
- [ ] Admin account routes to `/` dashboard
- [ ] No console errors on dashboard load

---

## 10. Known launch blockers to watch

Document and triage any failures here during alpha:

- [ ] Supabase Auth redirect mismatch (login loop or callback error)
- [ ] Missing migrations (schema errors in UI or system check)
- [ ] Storage bucket missing (receipt/attachment upload failures)
- [ ] Bootstrap RPC missing (signup/setup stuck)
- [ ] Email confirmation misconfigured (signup cannot complete)
- [ ] Profile email vs auth email mismatch blocking invites

---

## Related docs

- Smoke test checklist: `docs/internal-alpha-smoke-test.md`
- In-app checks: `/settings/system-check` (owner only)
