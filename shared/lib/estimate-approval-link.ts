export const ESTIMATE_APPROVAL_PATH = "/estimate-approval";

export function buildEstimateApprovalUrl(
  appBaseUrl: string,
  rawToken: string,
): string {
  const base = appBaseUrl.replace(/\/$/, "");
  const encoded = encodeURIComponent(rawToken);
  return `${base}${ESTIMATE_APPROVAL_PATH}/${encoded}`;
}
