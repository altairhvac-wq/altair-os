"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LoadedEpisode } from "@/shared/lib/video-editor/demo-project";
import { loadDraft, type StoredDraft } from "@/shared/lib/video-editor/draft-store";
import { describeDraftOrigin } from "@/shared/lib/video-editor/draft-from-plan";
import { VideoEditorShell } from "./VideoEditorShell";
import { editorThemeVars } from "./editor-theme";

/**
 * Resolves which project the editor opens: the rendered demo episode, or a
 * draft an agent generated.
 *
 * ==================== WHY THIS IS A CLIENT COMPONENT ====================
 * Generated drafts live in the operator's browser. The route is a server
 * component and cannot see them, so it cannot know whether an id is valid — it
 * would have to 404 every draft or 404 none. This resolves on the client and
 * shows an honest empty state for an id that is genuinely not here, which is a
 * different and more useful answer than "not found".
 *
 * ==================== A DRAFT ARRIVES WITH ITS PROVENANCE ====================
 * A generated project opens with its origin visible — which agent produced it
 * and whether it was given human-learned preferences. An operator about to
 * spend twenty minutes correcting a cut should be able to see, before they
 * start, whether the system had already learned anything from the last time
 * they did this.
 */
export function StudioProjectLoader({
  projectId,
  demoEpisode,
}: {
  readonly projectId: string;
  /** Supplied by the server when the id is the rendered demo episode. */
  readonly demoEpisode: LoadedEpisode | null;
}) {
  const [draft, setDraft] = useState<StoredDraft | null | undefined>(undefined);

  useEffect(() => {
    if (demoEpisode) return;
    setDraft(loadDraft(projectId));
  }, [projectId, demoEpisode]);

  if (demoEpisode) {
    return <VideoEditorShell episode={demoEpisode} />;
  }

  if (draft === undefined) {
    return <Waiting>Looking for a generated draft…</Waiting>;
  }

  if (draft === null) {
    return (
      <Waiting>
        <span className="block text-[13px]">
          No project called <code className="font-mono">{projectId}</code> in
          this browser.
        </span>
        <span className="mt-2 block text-[11px] opacity-70">
          Generated drafts are stored per browser. If an agent produced this one
          on another machine, it is not reachable from here.
        </span>
        <Link
          href="/marketing"
          className="mt-3 inline-block rounded px-2.5 py-1 text-[11px]"
          style={{
            background: "var(--ve-accent)",
            color: "var(--ve-on-accent)",
          }}
        >
          Back to Studio
        </Link>
      </Waiting>
    );
  }

  // A generated draft has no rendered frames, no narration audio and no
  // measured waveforms — nothing has been produced yet. Empty maps are the
  // truthful answer; the editor already renders a named placeholder for a clip
  // whose frame does not exist.
  const episode: LoadedEpisode = {
    project: draft.project,
    peaks: {},
    frames: {},
    audio: {},
    captionText: draft.captionText,
    meta: {
      stem: draft.project.id,
      series: draft.project.title,
      rawMs: draft.summary.rawMs,
      expectedOutMs: draft.summary.expectedMasterMs,
      transitionMs: 260,
      masterSha256: "",
      generatedBy: draft.metadata.agentVersion,
    },
  };

  return (
    <VideoEditorShell
      episode={episode}
      draftBanner={describeDraftOrigin(draft.metadata)}
      draftMetadata={draft.metadata}
    />
  );
}

function Waiting({ children }: { readonly children: React.ReactNode }) {
  return (
    <div
      style={editorThemeVars}
      className="flex h-dvh w-full items-center justify-center"
    >
      <div
        className="max-w-sm rounded p-5 text-center"
        style={{
          background: "var(--ve-panel)",
          border: "1px solid var(--ve-line-strong)",
          color: "var(--ve-text-dim)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
