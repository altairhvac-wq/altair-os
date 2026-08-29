"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { HomepageHeroMedia } from "@/shared/components/homepage/homepage-hero-media";

type HomepageHeroBackgroundProps = {
  media: HomepageHeroMedia;
};

/**
 * Full-bleed Scene 1 media plane.
 * Image or looping video via a single `media` prop — trivial to replace.
 * Motion is restrained: optional slow loop + near-invisible parallax.
 */
export function HomepageHeroBackground({ media }: HomepageHeroBackgroundProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const layer = layerRef.current;
    if (!layer) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        // ~2% travel across the first viewport — nearly invisible.
        const shift = Math.min(y * 0.08, 48);
        layer.style.transform = `translate3d(0, ${shift}px, 0) scale(1.04)`;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduceMotion]);

  const showVideo = media.type === "video" && !reduceMotion;
  const stillSrc =
    media.type === "image"
      ? media.src
      : media.poster ?? null;
  const alt = media.alt;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        ref={layerRef}
        className="ah-hero-media absolute inset-0 will-change-transform"
        style={{
          transform: reduceMotion
            ? undefined
            : "translate3d(0, 0, 0) scale(1.04)",
        }}
      >
        {showVideo ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster={media.poster}
            aria-label={alt}
          >
            <source src={media.src} />
          </video>
        ) : stillSrc ? (
          <Image
            src={stillSrc}
            alt={alt}
            fill
            priority
            sizes="100vw"
            quality={90}
            className="object-cover object-[72%_40%] sm:object-[center_42%] lg:object-center"
          />
        ) : (
          <div
            className="absolute inset-0 bg-[#0c0f0b]"
            role="img"
            aria-label={alt}
          />
        )}
      </div>

      {/* Readability scrims — slightly lighter for alive environment, strong text contrast */}
      <div
        className="absolute inset-0 bg-[linear-gradient(105deg,rgba(8,9,12,0.64)_0%,rgba(8,9,12,0.36)_38%,rgba(8,9,12,0.14)_62%,rgba(8,9,12,0.28)_100%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,9,12,0.8)_0%,rgba(8,9,12,0.38)_28%,rgba(8,9,12,0.08)_52%,rgba(8,9,12,0.22)_100%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,rgba(8,9,12,0.45),transparent)]"
        aria-hidden="true"
      />
    </div>
  );
}
