# Session Close Checklist

Use at the end of any meaningful Altair engineering session.

## Documentation Sync

- [ ] If product state changed, update `docs/product/ALTair_MASTER_STATUS.md`
- [ ] If sprint scope changed, update `docs/product/ALTair_CURRENT_SPRINT.md`
- [ ] If a production module shipped or changed status, update `docs/product/ALTair_BRAIN.md`
- [ ] If experience-layer phases changed, update `docs/product/ALTair_V2_ROADMAP.md` (future only) and shell migration notes in `docs/design/ALTAIR_EXPERIENCE_MAP.md` if needed
- [ ] Append a dated entry to `docs/development/ALTAIR_SESSION_LOG.md` for meaningful milestones
- [ ] Remove duplicate status paragraphs — reference the appropriate source document instead

## Verification

- [ ] Run `npm run build` (or at minimum `npx tsc --noEmit` if build is slow)
- [ ] Fix any type errors introduced in this session
- [ ] Confirm no secrets or env files staged for commit

## Git Hygiene

- [ ] Review `git status` — working tree should be clean before ending session (or changes explicitly committed)
- [ ] Do not commit unless requested; if committing, stage only intentional files
- [ ] Do not push unless requested

## Handoff

- [ ] Note any blockers or smoke failures for the next session
- [ ] If beta-critical, flag whether `docs/reference/internal-alpha-smoke-test.md` needs a re-run
