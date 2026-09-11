"use client";

/**
 * Generated drafts, waiting to be opened in Studio.
 *
 * ==================== WHY A STORE AND NOT A ROUTE PARAMETER ====================
 * A draft is a whole project — tracks, clips, captions, generation metadata.
 * It cannot travel in a URL, and the editor route is a server component that
 * cannot see the operator's browser. So the agent's output is deposited here
 * and the route becomes a pointer to it.
 *
 * ==================== SAME TRADE AS THE AUTOSAVE, STATED AGAIN ====================
 * localStorage, per browser. A draft generated on the laptop does not appear
 * on a phone. This is the same limitation the session store has and it has the
 * same fix — a table — and until that exists, pretending otherwise would mean
 * an operator wondering where their draft went.
 *
 * ==================== THE SNAPSHOT IS IMMUTABLE ====================
 * `GeneratedDraft.project` is the control condition for every later
 * measurement. This module never updates it: the editor's own autosave writes
 * to a DIFFERENT key (`altair.editor.project.<id>`), so an edited draft and the
 * draft as generated cannot overwrite each other. That separation is the whole
 * reason the diff means anything.
 */

import type { EditorProject } from "@/shared/types/video-editor";
import type { StudioBeatVisual } from "@/shared/types/visual-selection";
import type {
  DraftGenerationMetadata,
  GeneratedDraft,
} from "./draft-from-plan";

const KEY = "altair.editor.drafts";

/**
 * ==================== WHY THE VERSION DID NOT MOVE ====================
 * Curated drafts add two fields (`frames`, `visuals`) and both are read with a
 * `?? {}`. A v1 draft stored before curation existed therefore opens exactly as
 * it did — with no previews and no selection records, which is the truth about
 * it. Bumping the version would have discarded every stored draft to gain
 * nothing, and a store that silently empties itself on upgrade is how an
 * operator loses an afternoon's work.
 */
const VERSION = 1;

export type StoredDraft = {
  readonly project: EditorProject;
  readonly metadata: DraftGenerationMetadata;
  readonly captionText: Readonly<Record<string, string>>;
  /** Absent on a draft stored before curation existed. */
  readonly frames?: Readonly<Record<string, string>>;
  /** Absent on a draft stored before curation existed. */
  readonly visuals?: Readonly<Record<string, StudioBeatVisual>>;
  readonly summary: GeneratedDraft["summary"];
  readonly storedAt: string;
};

type StoredDrafts = {
  readonly v: number;
  readonly drafts: readonly StoredDraft[];
};

export function loadDrafts(): StoredDraft[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredDrafts;
    if (parsed?.v !== VERSION || !Array.isArray(parsed.drafts)) return [];
    return parsed.drafts;
  } catch {
    return [];
  }
}

export function loadDraft(projectId: string): StoredDraft | null {
  return loadDrafts().find((d) => d.project.id === projectId) ?? null;
}

export function saveDraft(draft: GeneratedDraft, storedAt: string): boolean {
  try {
    const existing = loadDrafts().filter(
      (d) => d.project.id !== draft.project.id,
    );
    const next: StoredDrafts = {
      v: VERSION,
      drafts: [
        ...existing,
        {
          project: draft.project,
          metadata: draft.metadata,
          captionText: draft.captionText,
          frames: draft.frames,
          visuals: draft.visuals,
          summary: draft.summary,
          storedAt,
        },
      ],
    };
    window.localStorage.setItem(KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function deleteDraft(projectId: string): void {
  try {
    const remaining = loadDrafts().filter((d) => d.project.id !== projectId);
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ v: VERSION, drafts: remaining }),
    );
  } catch {
    /* already unreachable */
  }
}
