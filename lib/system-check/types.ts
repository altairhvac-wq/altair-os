export type SystemCheckStatus = "pass" | "fail" | "warn" | "info";

export type SystemCheckResult = {
  id: string;
  label: string;
  status: SystemCheckStatus;
  message: string;
  hint?: string;
};

export type SystemCheckReport = {
  checkedAt: string;
  summary: {
    pass: number;
    fail: number;
    warn: number;
    info: number;
  };
  checks: SystemCheckResult[];
};
