import "server-only";

import { mapDatabaseError } from "@/lib/database/errors";
import { AGENT_DAILY_REEL_SOURCE } from "@/lib/database/queries/marketing-posts";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Content packages (migration 182) written by the agent bridge.
 *
 * ============ ONE WRITER, ONE PURPOSE ============
 * The only package the bridge writes is the parent of a WEBSITE draft: the
 * SEO brief a future, human-approved publish will read. It is inserted as
 * `draft`, it is never approved here, and nothing in this module can reach
 * the altair_site publisher. Service role, because the bridge has no user
 * session; authorization happened at the route's bearer check.
 *
 * ============ IDEMPOTENT THE SAME WAY EVERYTHING ELSE IS ============
 * Insert first, read 23505 as "already done" (migrations 144, 147, 182).
 * Migration 204's `(company_id, source_job_id)` key is the arbiter, so a
 * repeated agent cycle converges on the one package instead of minting a
 * second brief. Nothing is updated on a repeat: by then a human may have
 * edited the draft, and an unattended cycle must not undo that.
 */

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

function packagesTable(client: ServiceClient) {
  // marketing_content_packages: migration 182 — wire into Database types on next gen types run
  return (
    client as ServiceClient & {
      from(table: "marketing_content_packages"): ReturnType<ServiceClient["from"]>;
    }
  ).from("marketing_content_packages");
}

const UNIQUE_VIOLATION = "23505";

export type AgentContentPackageOutcome = "CREATED" | "ALREADY_EXISTS";

/**
 * The brief a website draft is created from. Stored as the package's jsonb
 * `brief`; `getSitePublishingDetailsForPost` reads `primaryKeyword` from it,
 * the rest is for the publish step. No URLs, no credentials — 182's rule.
 */
export type AgentWebsiteBrief = {
  readonly kind: "website_article";
  readonly sourceJobId: string;
  readonly primaryKeyword: string | null;
  readonly seo: {
    readonly slug: string | null;
    readonly metaTitle: string;
    readonly metaDescription: string;
    readonly keywords: readonly string[];
  };
  readonly bodyMarkdown: string;
};

type PackageIdRow = { id: string };

export async function createAgentWebsiteContentPackage(input: {
  companyId: string;
  title: string;
  sourceJobId: string;
  /** The platform artifact uuid, when the payload carried one. */
  sourceId: string | null;
  brief: AgentWebsiteBrief;
}): Promise<{
  packageId: string | null;
  outcome: AgentContentPackageOutcome | null;
  error: string | null;
}> {
  const client = createServiceRoleClient();

  const { data, error } = await packagesTable(client)
    .insert({
      company_id: input.companyId,
      title: input.title,
      source_type: AGENT_DAILY_REEL_SOURCE,
      source_id: input.sourceId,
      source_job_id: input.sourceJobId,
      brief: input.brief,
      package_state: "draft",
      // No human created this; the column is nullable for exactly that case.
      created_by: null,
    })
    .select("id")
    .single();

  if (!error && data) {
    return {
      packageId: (data as PackageIdRow).id,
      outcome: "CREATED",
      error: null,
    };
  }

  if (error?.code === UNIQUE_VIOLATION) {
    // 204's job key fired, or — when an artifact id was sent — 182's
    // artifact key. Read back by the job first, then by the artifact.
    const byJob = await packagesTable(client)
      .select("id")
      .eq("company_id", input.companyId)
      .eq("source_job_id", input.sourceJobId)
      .maybeSingle();

    if (byJob.data) {
      return {
        packageId: (byJob.data as PackageIdRow).id,
        outcome: "ALREADY_EXISTS",
        error: null,
      };
    }

    if (input.sourceId) {
      const byArtifact = await packagesTable(client)
        .select("id")
        .eq("company_id", input.companyId)
        .eq("source_type", AGENT_DAILY_REEL_SOURCE)
        .eq("source_id", input.sourceId)
        .maybeSingle();

      if (byArtifact.data) {
        return {
          packageId: (byArtifact.data as PackageIdRow).id,
          outcome: "ALREADY_EXISTS",
          error: null,
        };
      }
    }

    return {
      packageId: null,
      outcome: null,
      error:
        "A content package for this job already exists but could not be read back.",
    };
  }

  return {
    packageId: null,
    outcome: null,
    error: error
      ? mapDatabaseError(error)
      : "Could not create the content package.",
  };
}
