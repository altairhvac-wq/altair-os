"use client";

import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
  type MobileSheetPanelMaxWidth,
} from "@/shared/components/ui/mobile-sheet";
import { northStarDispatchTokens as dt } from "@/shared/design-system/north-star/tokens";

type DispatchSectionSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconClassName: string;
  maxWidth?: MobileSheetPanelMaxWidth;
  trailing?: React.ReactNode;
  northStar?: boolean;
  children: React.ReactNode;
};

export function DispatchSectionSheet({
  open,
  onClose,
  title,
  titleId,
  subtitle,
  icon,
  iconClassName,
  maxWidth = "2xl",
  trailing,
  northStar = false,
  children,
}: DispatchSectionSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <MobileSheet
      onClose={onClose}
      ariaLabelledBy={titleId}
      variant="responsive"
      zIndex={40}
    >
      <MobileSheetPanel
        maxWidth={maxWidth}
        maxHeight="90"
        responsiveRounded
        unstyled={northStar}
        className={
          northStar
            ? `${dt.sectionSheetPanel} sm:max-h-[85vh]`
            : "sm:max-h-[85vh]"
        }
      >
        {northStar ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(214,190,120,0.38)] to-transparent"
            aria-hidden
          />
        ) : null}
        <MobileSheetHeader
          titleId={titleId}
          title={title}
          subtitle={subtitle}
          onClose={onClose}
          headerClassName={northStar ? dt.sectionSheetHeader : undefined}
          icon={
            <MobileSheetHeaderIcon
              className={northStar ? dt.sectionSheetHeaderIcon : iconClassName}
            >
              {icon}
            </MobileSheetHeaderIcon>
          }
          trailing={trailing}
        />
        <MobileSheetBody
          unstyled
          className={
            northStar
              ? `p-3 sm:p-4 ${dt.sectionSheetBody}`
              : "p-3 pb-[max(5rem,calc(1rem+env(safe-area-inset-bottom)))] sm:p-4 sm:pb-[max(4rem,calc(1rem+env(safe-area-inset-bottom)))]"
          }
        >
          {children}
        </MobileSheetBody>
      </MobileSheetPanel>
    </MobileSheet>
  );
}
