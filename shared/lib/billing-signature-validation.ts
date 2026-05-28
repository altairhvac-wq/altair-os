const PNG_DATA_URL_PATTERN =
  /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;

export const MAX_SIGNATURE_DATA_LENGTH = 524288;
export const MAX_SIGNER_NAME_LENGTH = 120;

export function normalizeSignerName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function validateSignerName(value: string): string | null {
  const normalized = normalizeSignerName(value);

  if (!normalized) {
    return "Printed name is required.";
  }

  if (normalized.length > MAX_SIGNER_NAME_LENGTH) {
    return `Printed name must be ${MAX_SIGNER_NAME_LENGTH} characters or fewer.`;
  }

  return null;
}

export function isValidSignatureData(value: string): boolean {
  const trimmed = value.trim();

  if (
    trimmed.length < 32 ||
    trimmed.length > MAX_SIGNATURE_DATA_LENGTH
  ) {
    return false;
  }

  return PNG_DATA_URL_PATTERN.test(trimmed);
}

export function validateSignatureData(value: string): string | null {
  if (!isValidSignatureData(value)) {
    return "Signature image is invalid or too large.";
  }

  return null;
}

export function validateCaptureBillingSignatureInput(
  signerName: string,
  signatureData: string,
): string | null {
  const nameError = validateSignerName(signerName);
  if (nameError) {
    return nameError;
  }

  return validateSignatureData(signatureData);
}
