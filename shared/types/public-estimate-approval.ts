import type { EstimateLineItem, EstimateStatus } from "@/shared/types/estimate";
import type { BillingCompanyContact } from "@/shared/lib/billing-company-contact";

export type PublicEstimateApprovalTokenState =
  | "valid"
  | "expired"
  | "used"
  | "revoked"
  | "invalid"
  | "unavailable";

export type PublicEstimateApprovalSignatureSummary = {
  signerName: string;
  signedAt: string;
};

export type PublicEstimateApprovalView = {
  state: PublicEstimateApprovalTokenState;
  message?: string;
  estimateStatus?: EstimateStatus;
  company?: BillingCompanyContact;
  estimate?: {
    id: string;
    estimateNumber: string;
    customerName: string;
    status: EstimateStatus;
    subtotal: number;
    taxRate: number;
    tax: number;
    total: number;
    validUntil?: string;
    notes?: string;
    createdAt: string;
    lineItems: EstimateLineItem[];
  };
  signature?: PublicEstimateApprovalSignatureSummary | null;
};
