"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
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

type CompactStep = {
  emoji: string;
  label: string;
};

const IOS_QUICK_STEPS = [
  "Tap the three dots (⋯) beside the website bar",
  "Tap Share",
  'Scroll down and tap Add to Home Screen',
  'Tap Add',
] as const;

const IOS_COMPACT_STEPS: CompactStep[] = [
  { emoji: "⋯", label: "Tap three dots" },
  { emoji: "⬆️", label: "Tap Share" },
  { emoji: "⬇️", label: "Scroll down" },
  { emoji: "➕", label: "Add to Home Screen" },
  { emoji: "✅", label: "Tap Add" },
  { emoji: "📱", label: "Open from home screen" },
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

const ANDROID_COMPACT_STEPS: CompactStep[] = [
  { emoji: "🌐", label: "Open in Chrome" },
  { emoji: "📲", label: "Tap Install if shown" },
  { emoji: "⋯", label: "Or tap three-dot menu" },
  { emoji: "➕", label: "Install app or Add to Home screen" },
  { emoji: "📱", label: "Open from home screen" },
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

function CompactStepList({ steps }: { steps: CompactStep[] }) {
  return (
    <ul className="mt-4 divide-y divide-stone-200/80 rounded-xl border border-stone-200/80 bg-white/60">
      {steps.map((step) => (
        <li
          key={step.label}
          className="flex items-center gap-3 px-3.5 py-2.5 text-sm text-stone-700"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FAF4E8] text-base ring-1 ring-[#D4AF37]/20"
            aria-hidden
          >
            {step.emoji}
          </span>
          <span className="font-medium text-[#0A0A0A]">{step.label}</span>
        </li>
      ))}
    </ul>
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
    <figure className="flex flex-col">
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className={`group block rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/20 ${ctaFocusClass}`}
        aria-label={`${caption} — open full-size screenshot`}
      >
        <div className="flex max-h-[min(420px,55vh)] items-center justify-center overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-[0_2px_8px_rgba(10,10,10,0.06)] sm:max-h-[460px]">
          <Image
            src={src}
            alt={alt}
            width={IPHONE_SCREENSHOT_WIDTH}
            height={IPHONE_SCREENSHOT_HEIGHT}
            sizes="(max-width: 640px) 90vw, 280px"
            className="max-h-[min(420px,55vh)] w-full object-contain sm:max-h-[460px]"
            onError={() => setVisible(false)}
          />
        </div>
        <p className="mt-1.5 text-center text-[11px] text-stone-400 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          Tap to open full size
        </p>
      </a>
      <figcaption className="mt-2 text-center text-xs leading-relaxed text-stone-600 sm:text-sm">
        <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#FAF4E8] text-xs font-bold text-[#9A7209] ring-1 ring-[#D4AF37]/25">
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
      className="mt-6 rounded-xl border border-stone-200/80 bg-white/70 p-4 sm:p-5"
      aria-label="iPhone install screenshot walkthrough"
    >
      <h3 className="text-sm font-semibold text-[#0A0A0A] sm:text-base">
        See exactly where to tap
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-stone-500 sm:text-sm">
        Optional visual guide — tap any photo to open it full size.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
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
    </section>
  );
}

function IosInstallWizard() {
  return (
    <InstallCardShell eyebrow="Quick install" title="Install Altair on iPhone">
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        Apple does not allow a one-tap install button for web apps, but this
        only takes about 20 seconds.
      </p>

      <ol className="mt-4 space-y-2 rounded-xl border border-[#D4AF37]/25 bg-[#FAF4E8]/40 px-4 py-3.5">
        {IOS_QUICK_STEPS.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm leading-snug text-[#0A0A0A]">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#9A7209] ring-1 ring-[#D4AF37]/30">
              {index + 1}
            </span>
            <span className="pt-0.5 font-medium">{step}</span>
          </li>
        ))}
      </ol>

      <CompactStepList steps={IOS_COMPACT_STEPS} />
      <IosScreenshotWalkthrough />
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
    <InstallCardShell eyebrow="Quick install" title="Install Altair on Android">
      <PwaInstallPrompt
        className="mt-4"
        variant="button-only"
        onPromptAvailabilityChange={handlePromptAvailabilityChange}
      />

      {promptChecked && !installPromptAvailable ? (
        <p className="mt-3 rounded-xl border border-stone-200/80 bg-white/70 px-3.5 py-2.5 text-sm leading-relaxed text-stone-700">
          Install button not showing? Tap the three dots (⋯) in Chrome, then tap
          Install app or Add to Home screen.
        </p>
      ) : null}

      <CompactStepList steps={ANDROID_COMPACT_STEPS} />
    </InstallCardShell>
  );
}

function DesktopInstallCard() {
  return (
    <InstallCardShell eyebrow="Send to your phone" title="Open this page on your phone">
      <p className="mt-3 text-sm leading-relaxed text-stone-700">
        Copy the install link below and send it to the phone you want to install
        Altair on.
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
  compact = false,
}: {
  label: string;
  copiedLabel: string;
  onCopy: () => Promise<void>;
  compact?: boolean;
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 ${ctaFocusClass} ${
        compact
          ? "min-h-[40px] px-3.5 py-2 text-xs"
          : "min-h-[48px] flex-1 px-5 py-3 text-sm sm:flex-none"
      }`}
    >
      <Copy className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
      {copied ? copiedLabel : label}
    </button>
  );
}

function ShareHelpers() {
  return (
    <section className="rounded-xl border border-stone-200/70 bg-white/60 px-4 py-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
            Send to phone
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
            Copy a ready-made message for beta testers.
          </p>
        </div>
        <CopyButton
          label="Copy beta tester message"
          copiedLabel="Message copied"
          compact
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
    <details className="group rounded-xl border border-stone-200/80 bg-stone-50/80">
      <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold text-[#0A0A0A] marker:content-none sm:text-base [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          Having trouble?
          <span className="text-xs font-normal text-stone-400 group-open:hidden">
            Tap to expand
          </span>
        </span>
      </summary>

      <div className="space-y-4 border-t border-stone-200/70 px-4 py-4 text-sm leading-relaxed text-stone-600">
        <div>
          <p className="font-semibold text-stone-800">iPhone</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            <li>Use Safari</li>
            <li>Tap ⋯ beside the website bar</li>
            <li>Tap Share</li>
            <li>Scroll down to Add to Home Screen</li>
            <li>
              If opened from Facebook/Messenger/Gmail, open in Safari first
            </li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-stone-800">Android</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            <li>Use Chrome</li>
            <li>Tap Install if shown</li>
            <li>Or use three-dot menu → Install app / Add to Home screen</li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-stone-800">Already installed</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            <li>Open Altair from home screen</li>
            <li>If deleted, reopen /install and add it again</li>
          </ul>
        </div>
      </div>
    </details>
  );
}

function IosStickyHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    function updateVisibility() {
      const scrollBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 140;
      setVisible(!scrollBottom);
    }

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 border-t border-[#D4AF37]/25 bg-[#FFFCF8]/95 px-5 py-2.5 shadow-[0_-4px_20px_rgba(10,10,10,0.08)] backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-medium text-[#9A7209]">
          ⋯ Next: tap the three dots by altair-op.com
        </p>
        <p className="mt-0.5 text-xs text-[#9A7209]/80">
          Then tap Share → Add to Home Screen
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
            ? "pb-[max(6rem,calc(env(safe-area-inset-bottom)+5rem))]"
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
              : "Do these few steps and you're done."}
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

        {!standalone ? (
          <div className="mt-6">
            <TroubleshootingSection />
          </div>
        ) : null}

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-stone-400">
          <MessageSquare className="h-3 w-3" aria-hidden />
          Beta testers · Add Altair to your home screen for quick access
        </p>

        <PwaInstallDebugPanel />
      </main>

      {showIosStickyHint ? <IosStickyHint /> : null}
    </div>
  );
}
