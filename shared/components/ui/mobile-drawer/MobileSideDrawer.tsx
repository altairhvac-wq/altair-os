"use client";

import { useRef } from "react";
import { ModalPortal } from "@/shared/components/ui/ModalPortal";
import { useDialogFocusTrap } from "@/shared/hooks/useDialogFocusTrap";
import { useScrollLock, useSheetEscape } from "@/shared/hooks/useScrollLock";

type MobileSideDrawerProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Accessible title element id. */
  ariaLabelledBy: string;
  zIndex?: 40 | 50 | 60;
};

const zIndexClass: Record<40 | 50 | 60, string> = {
  40: "z-40",
  50: "z-50",
  60: "z-[60]",
};

/**
 * Full-height left-edge drawer for mobile quick navigation.
 * Reuses the same portal, scroll-lock, Escape, and focus-trap mechanics as MobileSheet.
 * Premium dark chrome — matches the mobile launcher wallpaper and brand gold.
 */
export function MobileSideDrawer({
  open,
  onClose,
  children,
  ariaLabelledBy,
  zIndex = 50,
}: MobileSideDrawerProps) {
  useScrollLock(open);
  useSheetEscape(onClose, open);

  if (!open) {
    return null;
  }

  return (
    <ModalPortal>
      <MobileSideDrawerPanel
        onClose={onClose}
        ariaLabelledBy={ariaLabelledBy}
        zIndex={zIndex}
      >
        {children}
      </MobileSideDrawerPanel>
    </ModalPortal>
  );
}

type MobileSideDrawerPanelProps = {
  children: React.ReactNode;
  onClose: () => void;
  ariaLabelledBy: string;
  zIndex: 40 | 50 | 60;
};

function MobileSideDrawerPanel({
  children,
  onClose,
  ariaLabelledBy,
  zIndex,
}: MobileSideDrawerPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(panelRef, "data-mobile-sheet-initial-focus");

  return (
    <div
      className={`fixed inset-0 flex overflow-hidden ${zIndexClass[zIndex]}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
    >
      <button
        type="button"
        aria-label="Close quick navigation"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        data-mobile-sheet-panel
        className="mobile-side-drawer-panel relative z-10 flex h-full w-[min(64vw,14rem)] max-w-full flex-col overflow-hidden border-r border-white/10 shadow-2xl outline-none"
        style={{
          backgroundColor: "#161718",
          backgroundImage:
            "linear-gradient(170deg, #232426 0%, #161718 55%, #0c0c0d 100%)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
