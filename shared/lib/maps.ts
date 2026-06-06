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

export function buildAppleMapsDirectionsUrl(
  parts: ServiceAddressParts,
): string | null {
  if (!hasCompleteServiceAddress(parts)) {
    return null;
  }

  const destination = encodeURIComponent(formatServiceAddress(parts));
  return `https://maps.apple.com/?daddr=${destination}`;
}

/** True on iPhone, iPod, iPad, and iPadOS devices that report a desktop UA. */
export function isIOSOrIPadOS(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent;
  if (/iPhone|iPod/i.test(ua)) {
    return true;
  }
  if (/iPad/i.test(ua)) {
    return true;
  }

  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function buildMapsDirectionsUrl(
  parts: ServiceAddressParts,
): string | null {
  if (isIOSOrIPadOS()) {
    return buildAppleMapsDirectionsUrl(parts);
  }

  return buildGoogleMapsDirectionsUrl(parts);
}

/**
 * Open directions without replacing the current Altair session.
 * Prefer this over relying on anchor target="_blank" in standalone PWAs.
 */
export function openMapsDirectionsUrl(url: string): Window | null {
  return window.open(url, "_blank", "noopener,noreferrer");
}
