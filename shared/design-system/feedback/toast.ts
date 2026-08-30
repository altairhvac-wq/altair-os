import {
  pushToast,
  type ToastInput,
  type ToastTone,
} from "./toast-store";

/**
 * The call surface product code uses.
 *
 * Deliberately narrow. `toast.success(...)` reads at a call site; a generic
 * `notify({ level })` invites the "Saved successfully" spam this system exists
 * to avoid.
 *
 * WHEN NOT TO USE THIS
 * - The result is already visible. A row disappearing from a filtered list, a
 *   toggle flipping, a field saving inline — the screen has already said it.
 * - The error belongs to a field. Use inline validation; a toast cannot be
 *   associated with an input, and it disappears before the user fixes anything.
 * - The user must decide something. Use a dialog.
 * - The state persists and must stay readable. Use a banner
 *   (`SettingsAlertBanner`); toasts are transient by design.
 *
 * WHEN TO USE IT
 * - The mutation's effect is off-screen, delayed, or invisible: archive from a
 *   detail page, send, approve, bulk operations, copy-to-clipboard, import.
 * - Any failure that is not attached to a specific field.
 */
export const toast = {
  success(title: string, options: Omit<ToastInput, "title" | "tone"> = {}) {
    return pushToast({ ...options, title, tone: "success" });
  },
  error(title: string, options: Omit<ToastInput, "title" | "tone"> = {}) {
    return pushToast({ ...options, title, tone: "error" });
  },
  warning(title: string, options: Omit<ToastInput, "title" | "tone"> = {}) {
    return pushToast({ ...options, title, tone: "warning" });
  },
  info(title: string, options: Omit<ToastInput, "title" | "tone"> = {}) {
    return pushToast({ ...options, title, tone: "info" });
  },
};

/**
 * Report a `{ error?: string }` action result in one line.
 *
 * Nearly every Server Action in this codebase returns that shape, and the
 * repeated `if (result.error) { setX } else { setY }` around it is most of what
 * the hand-rolled feedback patterns were. Returns whether the action succeeded
 * so callers can keep branching.
 */
export function toastActionResult(
  result: { error?: string | null } | null | undefined,
  copy: {
    success: string;
    /** Fallback when the action returns a bare/unknown error. */
    error: string;
    description?: string;
    /** Omit the success toast when the UI already shows the change. */
    silentOnSuccess?: boolean;
    dedupeKey?: string;
  },
): boolean {
  const failed = Boolean(result?.error);

  if (failed) {
    toast.error(copy.error, {
      description: result?.error ?? undefined,
      dedupeKey: copy.dedupeKey,
    });
    return false;
  }

  if (!copy.silentOnSuccess) {
    toast.success(copy.success, {
      description: copy.description,
      dedupeKey: copy.dedupeKey,
    });
  }
  return true;
}

export type { ToastInput, ToastTone };
