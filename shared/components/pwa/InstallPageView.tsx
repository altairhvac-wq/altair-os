"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe,
  MessageSquare,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
} from "lucide-react";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import { PwaInstallPrompt } from "./PwaInstallPrompt";
import {
  getBetaTesterInstallMessage,
  getInstallPageUrl,
  getPwaInstallDebugInfo,
  type PwaInstallDebugInfo,
  isAndroidDevice,
  isIosDevice,
  isStandaloneDisplayMode,
} from "./pwa-utils";

const ctaFocusClass =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/20";

type InstallPlatform = "ios" | "android" | "desktop";

type WizardStep = {
  title: string;
  instruction: string;
  helperText?: string;
  icon: LucideIcon;
};

const IOS_STEPS: WizardStep[] = [
  {
    title: "Open in Safari 🌐",
    instruction: "Make sure this page is open in Safari on your iPhone.",
    icon: Globe,
  },
  {
    title: "Find the Share button ⬆️",
    instruction: "Look at the bottom of Safari and tap the Share button.",
    helperText: "If you do not see Share, tap the three dots (⋯) first.",
    icon: Share,
  },
  {
    title: "Scroll down ⬇️",
    instruction:
      'In the menu that opens, scroll down until you find "Add to Home Screen."',
    icon: ChevronDown,
  },
  {
    title: "Tap Add to Home Screen ➕",
    instruction: 'Tap "Add to Home Screen."',
    icon: PlusSquare,
  },
  {
    title: "Tap Add ✅",
    instruction: 'Tap "Add" in the top-right corner to confirm.',
    icon: Check,
  },
  {
    title: "Open Altair from your home screen 📱",
    instruction:
      "Look for the Altair icon on your home screen and tap it to open the app.",
    icon: Smartphone,
  },
];

/** Typical iPhone screenshot dimensions; used for layout ratio only. */
const IPHONE_SCREENSHOT_WIDTH = 1170;
const IPHONE_SCREENSHOT_HEIGHT = 2532;

const IOS_SCREENSHOT_WALKTHROUGH = [
  {
    src: "/install/iphone-step-1-tap-dots.png",
    alt: "Safari on iPhone with the three-dot menu next to the website bar highlighted",
    caption: "Tap the three dots next to the website bar.",
  },
  {
    src: "/install/iphone-step-2-tap-share.png",
    alt: "Safari menu open on iPhone with Share highlighted at the top",
    caption: "Tap Share at the top of the menu.",
  },
  {
    src: "/install/iphone-step-3-add-home-screen.png",
    alt: "iOS Share Sheet on iPhone with Add to Home Screen highlighted",
    caption: "Scroll down and tap Add to Home Screen.",
  },
] as const;

const ANDROID_STEPS: WizardStep[] = [
  {
    title: "Open in Chrome 🌐",
    instruction:
      "Make sure this page is open in Chrome on your Android phone.",
    icon: Globe,
  },
  {
    title: "Tap Install if shown 📲",
    instruction: 'If you see an "Install Altair" button at the top, tap it.',
    icon: Smartphone,
  },
  {
    title: "Or tap the three-dot menu ⋯",
    instruction:
      "If Install does not appear, tap the three dots (⋯) in the top-right corner of Chrome.",
    icon: MoreVertical,
  },
  {
    title: "Tap Install app or Add to Home screen ➕",
    instruction: 'Tap "Install app" or "Add to Home screen" from the menu.',
    icon: PlusSquare,
  },
  {
    title: "Open Altair from your home screen 📱",
    instruction:
      "Look for the Altair icon on your home screen and tap it to open the app.",
    icon: Smartphone,
  },
];

