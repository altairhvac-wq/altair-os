"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { formatTimecode, type EditorProject } from "@/shared/types/video-editor";
import type { ToolTabId } from "./ToolRail";
import { LibraryPanel } from "./LibraryPanel";

/**
 * Media browser.
 *
 * ==================== IT SHOWS WHAT EXISTS, AND SAYS WHAT DOES NOT ====================
 * "Media" lists the project's real rendered frames — the 1920x1080 slides this
 * episode was actually built from, as previews under /studio/. Those are the
 * only visual assets the browser can honestly display.
 *
 * "Library" now shows the real HVAC photo library. It used to say the library
 * was unreachable, and that was true — it is a tree on the production laptop
 * and this is a browser. What changed is that the library publishes a catalog
 * into this app's public directory, with a thumbnail per asset. The panel reads
 * a file the app serves; it still touches no disk. See LibraryPanel.
 */

type Props = {
  readonly tab: ToolTabId;
  readonly project: EditorProject;
  readonly frames: Readonly<Record<string, string>>;
  readonly onInsertText: () => void;
  readonly onSelectClip: (clipId: string) => void;
  /** Apply a library asset to the selected visual clip. */
  readonly onApplyAsset: (assetId: string) => void;
  /** The selected clip's current asset, so the grid can mark it. */
  readonly selectedAssetId: string | null;
  /** False when nothing applicable is selected — the grid disables itself. */
  readonly canApplyAsset: boolean;
};

export function AssetBrowser({
  tab,
  project,
  frames,
  onInsertText,
  onSelectClip,
  onApplyAsset,
  selectedAssetId,
  canApplyAsset,
}: Props) {
  const [query, setQuery] = useState("");

  const mediaClips = useMemo(() => {
    const all = project.tracks
      .filter((t) => t.kind === "video" || t.kind === "overlay" || t.kind === "graphics")
      .flatMap((t) => t.clips);
    const needle = query.trim().toLowerCase();
    return needle
      ? all.filter((c) => c.label.toLowerCase().includes(needle))
      : all;
  }, [project, query]);

  return (
    <aside
      aria-label="Media browser"
      className="flex w-[264px] shrink-0 flex-col"
      style={{
        background: "var(--ve-panel)",
        borderRight: "1px solid var(--ve-line-strong)",
      }}
    >
      <div
        className="flex h-9 shrink-0 items-center gap-1.5 px-2.5"
        style={{ borderBottom: "1px solid var(--ve-line)" }}
      >
        <Search className="size-3.5" style={{ color: "var(--ve-text-faint)" }} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search project media"
          className="h-6 w-full bg-transparent text-[11px] outline-none"
          style={{ color: "var(--ve-text)" }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {tab === "media" ? (
          <div className="grid grid-cols-2 gap-1.5">
            {mediaClips.map((clip) => (
              <button
                key={clip.id}
                type="button"
                onClick={() => onSelectClip(clip.id)}
                className="group overflow-hidden rounded-[3px] text-left"
                style={{
                  background: "var(--ve-raised)",
                  border: "1px solid var(--ve-line)",
                }}
              >
                <div
                  className="aspect-video bg-cover bg-center"
                  style={{
                    backgroundImage: frames[clip.id]
                      ? `url(${frames[clip.id]})`
                      : undefined,
                    background: frames[clip.id] ? undefined : "var(--ve-high)",
                  }}
                />
                <div className="px-1.5 py-1">
                  <div
                    className="truncate text-[10px]"
                    style={{ color: "var(--ve-text-dim)" }}
                  >
                    {clip.label}
                  </div>
                  <div
                    className="text-[9px] tabular-nums"
                    style={{ color: "var(--ve-text-faint)" }}
                  >
                    {formatTimecode(clip.durationMs)}
                  </div>
                </div>
              </button>
            ))}
            {mediaClips.length === 0 ? (
              <Empty>No media matches “{query}”.</Empty>
            ) : null}
          </div>
        ) : null}

        {tab === "text" ? (
          <div className="space-y-1.5">
            <InsertButton onClick={onInsertText} label="Add text at playhead" />
            <p
              className="px-0.5 text-[10px] leading-relaxed"
              style={{ color: "var(--ve-text-faint)" }}
            >
              A text clip lands on the TEXT track at the playhead and is
              editable in the inspector.
            </p>
          </div>
        ) : null}

        {tab === "library" ? (
          <LibraryPanel
            projectAspect={project.width >= project.height ? "16:9" : "9:16"}
            currentAssetId={selectedAssetId}
            canApply={canApplyAsset}
            onApply={onApplyAsset}
          />
        ) : null}

        {tab === "captions" ? (
          <Explain
            title="Captions are on the timeline"
            body="This episode's captions are real clips on the CAPTIONS track, one per narrated beat, timed to the measured speech length. Select one to edit its text and timing in the inspector."
          />
        ) : null}

        {tab === "audio" ? (
          <Explain
            title="Narration is on the timeline"
            body="Nineteen narration clips are on the VOICEOVER track with waveforms decoded from the rendered Piper audio. Music and SFX tracks exist and are empty."
          />
        ) : null}

        {tab === "transitions" ? (
          <Explain
            title="One dissolve, globally"
            body="The production renderer applies a single crossfade length at every cut (260ms in this episode). Per-clip dissolve is editable in the inspector but is advisory until the renderer supports per-cut transitions."
          />
        ) : null}

      </div>
    </aside>
  );
}

function InsertButton({
  onClick,
  label,
}: {
  readonly onClick: () => void;
  readonly label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-[11px]"
      style={{
        background: "var(--ve-raised)",
        border: "1px solid var(--ve-line-strong)",
        color: "var(--ve-text)",
      }}
    >
      <Plus className="size-3.5" style={{ color: "var(--ve-accent)" }} />
      {label}
    </button>
  );
}

function Explain({
  title,
  body,
}: {
  readonly title: string;
  readonly body: string;
}) {
  return (
    <div
      className="rounded p-2.5"
      style={{ background: "var(--ve-raised)", border: "1px solid var(--ve-line)" }}
    >
      <div
        className="text-[11px] font-medium"
        style={{ color: "var(--ve-text-dim)" }}
      >
        {title}
      </div>
      <p
        className="mt-1 text-[10px] leading-relaxed"
        style={{ color: "var(--ve-text-faint)" }}
      >
        {body}
      </p>
    </div>
  );
}

function Empty({ children }: { readonly children: React.ReactNode }) {
  return (
    <p
      className="col-span-2 p-2 text-[10px]"
      style={{ color: "var(--ve-text-faint)" }}
    >
      {children}
    </p>
  );
}
