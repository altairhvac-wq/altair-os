/** PWA install helpers — safe to import from client components only. */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const PWA_INSTALL_BANNER_DISMISSED_KEY =
  "altair-pwa-install-banner-dismissed";

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  if (!isIosDevice()) {
    return false;
  }

  const ua = navigator.userAgent;
  const isOtherIosBrowser =
    /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ||
    (ua.includes("Safari") === false && ua.includes("AppleWebKit"));

  return !isOtherIosBrowser;
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android/i.test(navigator.userAgent);
}
