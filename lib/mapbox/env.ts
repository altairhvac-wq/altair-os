import "server-only";

const MAPBOX_TOKEN_ENV = "NEXT_PUBLIC_MAPBOX_TOKEN";

export function getMapboxAccessToken(): string | null {
  const token = process.env[MAPBOX_TOKEN_ENV]?.trim();
  return token || null;
}

export function isMapboxConfigured(): boolean {
  return Boolean(getMapboxAccessToken());
}
