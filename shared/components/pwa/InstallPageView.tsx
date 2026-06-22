"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Share,
  Smartphone,
} from "lucide-react";
import { AltairLogo } from "@/shared/components/brand/AltairLogo";
import { PwaInstallPrompt } from "./PwaInstallPrompt";
import { isAndroidDevice, isIosDevice } from "./pwa-utils";

const ctaFocusClass =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4AF37]/20";

type InstallPlatform = "ios" | "android" | "desktop";

const INSTALL_GUIDANCE: Record<
  InstallPlatform,
  { title: string; message: string; steps: string[] }
> = {
  ios: {
    title: "Install Altair on iPhone",
    message:
      "Apple does not show an install button. Use Safari, tap Share, then Add to Home Screen.",
    steps: [
      "Open this page in Safari",
      "Tap the Share button",
      "Tap Add to Home Screen",
      "Tap Add",
    ],
  },
  android: {
    title: "Install Altair on Android",
    message:
      "Tap the Install button if it appears. If not, open Chrome menu and choose Install app or Add to Home screen.",
    steps: [
      "Open this page in Chrome",
      "Tap Install if shown",
      "Or tap the 3-dot menu",
      "Tap Install app / Add to Home screen",
    ],
  },
  desktop: {
    title: "Install Altair on your phone",
    message:
      "Open this page on your phone, or copy the link and send it to your phone.",
    steps: [],
  },
};

function PrimaryInstallCard({
  platform,
}: {
  platform: InstallPlatform;
}) {
  const { title, message, steps } = INSTALL_GUIDANCE[platform];

  return (
    <section className="rounded-2xl border-2 border-[#D4AF37]/35 border-t-[4px] border-t-[#D4AF37]/70 bg-gradient-to-b from-white via-[#FFFCF8] to-[#FAF7F2] p-5 shadow-[0_4px_8px_rgba(10,10,10,0.06),0_16px_40px_rgba(10,10,10,0.1)] ring-1 ring-[#D4AF37]/18 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FAF4E8] text-[#9A7209] shadow-sm ring-1 ring-[#D4AF37]/25">
          <Smartphone className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A7209]">
            How to install
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#0A0A0A] sm:text-xl">
            {title}
          </h2>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-stone-700 sm:text-base">
        {message}
      </p>

      {steps.length > 0 ? (
        <ol className="mt-5 space-y-3">
          {steps.map((step, index) => (
            <li
              key={step}
              className="flex gap-3 text-sm leading-relaxed text-stone-700"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FAF4E8] text-xs font-semibold text-[#9A7209]">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function CopyAppLinkButton() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 sm:flex-none ${ctaFocusClass}`}
    >
      <Copy className="h-4 w-4" aria-hidden />
      {copied ? "Link copied" : "Copy app link"}
    </button>
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

export function InstallPageView() {
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");

  useEffect(() => {
    setPlatform(detectInstallPlatform());
  }, []);

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

      <main className="relative mx-auto max-w-3xl px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-12">
        <div className="auth-hero-enter text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7209]">
            Mobile install
          </p>
          <h1 className="mt-3 text-[1.875rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.125rem]">
            Add Altair to your home screen
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-stone-600">
            Open Altair like an app from your phone.
          </p>
        </div>

        <div className="auth-panel-enter mt-8 space-y-4">
          <PrimaryInstallCard platform={platform} />

          <PwaInstallPrompt className="w-full" />

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className={`inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#0A0A0A] px-5 py-3 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(10,10,10,0.22),0_4px_18px_rgba(212,175,55,0.2)] ring-1 ring-[#D4AF37]/30 transition-colors hover:bg-[#141414] sm:flex-none ${ctaFocusClass}`}
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
              Open Altair
            </Link>
            <CopyAppLinkButton />
          </div>
        </div>

        <div className="auth-panel-enter mt-8 space-y-4">
          <section className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-5 py-4">
            <div className="flex items-start gap-3">
              <Check
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                aria-hidden
              />
              <div>
                <h2 className="text-sm font-semibold text-emerald-950">
                  Already installed?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-emerald-900/80">
                  Open Altair from your home screen icon — it launches full
                  screen like a native app.
                </p>
              </div>
            </div>
          </section>
        </div>

        <p className="mt-8 text-center text-xs text-stone-500">
          Use Safari on iPhone and Chrome on Android for the best install
          experience.
        </p>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-stone-400">
          <Share className="h-3 w-3" aria-hidden />
          Beta testers · Add Altair to your home screen for quick access
        </p>
      </main>
    </div>
  );
}
