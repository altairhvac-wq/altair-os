"use client";

import { useEffect, useRef } from "react";
import { COMMERCIAL_CHAPTERS, COMMERCIAL_VIDEO } from "@/shared/lib/site/commercial-video";

/**
 * The commercial as the main content of /how-it-works: a plain player with
 * sound and controls (nothing autoplays), chapter buttons that seek, and
 * `?t=<seconds>` support so the chapter links in the page's VideoObject
 * (Google "key moments") land on the right moment.
 */
export function CommercialVideoPlayer() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const t = Number(new URLSearchParams(window.location.search).get("t"));
    const video = ref.current;
    if (!video || !Number.isFinite(t) || t <= 0) return;
    const seek = () => {
      video.currentTime = t;
    };
    if (video.readyState >= 1) seek();
    else video.addEventListener("loadedmetadata", seek, { once: true });
  }, []);

  const jump = (seconds: number) => {
    const video = ref.current;
    if (!video) return;
    video.currentTime = seconds;
    video.play().catch(() => undefined);
  };

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-[rgba(230,227,220,0.14)] bg-black shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]">
        <video
          ref={ref}
          className="block aspect-video w-full bg-black"
          src={COMMERCIAL_VIDEO.file}
          poster={COMMERCIAL_VIDEO.poster}
          controls
          playsInline
          preload="metadata"
          aria-label={COMMERCIAL_VIDEO.title}
        />
      </div>
      <ol className="mt-4 flex flex-wrap gap-2" aria-label="Chapters">
        {COMMERCIAL_CHAPTERS.map((chapter) => (
          <li key={chapter.seconds}>
            <button
              type="button"
              onClick={() => jump(chapter.seconds)}
              className="rounded-full border border-[rgba(230,227,220,0.14)] bg-[rgba(24,28,22,0.55)] px-3 py-1.5 text-left text-xs text-[#c9bfae] transition-colors hover:border-[#c2a05a]/60 hover:text-[#fff9ea] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55"
            >
              <span className="font-semibold text-[#c2a05a]">{chapter.at}</span> {chapter.label}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
