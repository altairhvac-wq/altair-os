# Development Guides

Session workflow, operations/observability foundation, and engineering handoff docs.

## What belongs here

- Chat start / session close checklists
- Historical session log
- Operations logging and execution framework docs

## What does not belong here

- Contributor coding conventions → root [`AGENTS.md`](../../AGENTS.md)
- Product state sources of truth → `docs/product/`
- Launch / QA checklists → `docs/reference/`
- Company philosophy → `docs/foundation/`

## Authority

| Document | Responsibility |
|----------|----------------|
| [`CHAT_START_PROMPT.md`](./CHAT_START_PROMPT.md) | Start-of-session checklist |
| [`SESSION_CLOSE_PROMPT.md`](./SESSION_CLOSE_PROMPT.md) | End-of-session checklist |
| [`ALTAIR_SESSION_LOG.md`](./ALTAIR_SESSION_LOG.md) | Historical session record |
| [`OPERATIONS_FOUNDATION.md`](./OPERATIONS_FOUNDATION.md) | Logger, correlation, error taxonomy |
| [`OPERATIONS_EXECUTION_FRAMEWORK.md`](./OPERATIONS_EXECUTION_FRAMEWORK.md) | Background operation executor |

Pointer stubs remain under `docs/product/` for older links and code `@see` comments.

## Recommended reading order

1. Root `AGENTS.md`
2. `docs/product/ALTair_MASTER_STATUS.md`
3. `CHAT_START_PROMPT.md` / `SESSION_CLOSE_PROMPT.md` as needed
4. Operations docs when touching `lib/operations/`
