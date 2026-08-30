"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";
import {
  dismissToast,
  subscribeToToasts,
  type Toast,
  type ToastTone,
} from "./toast-store";

/**
 * Prestige toast surface.
 *
 * Visual rules, and why:
 * - Porcelain card + the canonical elevation ramp, so a toast reads as the same
 *   material as every other raised surface rather than a floating notification
 *   from a different product.
 * - Tone is carried by a 3px leading rail and the icon, NOT by a saturated
 *   fill. A full-bleed coloured toast is the generic-SaaS look, and it makes
 *   success as loud as failure.
 * - Never colour alone: every tone has a distinct icon and its own words.
 */
const TONE: Record<
  ToastTone,
  { rail: string; icon: string; Icon: typeof CheckCircle2; label: string }
> = {
  success: {
    rail: "bg-altair-success",
    icon: "text-altair-success-foreground",
    Icon: CheckCircle2,
    label: "Success",
  },
  error: {
    rail: "bg-altair-danger",
    icon: "text-altair-danger",
    Icon: XCircle,
    label: "Error",
  },
  warning: {
    rail: "bg-altair-warning",
    icon: "text-altair-warning-foreground",
    Icon: AlertTriangle,
    label: "Warning",
  },
  info: {
    rail: "bg-[var(--altair-information)]",
    icon: "text-[var(--altair-information-foreground)]",
    Icon: Info,
    label: "Information",
  },
};

function ToastCard({ toast }: { toast: Toast }) {
  const tone = TONE[toast.tone];
  const Icon = tone.Icon;
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(toast.durationMs);
  /* Stamped inside the effect, not at render: reading the clock during render
     is impure and would drift on any incidental re-render. */
  const startedRef = useRef(0);

  /*
   * Auto-dismiss pauses on hover AND on focus-within: a keyboard user tabbing
   * to the action button must not have it vanish mid-reach. `durationMs === 0`
   * pins the toast open, which is how errors behave.
   */
  useEffect(() => {
    if (toast.durationMs === 0 || paused) return;
    startedRef.current = Date.now();
    const timer = window.setTimeout(
      () => dismissToast(toast.id),
      remainingRef.current,
    );
    return () => {
      window.clearTimeout(timer);
      remainingRef.current -= Date.now() - startedRef.current;
    };
  }, [toast.id, toast.durationMs, paused]);

  return (
    <div
      className="altair-toast pointer-events-auto flex w-full min-w-0 items-start gap-3 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-raised)] py-3 pl-0 pr-3 shadow-[var(--elev-hairline),var(--elev-3)] sm:w-[22rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <span className={`h-auto w-[3px] shrink-0 self-stretch ${tone.rail}`} aria-hidden="true" />
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.icon}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {/* Tone stated in words for screen readers — never colour alone. */}
        <span className="sr-only">{tone.label}: </span>
        <p className="text-sm font-semibold leading-snug text-altair-ink-on-paper">
          {toast.title}
        </p>
        {toast.description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-altair-ink-on-paper-secondary">
            {toast.description}
          </p>
        ) : null}
        {toast.action ? (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              dismissToast(toast.id);
            }}
            className="mt-1.5 rounded text-xs font-semibold text-[var(--brand-metal-text)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        aria-label={`Dismiss: ${toast.title}`}
        className="-m-1 shrink-0 rounded p-1 text-altair-ink-on-paper-muted transition-colors hover:text-altair-ink-on-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Mounted once in the root layout.
 *
 * Two permanently-present live regions, split by urgency. They must exist in
 * the DOM before content arrives — a region created at the same moment as its
 * message is frequently not announced — which is why both render even when
 * empty, and why errors go to the assertive region while everything else stays
 * polite.
 *
 * The container is `pointer-events-none` so an empty viewport cannot swallow
 * clicks on the page beneath it; each card re-enables its own pointer events.
 */
export function ToastViewport() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribeToToasts(setToasts), []);

  const assertive = toasts.filter((t) => t.tone === "error");
  const polite = toasts.filter((t) => t.tone !== "error");

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:inset-x-auto sm:right-4 sm:items-end sm:px-0 sm:pb-4"
      // Not a landmark: it holds the live regions rather than being one.
      data-testid="toast-viewport"
    >
      <div role="status" aria-live="polite" aria-atomic="false" className="contents">
        {polite.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="false" className="contents">
        {assertive.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </div>
    </div>
  );
}
