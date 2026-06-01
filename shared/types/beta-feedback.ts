export type BetaFeedbackSeverity = "low" | "medium" | "high" | "blocking";

export type BetaFeedbackStatus = "open" | "reviewing" | "fixed" | "ignored";

export type BetaFeedbackReportFormData = {
  pageUrl: string;
  severity: BetaFeedbackSeverity;
  message: string;
  expectedBehavior?: string;
};

export const BETA_FEEDBACK_SEVERITY_OPTIONS: {
  value: BetaFeedbackSeverity;
  label: string;
}[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "blocking", label: "Blocking" },
];

export const BETA_FEEDBACK_MESSAGE_MAX_LENGTH = 2000;

export const BETA_FEEDBACK_EXPECTED_BEHAVIOR_MAX_LENGTH = 2000;
