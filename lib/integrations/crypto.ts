import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import {
  getIntegrationsDecryptionKeys,
  getIntegrationsEncryptionKey,
} from "./env";

const IV_BYTES = 12;
const ALGORITHM = "aes-256-gcm";

/**
 * ============================== THE PAYLOAD FORMAT ==============================
 *
 *   v<keyVersion>:<iv base64>:<ciphertext base64>:<auth tag base64>
 *
 * The version token used to be the literal "v1" and was checked against a
 * constant, so exactly one key could ever be read. Rotating the key would have
 * made every stored secret permanently undecryptable — an outage with no
 * rollback, discovered whenever a customer's integration next needed its token.
 *
 * It now names the KEY version, and decryption looks the key up by it. See
 * lib/integrations/env.ts for the rotation procedure.
 *
 * Nothing here logs a plaintext, a key, or a ciphertext. Failures name the key
 * version and nothing else — enough to diagnose a rotation, useless to anyone
 * who obtains the log.
 */

export const INTEGRATION_SECRET_VERSION_PREFIX = "v";

export function encryptIntegrationSecret(plainText: string): string {
  if (!plainText) {
    throw new Error("Cannot encrypt an empty secret.");
  }

  const { key, version } = getIntegrationsEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    `${INTEGRATION_SECRET_VERSION_PREFIX}${version}`,
    iv.toString("base64"),
    ciphertext.toString("base64"),
    authTag.toString("base64"),
  ].join(":");
}

/** The key version a stored payload was written with, or null if unparseable. */
export function readIntegrationSecretKeyVersion(payload: string): number | null {
  const token = payload.split(":")[0];
  if (!token?.startsWith(INTEGRATION_SECRET_VERSION_PREFIX)) {
    return null;
  }
  const parsed = Number.parseInt(
    token.slice(INTEGRATION_SECRET_VERSION_PREFIX.length),
    10,
  );
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : null;
}

export function decryptIntegrationSecret(payload: string): string {
  const parts = payload.split(":");

  if (parts.length !== 4) {
    throw new Error("Invalid integration secret payload.");
  }

  const [, ivBase64, ciphertextBase64, authTagBase64] = parts;

  if (!ivBase64 || !ciphertextBase64 || !authTagBase64) {
    throw new Error("Invalid integration secret payload.");
  }

  const version = readIntegrationSecretKeyVersion(payload);
  if (version == null) {
    throw new Error("Invalid integration secret payload.");
  }

  const candidates = getIntegrationsDecryptionKeys();
  const match = candidates.find((candidate) => candidate.version === version);

  if (!match) {
    throw new Error(
      `No configured key for integration secret version ${version}. ` +
        `Configured versions: ${candidates.map((c) => c.version).join(", ")}. ` +
        "If this follows a key rotation, the outgoing key must stay in " +
        "INTEGRATIONS_ENCRYPTION_KEY_PREVIOUS until re-encryption is verified.",
    );
  }

  const iv = Buffer.from(ivBase64, "base64");
  const ciphertext = Buffer.from(ciphertextBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");

  const decipher = createDecipheriv(ALGORITHM, match.key, iv);
  decipher.setAuthTag(authTag);

  // GCM authenticates on final(); a wrong key fails here rather than returning
  // plausible-looking garbage, which is what makes trying a key safe.
  const plainText = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  return plainText;
}

/**
 * Re-encrypts a payload under the CURRENT key.
 *
 * Returns null when it is already current, so a re-encryption pass can skip it
 * without a write — which is what makes the pass idempotent and resumable.
 */
export function reencryptIntegrationSecret(payload: string): string | null {
  const version = readIntegrationSecretKeyVersion(payload);
  const current = getIntegrationsEncryptionKey();

  if (version === current.version) {
    return null;
  }

  return encryptIntegrationSecret(decryptIntegrationSecret(payload));
}
