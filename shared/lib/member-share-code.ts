/**
 * Name-derived prefix + short random suffix for technician share codes
 * (e.g. MIKE-A3F2). Same spirit as company slug generation: stem + random hex.
 */

const MAX_PREFIX_LENGTH = 8;
const SUFFIX_LENGTH = 4;
const MAX_GENERATION_ATTEMPTS = 12;

export function buildMemberShareCodePrefix(name: string): string {
  const firstToken = name.trim().split(/\s+/).filter(Boolean)[0] ?? "";
  const cleaned = firstToken.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase();

  if (!cleaned) {
    return "TECH";
  }

  return cleaned.slice(0, MAX_PREFIX_LENGTH);
}

function randomHexSuffix(length: number = SUFFIX_LENGTH): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length)
    .toUpperCase();
}

/** Build one candidate code from a display name (or invite email). */
export function generateMemberShareCodeCandidate(name: string): string {
  return `${buildMemberShareCodePrefix(name)}-${randomHexSuffix()}`;
}

/**
 * Generate a share code not present in `existingCodes` (compared case-insensitively).
 * Returns null if every attempt collides.
 */
export function generateUniqueMemberShareCode(
  name: string,
  existingCodes: Iterable<string>,
): string | null {
  const taken = new Set(
    Array.from(existingCodes, (code) => code.trim().toLowerCase()).filter(
      Boolean,
    ),
  );

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const candidate = generateMemberShareCodeCandidate(name);
    const key = candidate.toLowerCase();

    if (!taken.has(key)) {
      return candidate;
    }
  }

  return null;
}
