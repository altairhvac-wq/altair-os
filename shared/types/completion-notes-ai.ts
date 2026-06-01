export type CompletionNotesDraftInput = {
  /** Job being completed — used for permission checks and optional context. */
  jobId: string;
  /** Rough completion notes shorthand to polish. */
  notes?: string;
  /** Optional follow-up recommendation entered alongside completion notes. */
  followUpNotes?: string;
};
