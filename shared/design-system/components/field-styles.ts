/**
 * Canonical Altair form-control presentation.
 *
 * Keep these classes separate from Field/Input/Textarea/Select rendering so
 * production compatibility adapters (admin-form-input, North Star form tokens,
 * local cyan inputClass copies) can adopt the same visual language without
 * rewriting markup or changing form behavior in the same migration.
 *
 * Token usage matches Input/Textarea/Select — Paper-anchored ink-on-paper
 * family. See shared/design-system/foundation/README.md and
 * shared/design-system/components/README.md.
 */

/** Shared geometry + interaction for single-line native controls. */
export const fieldControlClass = [
  "w-full min-h-11 sm:min-h-9 rounded-lg border text-sm outline-none transition-colors",
  "bg-altair-paper-elevated text-altair-ink-on-paper placeholder:text-altair-ink-on-paper-muted",
  "border-altair-border hover:border-altair-border-strong",
  "focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated",
  "aria-[invalid=true]:border-altair-danger-foreground aria-[invalid=true]:focus-visible:ring-altair-danger-foreground",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-altair-border disabled:bg-altair-paper-subtle disabled:text-altair-ink-muted disabled:opacity-70",
  "read-only:cursor-default read-only:bg-altair-stone read-only:hover:border-altair-border",
  "px-3 py-2.5 sm:py-1.5",
].join(" ");

/** Multi-line control — same family as fieldControlClass with vertical resize. */
export const fieldTextareaClass = [
  "w-full min-h-20 resize-y rounded-lg border text-sm outline-none transition-colors",
  "bg-altair-paper-elevated text-altair-ink-on-paper placeholder:text-altair-ink-on-paper-muted",
  "border-altair-border hover:border-altair-border-strong",
  "focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated",
  "aria-[invalid=true]:border-altair-danger-foreground aria-[invalid=true]:focus-visible:ring-altair-danger-foreground",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-altair-border disabled:bg-altair-paper-subtle disabled:text-altair-ink-muted disabled:opacity-70",
  "read-only:cursor-default read-only:bg-altair-stone read-only:hover:border-altair-border",
  "px-3 py-2.5 sm:py-1.5",
].join(" ");

/** Native select — same family; no read-only (HTML has no select readOnly). */
export const fieldSelectClass = [
  "w-full min-h-11 sm:min-h-9 rounded-lg border text-sm outline-none transition-colors",
  "bg-altair-paper-elevated text-altair-ink-on-paper",
  "border-altair-border hover:border-altair-border-strong",
  "focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated",
  "aria-[invalid=true]:border-altair-danger-foreground aria-[invalid=true]:focus-visible:ring-altair-danger-foreground",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-altair-border disabled:bg-altair-paper-subtle disabled:text-altair-ink-muted disabled:opacity-70",
  "px-3 py-2.5 sm:py-1.5",
].join(" ");

/**
 * Search / filter single-line control. Same visual family as fieldControlClass;
 * callers add icon padding (e.g. `pl-9`) as additive layout.
 */
export const fieldSearchClass = fieldControlClass;

/** Field label — matches Field.tsx label presentation. */
export const fieldLabelClass =
  "block text-xs font-medium text-altair-ink-on-paper";

/** Optional helper / description under the label. */
export const fieldDescriptionClass =
  "text-xs text-altair-ink-on-paper-secondary";

/** Validation / error message under the control. */
export const fieldErrorClass = "text-xs text-altair-danger-foreground";

/** Vertical rhythm between label, description, control, and error. */
export const fieldStackClass = "flex flex-col gap-1";

/** Vertical rhythm between sibling fields in a form. */
export const fieldGroupClass = "space-y-3";

/** Two-column field grid used by most create/edit forms. */
export const fieldGridClass = "grid gap-3 sm:grid-cols-2";

/** Native checkbox — shared accent + focus with the field family. */
export const fieldCheckboxClass = [
  "h-4 w-4 rounded border-altair-border-strong text-altair-graphite",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated",
  "disabled:cursor-not-allowed disabled:opacity-40",
].join(" ");

/** Native radio — same family as checkbox. */
export const fieldRadioClass = [
  "h-4 w-4 border-altair-border-strong text-altair-graphite",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated",
  "disabled:cursor-not-allowed disabled:opacity-40",
].join(" ");

/**
 * Presentation for custom `role="switch"` tracks. Does not own checked-state
 * colors for the thumb — callers keep their existing checked/unchecked
 * structure and compose this base where practical.
 */
export const fieldSwitchTrackClass = [
  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border border-altair-border transition-colors",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated",
  "disabled:cursor-not-allowed disabled:opacity-40",
].join(" ");

export function fieldControlClassName(className = ""): string {
  return [fieldControlClass, className].filter(Boolean).join(" ");
}

export function fieldTextareaClassName(className = ""): string {
  return [fieldTextareaClass, className].filter(Boolean).join(" ");
}

export function fieldSelectClassName(className = ""): string {
  return [fieldSelectClass, className].filter(Boolean).join(" ");
}
