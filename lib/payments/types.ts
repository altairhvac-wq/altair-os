/**
 * Provider-neutral payment domain types.
 * Phase 0.2: manual recording only. Future provider work attaches here.
 */

/** How a payment entered the system. */
export type PaymentSource = "manual";

/** Provider that processed or recorded the payment. */
export type PaymentProvider = "manual";

/** Outcome of a payment record attempt. */
export type PaymentRecordStatus = "succeeded";

export type PaymentRecordInput = {
  companyId: string;
  invoiceId: string;
  actorId: string;
  amount: number;
  source: PaymentSource;
  provider: PaymentProvider;
};

export type PaymentRecordResult = {
  status: PaymentRecordStatus;
  paymentId: string;
  invoiceId: string;
};

export type ProviderPaymentSuccessInput = {
  provider: PaymentProvider;
  companyId: string;
  invoiceId: string;
  amount: number;
  externalId?: string;
};

export type ProviderPaymentFailureInput = {
  provider: PaymentProvider;
  companyId: string;
  invoiceId: string;
  reason: string;
};
