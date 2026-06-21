import "server-only";

const INTEGRATIONS_ENCRYPTION_KEY_ENV = "INTEGRATIONS_ENCRYPTION_KEY";
const EXPECTED_KEY_BYTES = 32;

/** Generate with: openssl rand -base64 32 */
function readRawEncryptionKey(): string | null {
  const raw = process.env[INTEGRATIONS_ENCRYPTION_KEY_ENV]?.trim();
  return raw || null;
}

function decodeEncryptionKey(raw: string): Buffer | null {
  try {
    const key = Buffer.from(raw, "base64");
    if (key.length !== EXPECTED_KEY_BYTES) {
      return null;
    }
    return key;
  } catch {
    return null;
  }
}

export function isIntegrationEncryptionConfigured(): boolean {
  const raw = readRawEncryptionKey();
  if (!raw) {
    return false;
  }
  return decodeEncryptionKey(raw) !== null;
}

/** Returns env var names missing when integration encryption is required but unset. */
export function getMissingIntegrationSecurityEnvVars(): string[] {
  if (!readRawEncryptionKey()) {
    return [INTEGRATIONS_ENCRYPTION_KEY_ENV];
  }
  return [];
}

export function getIntegrationsEncryptionKey(): Buffer {
  const raw = readRawEncryptionKey();

  if (!raw) {
    throw new Error(
      "INTEGRATIONS_ENCRYPTION_KEY is not set. Generate one with: openssl rand -base64 32",
    );
  }

  const key = decodeEncryptionKey(raw);

  if (!key) {
    throw new Error(
      "INTEGRATIONS_ENCRYPTION_KEY must decode to 32 bytes (generate with: openssl rand -base64 32)",
    );
  }

  return key;
}
