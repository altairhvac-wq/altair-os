"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

const PREVIEW_SRC = "/marketing/video/altair-commercial-preview.mp4";
const FULL_SRC = "/marketing/video/altair-commercial.mp4";
const POSTER_SRC = "/marketing/video/altair-commercial-poster.webp";

/**
 * Homepage/login hero: the Altair Operating System commercial.
 * Until the visitor asks for it, a 30-second cut loops muted (1.3 MB, no sound track). Visitors who
 * prefer reduced motion see the poster instead. "Watch" swaps in the full 2:27 commercial with sound
 * and controls; that file is only requested on click.
 */
export function HeroCommercialVideo() {
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
    video.src = FULL_SRC;
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
        src={PREVIEW_SRC}
        poster={POSTER_SRC}
        muted
        loop
        autoPlay={!reducedMotion && !full}
        playsInline
        preload={reducedMotion ? "none" : "auto"}
        aria-label="Altair Operating System commercial: one job from first call to paid"
      />
      {!full ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0b09]/80 via-transparent to-transparent" />
          <button
            type="button"
            onClick={watch}
            className="group absolute bottom-3 left-3 flex items-center gap-2.5 rounded-full border border-[#c2a05a]/50 bg-[#0a0b09]/80 py-1.5 pl-1.5 pr-4 text-left text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.9)] backdrop-blur-sm transition hover:border-[#e2c47e] hover:bg-[#0a0b09]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/60 sm:bottom-4 sm:left-4"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-b from-[#f5e6a3] to-[#c2a05a] text-[#0a0907] transition group-hover:scale-105">
              <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-xs font-semibold sm:text-sm">Watch one job, start to finish</span>
              <span className="text-[10px] text-slate-300 sm:text-[11px]">2:27 · with sound</span>
            </span>
          </button>
        </>
      ) : null}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10 ring-inset" />
    </div>
  );
}
