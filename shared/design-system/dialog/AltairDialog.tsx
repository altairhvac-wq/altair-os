"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { ModalPortal } from "@/shared/components/ui/ModalPortal";
import { useScrollLock, useSheetEscape } from "@/shared/hooks/useScrollLock";
import { useDialogFocusTrap } from "@/shared/hooks/useDialogFocusTrap";

/**
 * Canonical Altair Dialog primitives.
 *
 * See shared/design-system/dialog/README.md for the full contract before
 * extending this file. In short: these primitives own overlay structure,
 * material, motion, and accessibility mechanics (focus trap, focus
 * restoration, scroll lock, Escape, `aria-modal`, title/description
 * association). They never own open state, form data, validation, Server
 * Actions, permissions, business copy, or the decision to close — that
 * stays with the domain component, exactly like `AltairTable` owns
 * structure while a ledger owns its data.
 *
 * There is no separate accessibility dependency here on purpose — the
 * project has no Radix/Headless UI installed, so this wraps the same
 * scroll-lock/Escape hooks and focus-trap mechanic already proven in
 * `MobileSheet` (via `useDialogFocusTrap`) rather than hand-rolling a third
 * variant or adding a new dependency.
 */

type AltairDialogContextValue = {
  titleId: string;
  descriptionId: string;
  hasDescription: boolean;
  registerDescription: (present: boolean) => void;
  onOpenChange: (open: boolean) => void;
  closeDisabled: boolean;
};

const AltairDialogContext = createContext<AltairDialogContextValue | null>(
  null,
);

function useAltairDialogContext(component: string): AltairDialogContextValue {
  const context = useContext(AltairDialogContext);
  if (!context) {
    throw new Error(`${component} must be rendered inside <AltairDialog>.`);
  }
  return context;
}

export type AltairDialogProps = PropsWithChildren<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * When true, Escape and backdrop click are ignored. This never disables
   * the close button or any other in-dialog control — pass `disabled` to
   * those yourself. Mirrors `MobileSheet`'s `closeDisabled` contract so a
   * form mid-submit, a destructive action in flight, or any other
   * "unsafe to dismiss right now" state reads the same way across every
   * overlay family in the product.
   */
  closeDisabled?: boolean;
}>;

/**
 * Root. Renders the portal, the backdrop, and the scroll-lock/Escape
 * wiring; provides title/description ids to its children. Renders nothing
 * when `open` is false — callers do not need a separate mount guard.
 */
export function AltairDialog({
  open,
  onOpenChange,
  closeDisabled = false,
  children,
}: AltairDialogProps) {
  const reactId = useId();
  const titleId = `altair-dialog-title-${reactId}`;
  const descriptionId = `altair-dialog-description-${reactId}`;
  const [hasDescription, setHasDescription] = useState(false);

  useScrollLock(open);

  const closeDisabledRef = useRef(closeDisabled);
  useEffect(() => {
    closeDisabledRef.current = closeDisabled;
  }, [closeDisabled]);
  useSheetEscape(() => {
    if (!closeDisabledRef.current) {
      onOpenChange(false);
    }
  }, open);

  if (!open) {
    return null;
  }

  function handleBackdropClick() {
    if (closeDisabled) return;
    onOpenChange(false);
  }

  return (
    <AltairDialogContext.Provider
      value={{
        titleId,
        descriptionId,
        hasDescription,
        registerDescription: setHasDescription,
        onOpenChange,
        closeDisabled,
      }}
    >
      <ModalPortal>
        <div className="altair-dialog-overlay fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Close dialog"
            onClick={handleBackdropClick}
            disabled={closeDisabled}
            className="absolute inset-0 cursor-default disabled:cursor-default"
          />
          {children}
        </div>
      </ModalPortal>
    </AltairDialogContext.Provider>
  );
}

export type AltairDialogSize = "sm" | "md" | "lg";

/**
 * Three sizes, matched to real production widths audited across the
 * repository's hand-rolled dialogs — no size exists without a current
 * consumer:
 * - `sm` (28rem) — confirmation dialogs (new consumer: `AltairConfirmDialog`).
 * - `md` (42rem) — standard create/edit form dialogs (the exact width
 *   `CustomerEditControl` / `CustomerEquipmentSection` already used).
 * - `lg` (48rem) — wider action/detail overlays (the exact width
 *   `ExpenseReceiptPreview`'s viewer already used).
 * An `xl` step was deliberately not added — see the README's "Sizes" section.
 */
const sizeClass: Record<AltairDialogSize, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-3xl",
};

