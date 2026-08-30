/**
 * Toast state, deliberately outside React.
 *
 * Feedback is raised from Server Action callbacks, `startTransition` bodies and
 * event handlers all over the product. Threading a context through every one of
 * those is what made the previous 36 hand-rolled patterns hand-rolled, so the
 * store is a module singleton and the React layer only subscribes to it.
 *
 * This is not a general-purpose notification system. It exists for one job:
 * telling someone that a mutation they triggered succeeded or failed, when the
 * result is not already obvious on screen.
 */

export type ToastTone = "success" | "error" | "warning" | "info";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastInput = {
  tone?: ToastTone;
  /** One short sentence. The outcome, not the mechanics. */
  title: string;
  /** Optional second line — a consequence or a count. Keep it to one line. */
  description?: string;
  /**
   * Single follow-up, e.g. "Undo" or "View invoice". Two actions in a toast is
   * a dialog wearing the wrong clothes.
   */
  action?: ToastAction;
  /**
   * Override the tone default. `0` pins the toast open until dismissed.
   */
  durationMs?: number;
  /**
   * Collapse repeats. Raising the same key again replaces the existing toast
   * instead of stacking — bulk loops and rapid clicks would otherwise queue a
   * dozen identical messages.
   */
  dedupeKey?: string;
};

export type Toast = ToastInput & {
  id: string;
  tone: ToastTone;
  createdAt: number;
  durationMs: number;
};

/**
 * Errors do not auto-dismiss. A failure the user did not read is a failure they
 * will hit again; everything else clears itself so the surface stays quiet.
 */
const DEFAULT_DURATION_MS: Record<ToastTone, number> = {
  success: 4000,
  info: 5000,
  warning: 7000,
  error: 0,
};

/** Beyond this the stack stops being readable; older toasts drop off. */
const MAX_VISIBLE = 3;

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
let seq = 0;

function emit(): void {
  const snapshot = toasts;
  for (const listener of listeners) listener(snapshot);
}

export function subscribeToToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): Toast[] {
  return toasts;
}

export function pushToast(input: ToastInput): string {
  const tone: ToastTone = input.tone ?? "success";
  seq += 1;
  const toast: Toast = {
    ...input,
    tone,
    id: `toast-${seq}`,
    createdAt: Date.now(),
    durationMs: input.durationMs ?? DEFAULT_DURATION_MS[tone],
  };

  const withoutDuplicate = input.dedupeKey
    ? toasts.filter((t) => t.dedupeKey !== input.dedupeKey)
    : toasts;

  toasts = [...withoutDuplicate, toast].slice(-MAX_VISIBLE);
  emit();
  return toast.id;
}

export function dismissToast(id: string): void {
  const next = toasts.filter((t) => t.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  emit();
}

export function clearToasts(): void {
  if (toasts.length === 0) return;
  toasts = [];
  emit();
}

/** Test/reset seam so suites do not leak toasts between cases. */
export function __resetToastStore(): void {
  toasts = [];
  seq = 0;
  listeners.clear();
}
