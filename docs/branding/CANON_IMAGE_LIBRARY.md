# Canon Image Library

Status: Living Document

## Purpose

This document serves as the master index for every Canon-approved Altair visual asset.

The images themselves live inside the Canon asset folders.

This document only tracks them.

---

## Story Order

| Story | Asset ID | Title | Category | Status |
|--------|----------|-------|----------|--------|
| 000 | [ALT-WLD-001](canon/world/ALT-WLD-001.md) | The Altair World | World | Internal Review |
| 001 | ALT-RES-001 | Morning Residence | Residence | Draft |
| 002 | ALT-RES-002 | Coffee Before Sunrise | Residence | Planned |
| 003 | ALT-SRV-001 | The Day Begins | Service | Planned |
| 004 | ALT-BUS-001 | Morning Dispatch | Business | Planned |

---

## Asset IDs

Every Canon image receives a permanent Asset ID in the form `ALT-{CATEGORY}-{NNN}`.

| Prefix | Category |
|--------|----------|
| ALT-WLD | World |
| ALT-RES | Residence |
| ALT-BUS | Business |
| ALT-SRV | Service |
| ALT-FAM | Family |
| ALT-WEL | Wellness |
| ALT-TRV | Travel |
| ALT-COM | Community |
| ALT-DET | Details |

IDs are reserved permanently. Never recycle an ID, even if an asset is retired or moved to archive.

---

## Story Order

Story numbers define narrative sequence across the Canon, independent of Asset ID.

- `000` is the world-establishing image.
- Subsequent numbers follow the lifestyle and operational arc.
- New entries append to the table; do not renumber existing stories.

---

## Canon Status Levels

| Status | Meaning |
|--------|---------|
| Planned | Approved for production; not yet generated |
| Draft | Generated; under review |
| Canon | Approved for permanent use |
| Archived | Retired from active use; ID retained |

Only `Canon` assets may ship in production marketing surfaces.

---

## Folder Organization

Assets live under `docs/branding/canon/{category}/`.

Each approved image set includes:

1. **Image** — the visual file
2. **Matching Markdown** — caption, usage, and metadata
3. **Prompt History** — generation and revision record
4. **Approval Notes** — review decision and date

Category folders:

| Folder | Holds |
|--------|-------|
| `world/` | Establishing world and environment imagery |
| `residence/` | Home and morning-residence scenes |
| `business/` | Office, dispatch, and operations |
| `service/` | Field and service moments |
| `family/` | Family and household life |
| `wellness/` | Rest, recovery, and balance |
| `travel/` | Movement and journey |
| `community/` | Neighborhood and civic life |
| `details/` | Close-ups, objects, and texture studies |
| `archive/` | Retired Canon assets (IDs preserved) |

---

## Future Expansion

- Add rows to the Story Order table when new Canon candidates are approved for tracking.
- Create matching files under the correct category folder using the Asset ID as the basename.
- Update this index on every status change.
- Consolidate related branding docs into `docs/branding/` only when explicitly planned; this library does not relocate them.
