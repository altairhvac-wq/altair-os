import type { PaymentSource } from "./types";

const SUPPORTED_PAYMENT_SOURCES: readonly PaymentSource[] = ["manual"];

/**
 * Actual manual payment recording still lives in
 * lib/database/queries/invoice-payments.ts until the atomic RPC phase.
 * This module defines lightweight helpers and contracts only.
 */

export function normalizeManualPaymentSource(source: string): PaymentSource {
  if (source === "manual") {
    return "manual";
  }

  throw new Error(`Unsupported payment source: ${source}`);
}

export function assertSupportedPaymentSource(
  source: PaymentSource,
): asserts source is PaymentSource {
  if (!SUPPORTED_PAYMENT_SOURCES.includes(source)) {
    throw new Error(`Unsupported payment source: ${source}`);
  }
}
