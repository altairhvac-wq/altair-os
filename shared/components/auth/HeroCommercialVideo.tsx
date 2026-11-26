"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

export type HeroVideoSource = {
  /** Muted, small loop shown until the visitor presses Watch. */
  preview: string;
  /** Full-quality file with sound; only requested on click. */
  full: string;
  poster: string;
  /** Watch button: main line and the small line under it. */
  watchLabel: string;
  watchDetail: string;
  ariaLabel: string;
  /** "corner" = small pill bottom-left (the brand film); "center" = a large play button in the middle. */
  button?: "corner" | "center";
};

/** "Before Dawn", the brand film (owner 2026-11-20: "Put it on the website too"). Shown on the login page. */
export const BEFORE_DAWN_VIDEO: HeroVideoSource = {
  preview: "/marketing/video/before-dawn-preview.mp4",
  full: "/marketing/video/before-dawn.mp4",
  poster: "/marketing/video/before-dawn-poster.webp",
  watchLabel: "Watch the film",
  watchDetail: "0:40 · with sound",
  ariaLabel: "Before Dawn: the Altair Operating System film. Film scenes are AI-generated; app screens are the real product with sample data.",
};

/**
 * Hero video (homepage: the product tour, shared/lib/site/product-tour-video.ts; login: "Before Dawn").
 * Until the visitor asks for it, a short muted preview loops at a small size (no sound track).
 * Visitors who prefer reduced motion see the poster instead. "Watch" swaps in the full-quality file
 * with sound and controls; that file is only requested on click. The step-by-step one-job demo (2:27)
 * stays on /how-it-works (shared/lib/site/commercial-video.ts).
 */
export function HeroCommercialVideo({ video: source = BEFORE_DAWN_VIDEO }: { video?: HeroVideoSource }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [full, setFull] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video || full) return;
    if (reducedMotion) {
      video.pause();
      return;
    }
    // The first render uses preload="none" (until the motion preference is known), so ask for the file now.
    if (video.readyState === 0) video.load();
    video.play().catch(() => undefined);
  }, [reducedMotion, full]);

  const watch = () => {
    const video = ref.current;
    if (!video) return;
    setFull(true);
    video.src = source.full;
    video.muted = false;
    video.loop = false;
    video.controls = true;
    video.currentTime = 0;
    video.play().catch(() => undefined);
  };

  return (
    <div className="relative aspect-video">
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full bg-black object-cover"
        src={source.preview}
        poster={source.poster}
        muted
        loop
        autoPlay={!reducedMotion && !full}
        playsInline
        preload={reducedMotion ? "none" : "auto"}
        aria-label={source.ariaLabel}
      />
      {!full ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0b09]/80 via-transparent to-transparent" />
          {source.button === "center" ? (
            <button
              type="button"
              onClick={watch}
              className="group absolute inset-0 flex flex-col items-center justify-center gap-3 text-white focus-visible:outline-none"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#f5e6a3] to-[#c2a05a] text-[#0a0907] shadow-[0_0_0_10px_rgba(194,160,90,0.18),0_20px_50px_-10px_rgba(0,0,0,0.9)] transition group-hover:scale-105 group-focus-visible:ring-4 group-focus-visible:ring-[#c2a05a]/60 sm:h-20 sm:w-20">
                <Play className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8" aria-hidden="true" />
              </span>
              <span className="rounded-full bg-[#0a0b09]/75 px-4 py-1.5 text-center leading-tight backdrop-blur-sm">
                <span className="block text-sm font-semibold sm:text-base">{source.watchLabel}</span>
                <span className="block text-[11px] text-slate-300 sm:text-xs">{source.watchDetail}</span>
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={watch}
              className="group absolute bottom-3 left-3 flex items-center gap-2.5 rounded-full border border-[#c2a05a]/50 bg-[#0a0b09]/80 py-1.5 pl-1.5 pr-4 text-left text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.9)] backdrop-blur-sm transition hover:border-[#e2c47e] hover:bg-[#0a0b09]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/60 sm:bottom-4 sm:left-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-[#f5e6a3] to-[#c2a05a] text-[#0a0907] transition group-hover:scale-105">
                <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-xs font-semibold sm:text-sm">{source.watchLabel}</span>
                <span className="text-[10px] text-slate-300 sm:text-[11px]">{source.watchDetail}</span>
              </span>
            </button>
          )}
        </>
      ) : null}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10 ring-inset" />
    </div>
  );
}
