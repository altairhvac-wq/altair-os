/** PWA install helpers — safe to import from client components only. */

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPlatformCategory = "ios" | "android" | "desktop" | "unknown";

export const PWA_INSTALL_BANNER_DISMISSED_KEY =
  "altair-pwa-install-banner-dismissed";

export function getInstallPageUrl(): string {
  if (typeof window === "undefined") {
    return "/install";
  }

  return `${window.location.origin}/install`;
}

export function getBetaTesterInstallMessage(): string {
  const url = getInstallPageUrl();

  return `Install Altair on your phone here: ${url}

iPhone: open in Safari, tap Share, then Add to Home Screen.
Android: open in Chrome and tap Install, or use the three-dot menu → Install app.`;
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    (typeof window.navigator !== "undefined" &&
      "standalone" in window.navigator &&
      navigatorWithStandalone.standalone === true)
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

export function getInstallPlatformCategory(): InstallPlatformCategory {
  if (isIosDevice()) {
    return "ios";
  }

  if (isAndroidDevice()) {
    return "android";
  }

  if (typeof navigator !== "undefined" && navigator.userAgent.length > 0) {
    return "desktop";
  }

  return "unknown";
}

export type PwaInstallDebugInfo = {
  displayModeStandalone: boolean;
  displayModeFullscreen: boolean;
  displayModeMinimalUi: boolean;
  navigatorStandalone: boolean | null;
  beforeInstallPromptAvailable: boolean;
  platformCategory: InstallPlatformCategory;
  serviceWorkerSupported: boolean;
  serviceWorkerRegistered: boolean;
};

export async function getPwaInstallDebugInfo(
  beforeInstallPromptAvailable = false,
): Promise<PwaInstallDebugInfo> {
  if (typeof window === "undefined") {
    return {
      displayModeStandalone: false,
      displayModeFullscreen: false,
      displayModeMinimalUi: false,
      navigatorStandalone: null,
      beforeInstallPromptAvailable,
      platformCategory: "unknown",
      serviceWorkerSupported: false,
      serviceWorkerRegistered: false,
    };
  }

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };

  let serviceWorkerRegistered = false;
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      serviceWorkerRegistered = Boolean(registration);
    } catch {
      serviceWorkerRegistered = false;
    }
  }

  return {
    displayModeStandalone: window.matchMedia("(display-mode: standalone)").matches,
    displayModeFullscreen: window.matchMedia("(display-mode: fullscreen)").matches,
    displayModeMinimalUi: window.matchMedia("(display-mode: minimal-ui)").matches,
    navigatorStandalone:
      "standalone" in window.navigator
        ? navigatorWithStandalone.standalone === true
        : null,
    beforeInstallPromptAvailable,
    platformCategory: getInstallPlatformCategory(),
    serviceWorkerSupported: "serviceWorker" in navigator,
    serviceWorkerRegistered,
  };
}
