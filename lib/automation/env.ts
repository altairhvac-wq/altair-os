import "server-only";

const CRON_SECRET_ENV = "CRON_SECRET";

export function getCronSecret(): string | null {
  const raw = process.env[CRON_SECRET_ENV]?.trim();
  return raw || null;
}

export function isCronSecretConfigured(): boolean {
  return Boolean(getCronSecret());
}

export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = getCronSecret();
  if (!secret) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}