export type AltairDialogContentProps = PropsWithChildren<{
  size?: AltairDialogSize;
  className?: string;
}>;

/**
 * The visual panel. Owns `role="dialog"`, `aria-modal`, title/description
 * association, the focus trap, mobile-bottom-sheet-to-desktop-modal
 * responsive shape, and the canonical Paper Elevated material + motion
 * (see `.altair-dialog-content` in app/globals.css). Does not own header/
 * body/footer layout — compose those from the sibling primitives below.
 */
export function AltairDialogContent({
  size = "md",
  className = "",
  children,
}: AltairDialogContentProps) {
  const { titleId, descriptionId, hasDescription } =
    useAltairDialogContext("AltairDialogContent");
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(panelRef);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={hasDescription ? descriptionId : undefined}
      tabIndex={-1}
      className={`altair-dialog-content relative z-10 flex max-h-[90dvh] w-full ${sizeClass[size]} flex-col overflow-hidden rounded-t-2xl outline-none sm:max-h-[85dvh] sm:rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
}

export type AltairDialogHeaderProps = PropsWithChildren<{ className?: string }>;

/** Title/description/close row. Standardizes padding and the safe-area-aware top inset on mobile. */
export function AltairDialogHeader({
  className = "",
  children,
}: AltairDialogHeaderProps) {
  return (
    <div
      className={`altair-dialog-header overlay-header-safe-mobile flex shrink-0 items-start justify-between gap-3 ${className}`}
    >
      {children}
    </div>
  );
}

export type AltairDialogTitleProps = PropsWithChildren<{ className?: string }>;

/** The dialog's accessible name — always rendered as a heading and wired to `aria-labelledby` automatically. */
export function AltairDialogTitle({
  className = "",
  children,
}: AltairDialogTitleProps) {
  const { titleId } = useAltairDialogContext("AltairDialogTitle");
  return (
    <h2
      id={titleId}
      className={`text-base font-bold text-altair-ink-on-paper ${className}`}
    >
      {children}
    </h2>
  );
}

export type AltairDialogDescriptionProps = PropsWithChildren<{
  className?: string;
}>;

/**
 * Optional supporting copy under the title. Registers itself with the root
 * so `AltairDialogContent` only sets `aria-describedby` when a description
 * actually renders — a dangling id reference is worse than none.
 */
export function AltairDialogDescription({
  className = "",
  children,
}: AltairDialogDescriptionProps) {
  const { descriptionId, registerDescription } = useAltairDialogContext(
    "AltairDialogDescription",
  );

  useEffect(() => {
    registerDescription(true);
    return () => registerDescription(false);
  }, [registerDescription]);

  return (
    <p
      id={descriptionId}
      className={`text-sm text-altair-ink-on-paper-secondary ${className}`}
    >
      {children}
    </p>
  );
}

export type AltairDialogBodyProps = PropsWithChildren<{ className?: string }>;

/** The scrollable content region. Owns horizontal padding, vertical rhythm, and scroll containment within the content's max-height. */
export function AltairDialogBody({
  className = "",
  children,
}: AltairDialogBodyProps) {
  return (
    <div className={`altair-dialog-body min-h-0 flex-1 overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}

export type AltairDialogFooterProps = PropsWithChildren<{ className?: string }>;

/**
 * Action row. Stacks primary-below-secondary on mobile (thumb-zone
 * placement — see the Foundation's Mobile section) and rows out
 * secondary-then-primary (left-to-right) at `sm+`. Compose children in
 * that same order — secondary/cancel first, primary/destructive last.
 */
export function AltairDialogFooter({
  className = "",
  children,
}: AltairDialogFooterProps) {
  return (
    <div
      className={`altair-dialog-footer flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3 ${className}`}
    >
      {children}
    </div>
  );
}

export type AltairDialogCloseProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "onClick"
>;

/** Keyboard-accessible close control with a screen-reader label. Always closes via `onOpenChange` — domain code decides whether to disable it (e.g. while pending). */
export function AltairDialogClose({
  className = "",
  "aria-label": ariaLabel = "Close",
  ...rest
}: AltairDialogCloseProps) {
  const { onOpenChange } = useAltairDialogContext("AltairDialogClose");
  return (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      aria-label={ariaLabel}
      className={`altair-dialog-close flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${className}`}
      {...rest}
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

export type AltairDialogIconProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement>
>;

/** Optional leading icon chip for a header. Caller supplies tone via `className` (e.g. a danger surface for a destructive confirmation). */
export function AltairDialogIcon({
  className = "",
  children,
  ...rest
}: AltairDialogIconProps) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
