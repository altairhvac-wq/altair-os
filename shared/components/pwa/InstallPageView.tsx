"use client";

import Link from "next/link";
import { useState } from "react";
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

function InstallSteps({
  title,
  steps,
}: {
  title: string;
  steps: string[];
}) {
  return (
    <section className="rounded-2xl border border-stone-200/80 border-t-[3px] border-t-[#D4AF37]/55 bg-gradient-to-b from-white via-[#FFFCF8] to-[#FAF7F2] p-5 shadow-[0_4px_8px_rgba(10,10,10,0.06),0_12px_32px_rgba(10,10,10,0.08)] ring-1 ring-[#D4AF37]/14 sm:p-6">
      <h2 className="text-base font-semibold tracking-tight text-[#0A0A0A]">
        {title}
      </h2>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3 text-sm leading-relaxed text-stone-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FAF4E8] text-xs font-semibold text-[#9A7209]">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
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

export function InstallPageView() {
  const [platformHint, setPlatformHint] = useState<"ios" | "android" | null>(
    null,
  );

  function detectPlatform() {
    if (isIosDevice()) {
      setPlatformHint("ios");
      return;
    }

    if (isAndroidDevice()) {
      setPlatformHint("android");
    }
  }

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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAF4E8] text-[#9A7209] shadow-[0_4px_16px_rgba(154,114,9,0.12)] ring-1 ring-[#D4AF37]/25">
            <Smartphone className="h-7 w-7" aria-hidden />
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9A7209]">
            Mobile install
          </p>
          <h1 className="mt-3 text-[1.875rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.125rem]">
            Install Altair on your phone
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-stone-600">
            Open Altair like an app from your home screen.
          </p>
        </div>

        <div className="auth-panel-enter mt-8 space-y-4">
          <PwaInstallPrompt className="flex justify-center" />

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
          {platformHint === "ios" ? (
            <InstallSteps
              title="iPhone / iPad"
              steps={[
                "Open this page in Safari",
                "Tap Share at the bottom of the screen",
                "Tap Add to Home Screen",
                "Tap Add",
              ]}
            />
          ) : platformHint === "android" ? (
            <InstallSteps
              title="Android"
              steps={[
                "Open this page in Chrome",
                "Tap Install when prompted",
                "Or tap the browser menu and choose Add to Home screen / Install app",
              ]}
            />
          ) : (
            <>
              <InstallSteps
                title="iPhone / iPad"
                steps={[
                  "Open this page in Safari",
                  "Tap Share at the bottom of the screen",
                  "Tap Add to Home Screen",
                  "Tap Add",
                ]}
              />
              <InstallSteps
                title="Android"
                steps={[
                  "Open this page in Chrome",
                  "Tap Install when prompted",
                  "Or tap the browser menu and choose Add to Home screen / Install app",
                ]}
              />
            </>
          )}

          <section className="rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-5 py-4">
            <div className="flex items-start gap-3">
              <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
              <div>
                <h2 className="text-sm font-semibold text-emerald-950">
                  Already installed?
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-emerald-900/80">
                  Open Altair from your home screen icon — it launches full screen
                  like a native app.
                </p>
              </div>
            </div>
          </section>
        </div>

        <p className="mt-8 text-center text-xs text-stone-500">
          <button
            type="button"
            onClick={detectPlatform}
            className="font-medium text-[#9A7209] underline-offset-2 hover:underline"
          >
            Show steps for my device
          </button>
          {" · "}
          Use Safari on iPhone and Chrome on Android for the best install experience.
        </p>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-stone-400">
          <Share className="h-3 w-3" aria-hidden />
          Beta testers · Add Altair to your home screen for quick access
        </p>
      </main>
    </div>
  );
}
