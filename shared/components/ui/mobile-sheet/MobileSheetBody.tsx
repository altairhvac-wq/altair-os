"use client";

type MobileSheetBodyProps = {
  children: React.ReactNode;
  className?: string;
  /** When true, omits default horizontal padding (parent supplies layout). */
  unstyled?: boolean;
};

export function MobileSheetBody({
  children,
  className,
  unstyled = false,
}: MobileSheetBodyProps) {
  return (
    <div
      className={`overlay-form-scroll overlay-scroll-body min-h-0 flex-1 touch-pan-y ${unstyled ? "" : "px-3 py-3 sm:px-4"} ${className ?? ""}`}
      data-no-pull-refresh
    >
      {children}
    </div>
  );
}
