"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { ModalPortal } from "@/shared/components/ui/ModalPortal";
import { useScrollLock, useSheetEscape } from "@/shared/hooks/useScrollLock";

type DesktopConditionalDetailPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  closeDisabled?: boolean;
  ariaLabel?: string;
  /** Sticky footer region (form actions, etc.) */
  footer?: ReactNode;
};

function PanelHeader({
  title,
  subtitle,
  onClose,
  closeDisabled,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  return (
    <div className="admin-panel-header admin-section-header overlay-header-safe-mobile flex shrink-0 items-start justify-between border-b border-slate-100/90">
      <div className="min-w-0 pr-2">
        <h2 className="admin-heading-section sm:text-base">{title}</h2>
        {subtitle ? (
          <p className="admin-text-helper mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={closeDisabled}
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Close panel"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function DesktopDrawer({
  title,
  subtitle,
  onClose,
  closeDisabled,
  ariaLabel,
  children,
  footer,
}: Omit<DesktopConditionalDetailPanelProps, "isOpen">) {
  useScrollLock(true);
  useSheetEscape(() => {
    if (!closeDisabled) {
      onClose();
    }
  }, true);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 hidden lg:flex"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
      >
        <button
          type="button"
          aria-label="Close panel"
          onClick={onClose}
          disabled={closeDisabled}
          className="absolute inset-0 bg-slate-900/25 backdrop-blur-[1px] transition-opacity disabled:cursor-default"
        />
        <aside className="relative ml-auto flex h-full w-[min(480px,42vw)] min-w-[380px] flex-col overflow-hidden border-l border-slate-200/90 bg-white shadow-2xl shadow-slate-900/10">
          <PanelHeader
            title={title}
            subtitle={subtitle}
            onClose={onClose}
            closeDisabled={closeDisabled}
          />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
              {children}
            </div>
            {footer ? (
              <div className="overlay-form-actions admin-sticky-footer-inline shrink-0 px-3 py-2.5">
                {footer}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </ModalPortal>
  );
}

export function DesktopConditionalDetailPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  closeDisabled = false,
  ariaLabel,
  footer,
}: DesktopConditionalDetailPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <DesktopDrawer
        title={title}
        subtitle={subtitle}
        onClose={onClose}
        closeDisabled={closeDisabled}
        ariaLabel={ariaLabel}
        footer={footer}
      >
        {children}
      </DesktopDrawer>

      <aside className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden admin-card lg:hidden">
        <PanelHeader
          title={title}
          subtitle={subtitle}
          onClose={onClose}
          closeDisabled={closeDisabled}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-2.5">
            {children}
          </div>
          {footer ? (
            <div className="overlay-form-actions admin-sticky-footer-inline shrink-0 px-3 py-2.5">
              {footer}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
