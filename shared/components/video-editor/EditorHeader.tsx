"use client";

import Link from "next/link";
import { ArrowLeft, Check, Download, Loader2, Redo2, Undo2 } from "lucide-react";
import { formatTimecode } from "@/shared/types/video-editor";

export type SaveState = "saved" | "saving" | "dirty" | "unavailable";

/**
 * Compact top bar. One row, 40px — a tall header in an editor is height stolen
 * from the timeline.
 */
export function EditorHeader({
  title,
  durationMs,
  saveState,
  savedAt,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  onUndo,
  onRedo,
  onExport,
}: {
  readonly title: string;
  readonly durationMs: number;
  readonly saveState: SaveState;
  readonly savedAt: string | null;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undoLabel: string | null;
  readonly redoLabel: string | null;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onExport: () => void;
}) {
  return (
    <header
      className="flex h-10 shrink-0 items-center gap-2 px-2.5"
      style={{
        background: "var(--ve-bg)",
        borderBottom: "1px solid var(--ve-line-strong)",
      }}
    >
      <Link
        href="/marketing"
        className="flex items-center gap-1 rounded px-1.5 py-1 text-[11px] hover:brightness-150"
        style={{ color: "var(--ve-text-dim)" }}
      >
        <ArrowLeft className="size-3.5" />
        Studio
      </Link>

      <div
        className="mx-1 h-4 w-px"
        style={{ background: "var(--ve-line-strong)" }}
      />

      <span
        className="truncate text-[12px] font-medium"
        style={{ color: "var(--ve-text)" }}
      >
        {title}
      </span>
      <span
        className="shrink-0 text-[11px] tabular-nums"
        style={{ color: "var(--ve-text-faint)" }}
      >
        {formatTimecode(durationMs)}
      </span>

      <SaveBadge state={saveState} savedAt={savedAt} />

      <div className="ml-auto flex items-center gap-1">
        <HeaderButton
          onClick={onUndo}
          disabled={!canUndo}
          title={undoLabel ? `Undo ${undoLabel} (Ctrl+Z)` : "Nothing to undo"}
        >
          <Undo2 className="size-3.5" />
        </HeaderButton>
        <HeaderButton
          onClick={onRedo}
          disabled={!canRedo}
          title={
            redoLabel ? `Redo ${redoLabel} (Ctrl+Shift+Z)` : "Nothing to redo"
          }
        >
          <Redo2 className="size-3.5" />
        </HeaderButton>

        <button
          type="button"
          onClick={onExport}
          className="ml-1 flex h-7 items-center gap-1.5 rounded px-2.5 text-[11px] font-medium"
          style={{
            background: "var(--ve-accent)",
            color: "var(--ve-on-accent)",
          }}
        >
          <Download className="size-3.5" />
          Export
        </button>
      </div>
    </header>
  );
}

function SaveBadge({
  state,
  savedAt,
}: {
  readonly state: SaveState;
  readonly savedAt: string | null;
}) {
  const time = savedAt
    ? new Date(savedAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const content =
    state === "saving" ? (
      <>
        <Loader2 className="size-3 animate-spin" /> Saving
      </>
    ) : state === "saved" ? (
      <>
        <Check className="size-3" /> Saved{time ? ` ${time}` : ""}
      </>
    ) : state === "dirty" ? (
      <>Unsaved</>
    ) : (
      <>Autosave unavailable</>
    );

  return (
    <span
      className="flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px]"
      style={{
        color:
          state === "unavailable" ? "var(--ve-text-faint)" : "var(--ve-text-dim)",
        background: "var(--ve-raised)",
      }}
      title={
        state === "unavailable"
          ? "This browser blocked local storage, so edits will not survive a refresh."
          : "Edits autosave to this browser only."
      }
    >
      {content}
    </span>
  );
}

function HeaderButton({
  children,
  onClick,
  disabled,
  title,
}: {
  readonly children: React.ReactNode;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex size-7 items-center justify-center rounded disabled:opacity-30"
      style={{ background: "var(--ve-raised)", color: "var(--ve-text-dim)" }}
    >
      {children}
    </button>
  );
}
