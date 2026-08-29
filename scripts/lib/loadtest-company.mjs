/**
 * Resolve the scale fixture a live verifier runs against.
 *
 * ===================== WHY THIS EXISTS =====================
 * Two verifiers each carried the fixture's uuid as a literal default. A uuid is
 * not a stable name: the seeder assigns a new one every time the tenant is
 * rebuilt, so the literal is correct only until someone reseeds. Both had gone
 * stale, and they failed in the two ways a stale fixture id can fail — the
 * worse one first:
 *
 *   - verify-reports-live aborted with "insert or update on company_memberships
 *     violates foreign key constraint", which reads like a schema problem and
 *     is not one.
 *
 *   - verify-integrity-scan-live pointed at a tenant that DID still exist, so
 *     nothing looked wrong at all. Had it been deleted, the scan would have
 *     found no inconsistencies in an empty company and reported them against a
 *     ground truth that also walked nothing. Zero equals zero: 31 checks, all
 *     passing, proving nothing.
 *
 * The slug is the stable name. The seeder derives it from --seed-value, so
 * `loadtest-20260828` means the same fixture no matter how often it is rebuilt.
 */

const SLUG_PREFIX = "loadtest-";

/**
 * The seeder builds its slug as SLUG_PREFIX + --seed-value, so a scale fixture
 * is `loadtest-<digits>` and nothing else.
 *
 * The prefix alone is not specific enough. Other live verifiers create their
 * own short-lived companies under the same prefix —
 * verify-company-deletion-live makes loadtest-deletion-survivor-<suffix> — and
 * a run that overlapped one of those resolved to a 1-job tenant. The minJobs
 * guard refused rather than passing a truncation differential against a
 * company that cannot truncate, which is the guard working; this stops it
 * arising.
 */
const SCALE_SLUG = /^loadtest-\d+$/;

/**
 * @param admin  a service-role Supabase client for the scratch project
 * @param options.slug     an exact slug, when a verifier wants one fixture
 * @param options.minJobs  refuse a tenant smaller than this
 */
export async function resolveLoadtestCompany(admin, options = {}) {
  const { slug = null, minJobs = 0 } = options;

  let query = admin
    .from("companies")
    .select("id, slug, name")
    .like("slug", `${SLUG_PREFIX}%`)
    .order("slug", { ascending: false });

  if (slug) query = query.eq("slug", slug);

  const { data, error } = await query;
  if (error) {
    throw new Error(`resolving the load-test company: ${error.message}`);
  }

  const companies = (data ?? []).filter(
    (company) => slug != null || SCALE_SLUG.test(company.slug),
  );
  if (companies.length === 0) {
    throw new Error(
      `No load-test tenant found${slug ? ` with slug "${slug}"` : ""}.\n\n` +
        `Seed one:\n` +
        `  node scripts/loadtest-seed.mjs --confirm <ref> \\\n` +
        `    --owner-user-id <an existing profile id> --seed-value 20260828 \\\n` +
        `    --customers 5000 --jobs 12000 --invoices 10000 --estimates 6000 \\\n` +
        `    --expenses 3000 --leads 2000 --technicians 6\n\n` +
        `Or pass --company <uuid> to point at a specific tenant.`,
    );
  }

  // Newest slug wins when several exist. Deterministic, so two verifiers run
  // back to back agree on which tenant they measured.
  const company = companies[0];

  if (minJobs > 0) {
    const { count, error: countError } = await admin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);
    if (countError) {
      throw new Error(`counting fixture jobs: ${countError.message}`);
    }
    // A fixture below the PostgREST ceiling cannot demonstrate the bug class
    // these verifiers exist for, and passing against one is worse than failing:
    // it reports proof that was never obtained.
    if ((count ?? 0) < minJobs) {
      throw new Error(
        `Load-test tenant ${company.slug} has ${count} jobs; this verifier ` +
          `needs at least ${minJobs} to say anything about truncation.\n\n` +
          `Reseed it at full scale, or pass --company <uuid> deliberately.`,
      );
    }
  }

  return company.id;
}
