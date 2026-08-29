/**
 * Every Storage object belonging to one company.
 *
 * ===================== THE DEFECT THIS REPLACES =====================
 * purge-company.mjs used to find a tenant's files with a single call:
 *
 *     admin.storage.from(bucket).list(companyId, { limit: 1000 })
 *
 * That is wrong in three independent ways, and the combination deleted nothing
 * at all while reporting success.
 *
 *   1. THE PREFIX IS GUESSED. `company-files` keys are built by
 *      buildJobAttachmentStoragePath and buildExpenseReceiptStoragePath as
 *      `company/<companyId>/...`. Listing `<companyId>` lists a top-level
 *      folder that does not exist, and returns zero entries.
 *
 *   2. list() IS NOT RECURSIVE. It returns one directory. `marketing-media`
 *      keys are `<companyId>/video/<name>`, so listing `<companyId>` returns
 *      the FOLDER `video` — an entry with no metadata, not an object.
 *
 *   3. IT CAPS AT 1,000. Even with the right prefix and a flat layout, a tenant
 *      with more than a thousand files kept the rest.
 *
 * The purge then called remove(["<companyId>/video"]). Removing a folder prefix
 * returns **no error and removes nothing** — verified against a live bucket. So
 * the run logged "removed 1", deleted the company row, and marked the request
 * purged while every job attachment and expense receipt remained, now with no
 * owning row to find them by.
 *
 * ===================== WHY PREFIXES ARE DECLARED, NOT GUESSED =====================
 * Each entry below names the shipped builder that produces its keys. A bucket
 * whose layout changes has to change here too, and the purge refuses to finish
 * unless a final listing comes back empty — so a prefix that stops matching
 * fails loudly instead of silently sparing the files.
 */

/**
 * Buckets whose object keys are scoped by company, and the prefix that scopes
 * them. Anything not listed here is deliberately not swept: deleting by a
 * guessed prefix would take another tenant's files.
 */
export const TENANT_STORAGE_PREFIXES = [
  {
    bucket: "company-files",
    // lib/storage/company-files.ts:
    //   buildJobAttachmentStoragePath -> company/<id>/jobs/<jobId>/<attId>/<name>
    //   buildExpenseReceiptStoragePath -> company/<id>/expenses/<expenseId>/<name>
    prefix: (companyId) => `company/${companyId}`,
    source: "buildJobAttachmentStoragePath / buildExpenseReceiptStoragePath",
  },
  {
    bucket: "marketing-media",
    // lib/storage/marketing-media.ts:
    //   buildMarketingMediaObjectKey -> <id>/video/<name>
    prefix: (companyId) => companyId,
    source: "buildMarketingMediaObjectKey",
  },
];

/**
 * Every object under a prefix, walking folders and paging each one.
 *
 * An entry with a null id or no metadata is a folder placeholder, not an
 * object. Storage.list returns one directory at a time and caps at 1,000
 * entries per call, so both the recursion and the offset loop are required.
 */
export async function listObjectsUnderPrefix(admin, bucket, prefix) {
  const found = [];

  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset });
    if (error) {
      throw new Error(`listing ${bucket}/${prefix}: ${error.message}`);
    }
    const entries = data ?? [];

    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null || entry.metadata == null) {
        found.push(...(await listObjectsUnderPrefix(admin, bucket, path)));
      } else {
        found.push(path);
      }
    }

    if (entries.length < 1000) break;
  }

  return found;
}

/**
 * @returns [{ bucket, prefix, objects: string[] }] for every tenant-scoped
 *          bucket. Throws rather than returning a short list, because a
 *          partial answer here becomes a partial deletion.
 */
export async function listTenantStorageObjects(admin, companyId) {
  const plan = [];
  for (const entry of TENANT_STORAGE_PREFIXES) {
    const prefix = entry.prefix(companyId);
    plan.push({
      bucket: entry.bucket,
      prefix,
      objects: await listObjectsUnderPrefix(admin, entry.bucket, prefix),
    });
  }
  return plan;
}

/** Supabase caps a single remove() call; batch rather than discover the limit. */
const REMOVE_BATCH = 100;

/**
 * Delete every listed object, then LIST AGAIN and refuse to report success
 * unless nothing is left.
 *
 * The re-listing is the part that matters. Every failure mode above was silent
 * — a wrong prefix, an unwalked folder, a truncated page and a no-op remove all
 * look identical to "there was nothing to delete". An empty final listing is
 * the only observation that distinguishes them.
 */
export async function deleteTenantStorageObjects(admin, companyId, onProgress) {
  const plan = await listTenantStorageObjects(admin, companyId);
  let removed = 0;

  for (const entry of plan) {
    for (let i = 0; i < entry.objects.length; i += REMOVE_BATCH) {
      const batch = entry.objects.slice(i, i + REMOVE_BATCH);
      const { error } = await admin.storage.from(entry.bucket).remove(batch);
      if (error) {
        throw new Error(`removing from ${entry.bucket}: ${error.message}`);
      }
      removed += batch.length;
    }
    onProgress?.(entry.bucket, entry.objects.length);
  }

  const leftover = await listTenantStorageObjects(admin, companyId);
  const stillThere = leftover.flatMap((entry) =>
    entry.objects.map((path) => `${entry.bucket}/${path}`),
  );
  if (stillThere.length > 0) {
    throw new Error(
      `${stillThere.length} object(s) survived deletion, so this tenant is ` +
        `NOT purged: ${stillThere.slice(0, 5).join(", ")}` +
        (stillThere.length > 5 ? ` (+${stillThere.length - 5} more)` : ""),
    );
  }

  return removed;
}
