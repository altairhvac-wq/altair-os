import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

export function designLabPreviewVars(colors: DesignLabColors): React.CSSProperties {
  return {
    "--dl-page-bg": colors.pageBackground,
    "--dl-card-bg": colors.cardBackground,
    "--dl-card-border": colors.cardBorder,
    "--dl-primary-bg": colors.primaryButton,
    "--dl-primary-text": colors.primaryButtonText,
    "--dl-secondary-bg": colors.secondaryButton,
    "--dl-secondary-text": colors.secondaryButtonText,
    "--dl-heading-text": colors.headerText,
    "--dl-body-text": colors.bodyText,
    "--dl-muted-text": colors.mutedText,
    "--dl-success-bg": colors.successBadge,
    "--dl-warning-bg": colors.warningBadge,
    "--dl-danger-bg": colors.dangerBadge,
  } as React.CSSProperties;
}
