export type ReportSurfaceVariant = "legacy" | "northStar";

export function isNorthStarReportSurface(
  variant?: ReportSurfaceVariant,
): variant is "northStar" {
  return variant === "northStar";
}
