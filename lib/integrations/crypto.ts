import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { getIntegrationsEncryptionKey } from "./env";

const VERSION = "v1";
const IV_BYTES = 12;
const ALGORITHM = "aes-256-gcm";

export function encryptIntegrationSecret(plainText: string): string {
  if (!plainText) {
    throw new Error("Cannot encrypt an empty secret.");
  }

  const key = getIntegrationsEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64"),
    ciphertext.toString("base64"),
    authTag.toString("base64"),
  ].join(":");
}

export function decryptIntegrationSecret(payload: string): string {
  const parts = payload.split(":");

  if (parts.length !== 4) {
    throw new Error("Invalid integration secret payload.");
  }

  const [version, ivBase64, ciphertextBase64, authTagBase64] = parts;

  if (version !== VERSION) {
    throw new Error(`Unsupported integration secret version: ${version}`);
  }

  if (!ivBase64 || !ciphertextBase64 || !authTagBase64) {
    throw new Error("Invalid integration secret payload.");
  }

  const key = getIntegrationsEncryptionKey();
  const iv = Buffer.from(ivBase64, "base64");
  const ciphertext = Buffer.from(ciphertextBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plainText = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  return plainText;
}
