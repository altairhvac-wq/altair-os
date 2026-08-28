# tenant-tables.json

Every table that holds one tenant's data: the 63 carrying a `company_id`, plus
`marketing_connected_account_secrets` and `network_invites`, which are scoped
through a parent row instead.

## What it is for

`verify-workspace-export-live` reads this list and fails if any entry is not
classified by `lib/database/services/export/workspace-export-manifest.ts`. That
is the mechanism that keeps the export allow-list honest: a new tenant table
cannot quietly start being exported, and cannot quietly be left out either --
somebody has to decide which, and write down why.

## Regenerating it

It is derived from the live schema, not maintained by hand:

```sql
select table_name
from information_schema.columns
where table_schema = 'public' and column_name = 'company_id'
order by 1;
```

then add the child-scoped tables above. Regenerate whenever a tenant table is
added; the verifier will tell you when that has happened, because the manifest
check will start failing.
