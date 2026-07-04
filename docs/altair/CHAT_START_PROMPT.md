# Chat Start Checklist

Use at the beginning of a meaningful Altair engineering session.

## Orient

- [ ] Read `ALTair_MASTER_STATUS.md` — current product state
- [ ] Read `ALTair_CURRENT_SPRINT.md` — active sprint scope
- [ ] Confirm you are not duplicating work already marked complete in status docs

## Scope

- [ ] Identify whether this session is feature work, experience-layer work, or documentation/hardening
- [ ] If experience-layer: confirm no product logic, routes, server actions, or RLS changes unless explicitly scoped
- [ ] If founder/design work: reference `ALTAIR_ART_DIRECTION.md` and `FOUNDER_MODE.md`

## Environment

- [ ] Pull latest `main` if working from a shared branch
- [ ] Confirm Supabase migrations applied if touching database-dependent features
- [ ] Note whether `NEXT_PUBLIC_NORTH_STAR_SHELL` is relevant to your surface

## Before Writing Code

- [ ] Search the codebase for existing patterns — reuse before inventing
- [ ] Check `ALTair_BRAIN.md` if unsure whether a module already exists in production
