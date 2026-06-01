"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, X } from "lucide-react";
import { ModalPortal } from "@/shared/components/ui/ModalPortal";
import { useScrollLock, useSheetEscape } from "@/shared/hooks/useScrollLock";

type FocusedDocumentOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Shown beside the title (e.g. status badge). */
  headerAside?: ReactNode;
  /** Extra controls in the header row (print, signature, etc.). */
  headerTrailing?: ReactNode;
  children: ReactNode;
  closeDisabled?: boolean;
  ariaLabel?: string;
  /** Sticky footer region (form actions, billing actions). */
  footer?: ReactNode;
  /** Use back arrow instead of X (detail overlays). */
  closeVariant?: "close" | "back";
  /**
   * When "child", the body does not scroll; children manage their own overflow
   * (multi-step create forms).
   */
  bodyScroll?: "overlay" | "child";
};

const OverlayFooterSlotContext = createContext<HTMLElement | null>(null);

/** Renders into the overlay footer slot when nested inside FocusedDocumentOverlay. */
export function FocusedDocumentOverlayFooter({ children }: { children: ReactNode }) {
  const footerSlot = useContext(OverlayFooterSlotContext);

  if (!footerSlot) {
    return null;
  }

  return createPortal(children, footerSlot);
}

function OverlayHeader({
  title,
  subtitle,
  headerAside,
  headerTrailing,
  onClose,
  closeDisabled,
  closeVariant,
}: Omit<FocusedDocumentOverlayProps, "isOpen" | "children" | "footer" | "ariaLabel">) {
  const CloseIcon = closeVariant === "back" ? ArrowLeft : X;
  const closeLabel = closeVariant === "back" ? "Back" : "Close";

  return (
    <header className="flex shrink-0 items-start gap-2 border-b border-slate-100/90 bg-white px-3 py-2.5 sm:px-4 sm:py-3">
      <button
        type="button"
        onClick={onClose}
        disabled={closeDisabled}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={closeLabel}
      >
        <CloseIcon className="h-5 w-5 shrink-0" />
        {closeVariant === "back" ? (
          <span>{closeLabel}</span>
        ) : null}
      </button>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="break-words text-base font-bold text-slate-900 sm:text-lg">
            {title}
          </h2>
          {headerAside}
        </div>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {headerTrailing ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {headerTrailing}
        </div>
      ) : null}
    </header>
  );
}

export function FocusedDocumentOverlay({
  isOpen,
  onClose,
  title,
  subtitle,
  headerAside,
  headerTrailing,
  children,
  closeDisabled = false,
  ariaLabel,
  footer,
  closeVariant = "close",
  bodyScroll = "overlay",
}: FocusedDocumentOverlayProps) {
  const [footerSlot, setFooterSlot] = useState<HTMLElement | null>(null);

  useScrollLock(isOpen);
  useSheetEscape(() => {
    if (!closeDisabled) {
      onClose();
    }
  }, isOpen);

  if (!isOpen) {
    return null;
  }

  const resolvedFooter = footer ? (
    <div className="admin-sticky-footer-inline px-3 py-2.5 sm:px-4">{footer}</div>
  ) : null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          disabled={closeDisabled}
          className="absolute inset-0 hidden bg-slate-900/20 lg:block disabled:cursor-default"
        />
        <div className="relative flex h-dvh max-h-dvh min-h-0 w-full flex-col overflow-hidden bg-white lg:mx-auto lg:max-w-6xl lg:shadow-2xl lg:ring-1 lg:ring-slate-200/80">
          <OverlayHeader
            title={title}
            subtitle={subtitle}
            headerAside={headerAside}
            headerTrailing={headerTrailing}
            onClose={onClose}
            closeDisabled={closeDisabled}
            closeVariant={closeVariant}
          />
          <OverlayFooterSlotContext.Provider value={footerSlot}>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div
                className={`min-h-0 flex-1 ${
                  bodyScroll === "child"
                    ? "flex flex-col overflow-hidden"
                    : "overflow-y-auto overscroll-contain"
                }`}
              >
                {children}
              </div>
              <div
                ref={setFooterSlot}
                className="shrink-0 empty:hidden"
                data-overlay-footer=""
              />
              {resolvedFooter}
            </div>
          </OverlayFooterSlotContext.Provider>
        </div>
      </div>
    </ModalPortal>
  );
}
