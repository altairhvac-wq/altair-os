"use client";

/**
 * Editor autosave — per viewer, in the browser.
 *
 * ==================== WHY localStorage AND NOT A TABLE ====================
 * The requirement is "do not lose an edit when refreshing", and the smallest
 * reversible thing that satisfies it is a keyed blob in the viewer's own
 * browser. A `editor_projects` table would need a migration, RLS, a typed
 * query, a server action, and a revalidation story — five new surfaces, each a
 * place a tenant boundary can be got wrong — to buy durability across devices
 * that nobody has asked for yet.
 *
 * The trade is stated rather than hidden: this survives a refresh, a crash and
 * a browser restart. It does NOT survive a different browser, a different
 * machine, or clearing site data, and it is not visible to anyone else. When
 * the editor needs collaboration or server-side rendering of a draft, that is
 * the moment for the table, and this module is the thing it replaces.
 *
 * Every read and write is wrapped: private windows, blocked site data and
 * quota exhaustion all throw here, and none of them is a reason to fail to
 * open the editor.
 */

import type { EditorProject } from "@/shared/types/video-editor";

const KEY_PREFIX = "altair.editor.project.";

/**
 * Bumped when the stored shape changes. A snapshot from an older build is
 * DISCARDED rather than migrated — a half-understood old project silently
 * reinterpreted is worse than reopening the episode fresh.
 */
const STORAGE_VERSION = 1;

type Stored = {
  readonly v: number;
  readonly savedAt: string;
  readonly project: EditorProject;
};

function keyFor(projectId: string): string {
  return `${KEY_PREFIX}${projectId}`;
}

export function saveProject(projectId: string, project: EditorProject): boolean {
  try {
    const payload: Stored = {
      v: STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      project,
    };
    window.localStorage.setItem(keyFor(projectId), JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export type RestoredProject = {
  readonly project: EditorProject;
  readonly savedAt: string;
};

export function loadProject(projectId: string): RestoredProject | null {
  try {
    const raw = window.localStorage.getItem(keyFor(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (parsed?.v !== STORAGE_VERSION) return null;
    if (!parsed.project?.tracks || !Array.isArray(parsed.project.tracks)) {
      return null;
    }
    return { project: parsed.project, savedAt: parsed.savedAt };
  } catch {
    return null;
  }
}

export function clearProject(projectId: string): void {
  try {
    window.localStorage.removeItem(keyFor(projectId));
  } catch {
    /* nothing to do — the draft is already unreachable */
  }
}
