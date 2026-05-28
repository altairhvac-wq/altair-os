import type { BillingSignatureEntityType } from "@/lib/database/types/core-tables";

export type BillingSignature = {
  id: string;
  entityType: BillingSignatureEntityType;
  entityId: string;
  signerName: string;
  signerRole: string;
  signatureData: string;
  signedAt: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
};

export type CaptureBillingSignatureFormData = {
  signerName: string;
  signatureData: string;
};

export type BillingSignatureEntityRef = {
  entityType: BillingSignatureEntityType;
  entityId: string;
};
