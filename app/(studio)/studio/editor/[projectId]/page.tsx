import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { canAccessAdminNavItem } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  DEMO_PROJECT_ID,
  loadDemoEpisode,
} from "@/shared/lib/video-editor/demo-project";
import { StudioProjectLoader } from "@/shared/components/video-editor/StudioProjectLoader";

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
 * ==================== TWO KINDS OF PROJECT ====================
 * The rendered demo episode is resolved HERE, on the server, because its
 * frames, audio and measured timings are committed to this repository. An
 * agent-generated draft cannot be: it lives in the operator's browser, so the
 * id is handed to a client loader that can actually see it. This route
 * therefore does not 404 an unknown id — it cannot know — and the loader shows
 * an honest "not in this browser" instead.
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

  return (
    <StudioProjectLoader
      projectId={projectId}
      demoEpisode={projectId === DEMO_PROJECT_ID ? loadDemoEpisode() : null}
    />
  );
}
