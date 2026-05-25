export type ServiceAddressParts = {
  serviceAddress: string;
  city: string;
  state: string;
  zip: string;
};

export function formatServiceAddress(parts: ServiceAddressParts): string {
  return `${parts.serviceAddress.trim()}, ${parts.city.trim()}, ${parts.state.trim()} ${parts.zip.trim()}`;
}

export function hasCompleteServiceAddress(parts: ServiceAddressParts): boolean {
  return [parts.serviceAddress, parts.city, parts.state, parts.zip].every(
    (part) => part.trim().length > 0,
  );
}

export function buildGoogleMapsDirectionsUrl(
  parts: ServiceAddressParts,
): string | null {
  if (!hasCompleteServiceAddress(parts)) {
    return null;
  }

  const destination = encodeURIComponent(formatServiceAddress(parts));
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}
