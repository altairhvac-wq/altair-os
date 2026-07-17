"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { ModalPortal } from "@/shared/components/ui/ModalPortal";
import { useScrollLock, useSheetEscape } from "@/shared/hooks/useScrollLock";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type ExpenseDetailNorthStarPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  closeDisabled?: boolean;
  ariaLabel?: string;
  footer?: ReactNode;
};

function NorthStarPanelHeader({
  onClose,
  closeDisabled,
}: {
  onClose: () => void;
  closeDisabled?: boolean;
}) {
  return (
    <div className="expense-north-star-detail-panel-header flex shrink-0 items-center justify-end border-b border-[rgba(201,164,77,0.14)] bg-gradient-to-b from-[#273140] to-[#1A2029] px-3 py-2 sm:px-4">
      <button
        type="button"
        onClick={onClose}
        disabled={closeDisabled}
        className={dt.tertiaryAction}
        aria-label="Close panel"
      >
        <X className="h-4 w-4" />
        Close
      </button>
    </div>
  );
}

function NorthStarDesktopDrawer({
  onClose,
  closeDisabled,
  ariaLabel,
  children,
  footer,
}: Omit<ExpenseDetailNorthStarPanelProps, "isOpen">) {
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
        aria-label={ariaLabel ?? "Expense details"}
      >
        <button
          type="button"
          aria-label="Close panel"
          onClick={onClose}
          disabled={closeDisabled}
          className="absolute inset-0 bg-[rgba(3,7,12,0.45)] backdrop-blur-[1px] transition-opacity disabled:cursor-default"
        />
        <aside className="expense-north-star-detail-panel relative ml-auto flex h-full w-[min(720px,58vw)] min-w-[min(100%,520px)] flex-col overflow-hidden border-l border-[rgba(174,182,194,0.18)] bg-[#1A2029] shadow-[0_22px_60px_rgba(3,7,12,0.42)]">
          <NorthStarPanelHeader onClose={onClose} closeDisabled={closeDisabled} />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="expense-north-star-detail-panel-body flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2.5 sm:px-4 sm:py-3">
              {children}
            </div>
            {footer ? (
              <div className="overlay-form-actions shrink-0 border-t border-[rgba(201,164,77,0.14)] bg-[#1A2029] px-3 py-2.5 sm:px-4">
                {footer}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </ModalPortal>
  );
}

export function ExpenseDetailNorthStarPanel({
  isOpen,
  onClose,
  children,
  closeDisabled = false,
  ariaLabel,
  footer,
}: ExpenseDetailNorthStarPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <NorthStarDesktopDrawer
        onClose={onClose}
        closeDisabled={closeDisabled}
        ariaLabel={ariaLabel}
        footer={footer}
      >
        {children}
      </NorthStarDesktopDrawer>

      <aside className="expense-north-star-detail-panel-mobile flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:hidden">
        <NorthStarPanelHeader onClose={onClose} closeDisabled={closeDisabled} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#1A2029]">
          <div className="expense-north-star-detail-panel-body flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-2.5">
            {children}
          </div>
          {footer ? (
            <div className="overlay-form-actions shrink-0 border-t border-[rgba(201,164,77,0.14)] px-3 py-2.5">
              {footer}
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
