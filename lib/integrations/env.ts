import "server-only";

const INTEGRATIONS_ENCRYPTION_KEY_ENV = "INTEGRATIONS_ENCRYPTION_KEY";
const INTEGRATIONS_ENCRYPTION_KEY_VERSION_ENV =
  "INTEGRATIONS_ENCRYPTION_KEY_VERSION";
const INTEGRATIONS_PREVIOUS_KEY_ENV = "INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS";
const INTEGRATIONS_PREVIOUS_KEY_VERSION_ENV =
  "INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS_VERSION";
const EXPECTED_KEY_BYTES = 32;

/**
 * ============================== HOW ROTATION WORKS HERE ==============================
 * Every ciphertext already carried a version token ("v1:iv:ct:tag"), but the
 * code only ever recognised v1 and only ever had one key — so rotating the key
 * would have made every existing secret permanently undecryptable, with no way
 * to notice until a customer's integration stopped working.
 *
 * The token now names the KEY VERSION, and two keys can be configured at once:
 *
 *   INTEGRATIONS_ENCRYPTION_KEY                   the current key. All writes.
 *   INTEGRATIONS_ENCRYPTION_KEY_VERSION           its version. Default 1.
 *   INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS          decrypt only. Optional.
 *   INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS_VERSION  its version. Default current - 1.
 *
 * So a rotation is: set the previous pair to the outgoing key, set the current
 * pair to the incoming one, deploy, re-encrypt with
 * scripts/rotate-integration-secrets.mjs, confirm nothing is left on the old
 * version, then remove the previous pair.
 *
 * At every step, both keys can read. Nothing is unreadable at any point, and
 * rolling back is putting the old key back in the current slot — which is why
 * the previous key must NOT be removed until the re-encryption is verified.
 */

export type IntegrationEncryptionKey = {
  version: number;
  key: Buffer;
};

function readRaw(name: string): string | null {
  const raw = process.env[name]?.trim();
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

function readVersion(name: string, fallback: number): number {
  const raw = readRaw(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(
      `${name} must be a positive integer (got ${JSON.stringify(raw)}).`,
    );
  }
  return parsed;
}

export function isIntegrationEncryptionConfigured(): boolean {
  const raw = readRaw(INTEGRATIONS_ENCRYPTION_KEY_ENV);
  if (!raw) {
    return false;
  }
  return decodeEncryptionKey(raw) !== null;
}

/** Returns env var names missing when integration encryption is required but unset. */
export function getMissingIntegrationSecurityEnvVars(): string[] {
  if (!readRaw(INTEGRATIONS_ENCRYPTION_KEY_ENV)) {
    return [INTEGRATIONS_ENCRYPTION_KEY_ENV];
  }
  return [];
}

/** The key every new ciphertext is written with. */
export function getIntegrationsEncryptionKey(): IntegrationEncryptionKey {
  const raw = readRaw(INTEGRATIONS_ENCRYPTION_KEY_ENV);

  if (!raw) {
    throw new Error(
      `${INTEGRATIONS_ENCRYPTION_KEY_ENV} is not set. Generate one with: openssl rand -base64 32`,
    );
  }

  const key = decodeEncryptionKey(raw);

  if (!key) {
    throw new Error(
      `${INTEGRATIONS_ENCRYPTION_KEY_ENV} must decode to 32 bytes (generate with: openssl rand -base64 32)`,
    );
  }

  return {
    version: readVersion(INTEGRATIONS_ENCRYPTION_KEY_VERSION_ENV, 1),
    key,
  };
}

/**
 * The outgoing key, if one is configured. Decrypt only.
 *
 * Returns null rather than throwing when absent: not being mid-rotation is the
 * normal state. A key that is present but malformed DOES throw, because that is
 * a misconfiguration that would otherwise show up as "some secrets stopped
 * working" long after the deploy that caused it.
 */
export function getPreviousIntegrationsEncryptionKey(): IntegrationEncryptionKey | null {
  const raw = readRaw(INTEGRATIONS_PREVIOUS_KEY_ENV);
  if (!raw) {
    return null;
  }

  const key = decodeEncryptionKey(raw);
  if (!key) {
    throw new Error(
      `${INTEGRATIONS_PREVIOUS_KEY_ENV} is set but must decode to 32 bytes.`,
    );
  }

  const currentVersion = readVersion(INTEGRATIONS_ENCRYPTION_KEY_VERSION_ENV, 1);
  const version = readVersion(
    INTEGRATIONS_PREVIOUS_KEY_VERSION_ENV,
    currentVersion - 1,
  );

  if (version === currentVersion) {
    throw new Error(
      `${INTEGRATIONS_PREVIOUS_KEY_VERSION_ENV} (${version}) must differ from ` +
        `${INTEGRATIONS_ENCRYPTION_KEY_VERSION_ENV}. Two keys cannot share a ` +
        "version — a ciphertext would name both.",
    );
  }

  return { version, key };
}

/** Every key that may be used to READ, newest first. */
export function getIntegrationsDecryptionKeys(): IntegrationEncryptionKey[] {
  const current = getIntegrationsEncryptionKey();
  const previous = getPreviousIntegrationsEncryptionKey();
  return previous ? [current, previous] : [current];
}