function PwaInstallDebugPanel() {
  const [debugInfo, setDebugInfo] = useState<PwaInstallDebugInfo | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    let cancelled = false;
    let beforeInstallPromptAvailable = false;

    async function refreshDebugInfo() {
      const info = await getPwaInstallDebugInfo(beforeInstallPromptAvailable);
      if (!cancelled) {
        setDebugInfo(info);
        console.log("[PWA install debug]", info);
      }
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      beforeInstallPromptAvailable = true;
      void refreshDebugInfo();
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    void refreshDebugInfo();

    return () => {
      cancelled = true;
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  if (process.env.NODE_ENV !== "development" || !debugInfo) {
    return null;
  }

  return (
    <pre className="mt-6 overflow-x-auto rounded-lg border border-dashed border-stone-300 bg-stone-100/80 p-3 text-[10px] leading-relaxed text-stone-600">
      {JSON.stringify(debugInfo, null, 2)}
    </pre>
  );
}

function WizardStepList({ steps }: { steps: WizardStep[] }) {
  return (
    <ol className="mt-6 space-y-4">
      {steps.map((step, index) => {
        const Icon = step.icon;

        return (
          <li
            key={step.title}
            className="flex gap-4 rounded-xl border border-stone-200/80 bg-white/60 p-4 shadow-sm"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FAF4E8] text-lg font-bold text-[#9A7209] ring-1 ring-[#D4AF37]/25">
                {index + 1}
              </span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 shrink-0 text-[#9A7209]" aria-hidden />
                <p className="text-base font-semibold text-[#0A0A0A]">
                  {step.title}
                </p>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">
                {step.instruction}
              </p>
              {step.helperText ? (
                <p className="mt-2 rounded-lg border border-amber-200/60 bg-amber-50/70 px-3 py-2 text-xs leading-relaxed text-amber-900/90">
                  {step.helperText}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function InstallCardShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border-2 border-[#D4AF37]/35 border-t-[4px] border-t-[#D4AF37]/70 bg-gradient-to-b from-white via-[#FFFCF8] to-[#FAF7F2] p-5 shadow-[0_4px_8px_rgba(10,10,10,0.06),0_16px_40px_rgba(10,10,10,0.1)] ring-1 ring-[#D4AF37]/18 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FAF4E8] text-[#9A7209] shadow-sm ring-1 ring-[#D4AF37]/25">
          <Smartphone className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A7209]">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#0A0A0A] sm:text-xl">
            {title}
          </h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function IosWalkthroughScreenshot({
  src,
  alt,
  caption,
  stepNumber,
}: {
  src: string;
  alt: string;
  caption: string;
  stepNumber: number;
}) {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  return (
    <figure className="space-y-3">
      <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-[0_2px_8px_rgba(10,10,10,0.06),0_8px_24px_rgba(10,10,10,0.08)] sm:max-w-md">
        <Image
          src={src}
          alt={alt}
          width={IPHONE_SCREENSHOT_WIDTH}
          height={IPHONE_SCREENSHOT_HEIGHT}
          sizes="(max-width: 640px) 90vw, 448px"
          className="h-auto w-full"
          onError={() => setVisible(false)}
        />
      </div>
      <figcaption className="text-center text-sm leading-relaxed text-stone-600">
        <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#FAF4E8] text-xs font-bold text-[#9A7209] ring-1 ring-[#D4AF37]/25">
          {stepNumber}
        </span>
        {caption}
      </figcaption>
    </figure>
  );
}

function IosScreenshotWalkthrough() {
  return (
    <section
      className="mt-8 rounded-xl border border-stone-200/80 bg-white/70 p-4 sm:p-5"
      aria-label="iPhone install screenshot walkthrough"
    >
      <h3 className="text-base font-semibold text-[#0A0A0A] sm:text-lg">
        See exactly where to tap
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
        These screenshots show the real iPhone Safari buttons.
      </p>
      <div className="mt-5 space-y-8">
        {IOS_SCREENSHOT_WALKTHROUGH.map((screenshot, index) => (
          <IosWalkthroughScreenshot
            key={screenshot.src}
            src={screenshot.src}
            alt={screenshot.alt}
            caption={screenshot.caption}
            stepNumber={index + 1}
          />
        ))}
      </div>
      <p className="mt-6 text-center text-xs leading-relaxed text-stone-500">
        Screens may look slightly different depending on your iPhone version, but
        the buttons are the same.
      </p>
    </section>
  );
}

function IosCantFindHelpBox() {
  return (
    <div className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50/80 px-4 py-4">
      <p className="text-sm font-semibold text-amber-950">
        Can&apos;t find &ldquo;Add to Home Screen&rdquo;?
      </p>
      <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-amber-900/90">
        <li>Make sure you are using Safari</li>
        <li>
          If you opened Altair from Facebook, Messenger, Gmail, or another app,
          open it in Safari first
        </li>
        <li>If you do not see Share, tap the three dots (⋯) first</li>
        <li>
          After tapping Share, scroll down to find &ldquo;Add to Home
          Screen&rdquo;
        </li>
      </ul>
    </div>
  );
}

function IosInstallWizard() {
  return (
    <InstallCardShell eyebrow="Step-by-step" title="Install Altair on iPhone">
      <div className="mt-4 space-y-2 rounded-xl border border-amber-200/70 bg-amber-50/60 px-4 py-3">
        <p className="text-sm font-medium text-amber-950">
          Apple does not allow a one-tap install button for web apps.
        </p>
        <p className="text-sm text-amber-900/85">
          This only takes about 20 seconds.
        </p>
        <p className="text-sm text-amber-900/85">
          We will walk you through it step by step.
        </p>
      </div>
      <WizardStepList steps={IOS_STEPS} />
      <IosScreenshotWalkthrough />
      <IosCantFindHelpBox />
    </InstallCardShell>
  );
}

function AndroidInstallWizard() {
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);
  const [promptChecked, setPromptChecked] = useState(false);

  const handlePromptAvailabilityChange = useCallback((available: boolean) => {
    setInstallPromptAvailable(available);
    setPromptChecked(true);
  }, []);

  return (
    <InstallCardShell eyebrow="Step-by-step" title="Install Altair on Android">
      <PwaInstallPrompt
        className="mt-5"
        variant="button-only"
        onPromptAvailabilityChange={handlePromptAvailabilityChange}
      />

      {promptChecked && !installPromptAvailable ? (
        <p className="mt-4 rounded-xl border border-stone-200/80 bg-white/70 px-4 py-3 text-sm leading-relaxed text-stone-700">
          Install button not showing? Tap the three dots (⋯) in Chrome, then tap
          Install app or Add to Home screen.
        </p>
      ) : null}

      <WizardStepList steps={ANDROID_STEPS} />
    </InstallCardShell>
  );
}

function DesktopInstallCard() {
  return (
    <InstallCardShell eyebrow="Send to your phone" title="Open this page on your phone">
      <p className="mt-4 text-sm leading-relaxed text-stone-700 sm:text-base">
        Copy this link and send it to the phone you want to install Altair on.
      </p>
    </InstallCardShell>
  );
}

function InstalledStateCard() {
  return (
    <section className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-5 py-5 sm:px-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Check className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <p className="text-base font-semibold text-emerald-900">
            Altair is installed on this device.
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-emerald-900/80">
            Open it from your home screen whenever you need it.
          </p>
        </div>
      </div>
    </section>
  );
}

function CopyButton({
  label,
  copiedLabel,
  onCopy,
}: {
  label: string;
  copiedLabel: string;
  onCopy: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await onCopy();
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 sm:flex-none ${ctaFocusClass}`}
    >
      <Copy className="h-4 w-4" aria-hidden />
      {copied ? copiedLabel : label}
    </button>
  );
}

function ShareHelpers() {
  return (
    <section className="rounded-2xl border border-stone-200/80 bg-white/80 p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
        Send to phone
      </p>
      <p className="mt-2 text-sm text-stone-600">
        Share the install link or a ready-made message with beta testers.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <CopyButton
          label="Copy install link"
          copiedLabel="Link copied"
          onCopy={async () => {
            await navigator.clipboard.writeText(getInstallPageUrl());
          }}
        />
        <CopyButton
          label="Copy beta tester message"
          copiedLabel="Message copied"
          onCopy={async () => {
            await navigator.clipboard.writeText(getBetaTesterInstallMessage());
          }}
        />
      </div>
    </section>
  );
}

function TroubleshootingSection() {
  return (
    <section className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-5 sm:p-6">
      <h2 className="text-base font-semibold text-[#0A0A0A] sm:text-lg">
        Not seeing Add to Home Screen?
      </h2>

      <div className="mt-5 space-y-5">
        <div>
          <p className="text-sm font-semibold text-stone-800">iPhone</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-stone-600">
            <li>Make sure you are using Safari</li>
            <li>
              If you opened from Facebook, Messenger, or Gmail, tap the browser
              icon or open in Safari first
            </li>
            <li>
              Use the Share button in Safari, not long-press on a link
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-800">Android</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-stone-600">
            <li>Use Chrome</li>
            <li>If Install does not appear, use the three-dot menu</li>
            <li>Make sure the page is loaded over HTTPS</li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-800">
            Already installed
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-stone-600">
            <li>Open Altair from the home screen icon</li>
            <li>
              If you deleted it, reopen this page in Safari/Chrome and add it
              again
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function IosStickyHint() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 border-t border-[#D4AF37]/25 bg-[#FFFCF8]/95 px-5 py-2.5 shadow-[0_-4px_20px_rgba(10,10,10,0.08)] backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium text-[#9A7209]">
          ⬆️ Next: tap Share at the bottom
        </p>
        <p className="mt-0.5 text-xs text-[#9A7209]/80">
          If you do not see it, tap ⋯ first
        </p>
      </div>
    </div>
  );
}

function detectInstallPlatform(): InstallPlatform {
  if (isIosDevice()) {
    return "ios";
  }

  if (isAndroidDevice()) {
    return "android";
  }

  return "desktop";
}

function PlatformWizard({ platform }: { platform: InstallPlatform }) {
  if (platform === "ios") {
    return <IosInstallWizard />;
  }

  if (platform === "android") {
    return <AndroidInstallWizard />;
  }

  return <DesktopInstallCard />;
}

export function InstallPageView() {
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");
  const [standalone, setStandalone] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setPlatform(detectInstallPlatform());
    setStandalone(isStandaloneDisplayMode());
  }, []);

  const showIosStickyHint = hydrated && platform === "ios" && !standalone;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-stone-50 via-white to-stone-100/80">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

      <header className="relative border-b border-stone-200/80 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/login"
            className={`shrink-0 ${ctaFocusClass} rounded-sm`}
            aria-label="Altair OS — Sign in"
          >
            <AltairLogo variant="primary" size="sm" showWordmark />
          </Link>
          <Link
            href="/login"
            className={`text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 ${ctaFocusClass} rounded-sm`}
          >
            Sign in
          </Link>
        </div>
      </header>

      <main
        className={`relative mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-12 ${
          showIosStickyHint
            ? "pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))]"
            : "pb-[max(2rem,env(safe-area-inset-bottom))]"
        }`}
      >
        <div className="auth-hero-enter text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7209]">
            Mobile install
          </p>
          <h1 className="mt-3 text-[1.875rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.125rem]">
            {hydrated && standalone
              ? "Altair is on your home screen"
              : "Add Altair to your home screen"}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-stone-600">
            {hydrated && standalone
              ? "Launch Altair from your home screen icon."
              : "Follow a few quick steps and you're done."}
          </p>
        </div>

        <div className="auth-panel-enter mt-8 space-y-4">
          {hydrated && standalone ? (
            <InstalledStateCard />
          ) : (
            <PlatformWizard platform={platform} />
          )}

          {!standalone ? (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/login"
                  className={`inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#0A0A0A] px-5 py-3 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(10,10,10,0.22),0_4px_18px_rgba(212,175,55,0.2)] ring-1 ring-[#D4AF37]/30 transition-colors hover:bg-[#141414] sm:flex-none ${ctaFocusClass}`}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Open Altair
                </Link>
                <CopyButton
                  label="Copy install link"
                  copiedLabel="Link copied"
                  onCopy={async () => {
                    await navigator.clipboard.writeText(getInstallPageUrl());
                  }}
                />
              </div>

              <ShareHelpers />
            </>
          ) : null}
        </div>

        {!standalone ? <div className="mt-8"><TroubleshootingSection /></div> : null}

        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-[11px] text-stone-400">
          <MessageSquare className="h-3 w-3" aria-hidden />
          Beta testers · Add Altair to your home screen for quick access
        </p>

        <PwaInstallDebugPanel />
      </main>

      {showIosStickyHint ? <IosStickyHint /> : null}
    </div>
  );
}
