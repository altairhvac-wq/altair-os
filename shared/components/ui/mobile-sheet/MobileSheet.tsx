"use client";

import { ModalPortal } from "@/shared/components/ui/ModalPortal";
import { useScrollLock, useSheetEscape } from "@/shared/hooks/useScrollLock";

export type MobileSheetVariant = "bottom" | "responsive";

type MobileSheetProps = {
  children: React.ReactNode;
  onClose: () => void;
  /** When true, backdrop, escape, and header close are disabled. */
  closeDisabled?: boolean;
  ariaLabelledBy: string;
  variant?: MobileSheetVariant;
  zIndex?: 40 | 50 | 60;
  /** Applied to the fixed overlay root (e.g. `lg:hidden`). */
  rootClassName?: string;
};

const rootVariantClass: Record<MobileSheetVariant, string> = {
  bottom: "items-end justify-center p-0",
  responsive: "items-end justify-center p-0 sm:items-center sm:p-4",
};

const zIndexClass: Record<40 | 50 | 60, string> = {
  40: "z-40",
  50: "z-50",
  60: "z-60",
};

export function MobileSheet({
  children,
  onClose,
  closeDisabled = false,
  ariaLabelledBy,
  variant = "bottom",
  zIndex = 40,
  rootClassName,
}: MobileSheetProps) {
  useScrollLock(true);
  useSheetEscape(onClose, !closeDisabled);

  return (
    <ModalPortal>
      <div
        className={`fixed inset-0 flex ${zIndexClass[zIndex]} ${rootVariantClass[variant]} ${rootClassName ?? ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          disabled={closeDisabled}
          className="absolute inset-0 bg-slate-900/40 disabled:cursor-default"
        />
        {children}
      </div>
    </ModalPortal>
  );
}

export type MobileSheetPanelMaxWidth = "md" | "lg" | "2xl";
export type MobileSheetPanelMaxHeight = "85" | "90";

const maxWidthClass: Record<MobileSheetPanelMaxWidth, string> = {
  md: "max-w-md",
  lg: "max-w-lg",
  "2xl": "max-w-2xl",
};

const maxHeightClass: Record<MobileSheetPanelMaxHeight, string> = {
  "85": "max-h-[85vh]",
  "90": "max-h-[90vh] sm:max-h-[85vh]",
};

export type MobileSheetPanelTone = "default" | "amber";

const panelToneClass: Record<MobileSheetPanelTone, string> = {
  default: "border-slate-200",
  amber: "border-amber-200/80",
};

type MobileSheetPanelProps = {
  children: React.ReactNode;
  maxWidth?: MobileSheetPanelMaxWidth;
  maxHeight?: MobileSheetPanelMaxHeight;
  tone?: MobileSheetPanelTone;
  /** Adds centered modal rounding on sm+ when variant is responsive. */
  responsiveRounded?: boolean;
  /** Shell only (no border/bg); use when children supply panel chrome. */
  unstyled?: boolean;
  className?: string;
};

export function MobileSheetPanel({
  children,
  maxWidth = "md",
  maxHeight = "85",
  tone = "default",
  responsiveRounded = false,
  unstyled = false,
  className,
}: MobileSheetPanelProps) {
  const shellClass = unstyled
    ? ""
    : `rounded-t-2xl border bg-white shadow-xl ${panelToneClass[tone]} ${responsiveRounded ? "sm:rounded-2xl" : ""}`;

  return (
    <div
      className={`relative z-10 flex w-full ${maxWidthClass[maxWidth]} ${maxHeightClass[maxHeight]} flex-col overflow-hidden ${shellClass} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
