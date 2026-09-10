import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canAccessAdminNavItem } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  DEMO_PROJECT_ID,
  loadDemoEpisode,
} from "@/shared/lib/video-editor/demo-project";
import { VideoEditorShell } from "@/shared/components/video-editor/VideoEditorShell";

export const metadata: Metadata = {
  title: "Editor",
};

/**
 * The video editor, for one project.
 *
 * ==================== THE GATE ====================
 * `canAccessAdminNavItem` is typed to a closed union of top-level admin paths,
 * so this passes the literal "/marketing" rather than inventing a nested href
 * that would not typecheck. That is also the correct rule: the editor is the
 * Studio tab's other half, and it must be reachable by exactly the people who
 * can reach Studio — platform operators.
 *
 * A failure answers 404, not 403, matching `requirePlatformAdmin`: an internal
 * surface should not confirm it exists to someone who may not use it.
 *
 * ==================== ONE PROJECT, FOR NOW ====================
 * The only project that exists is the generated snapshot of the rendered EP01.
 * An unknown id 404s rather than opening an empty editor, because an editor
 * with no project is indistinguishable from one that failed to load.
 */
export default async function StudioEditorPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const [companyContext, { projectId }] = await Promise.all([
    getActiveCompanyContext(),
    params,
  ]);

  if (!companyContext) {
    redirect("/setup");
  }

  if (!canAccessAdminNavItem(companyContext, "/marketing")) {
    notFound();
  }

  if (projectId !== DEMO_PROJECT_ID) {
    notFound();
  }

  return <VideoEditorShell episode={loadDemoEpisode()} />;
}
