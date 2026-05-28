"use client";

import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
  type MobileSheetPanelMaxWidth,
} from "@/shared/components/ui/mobile-sheet";

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
        className="sm:max-h-[85vh]"
      >
        <MobileSheetHeader
          titleId={titleId}
          title={title}
          subtitle={subtitle}
          onClose={onClose}
          icon={
            <MobileSheetHeaderIcon className={iconClassName}>
              {icon}
            </MobileSheetHeaderIcon>
          }
          trailing={trailing}
        />
        <MobileSheetBody unstyled className="p-3 sm:p-4">
          {children}
        </MobileSheetBody>
      </MobileSheetPanel>
    </MobileSheet>
  );
}
