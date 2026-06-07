"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Expand, X } from "lucide-react";
import { ModalPortal } from "@/shared/components/ui/ModalPortal";
import { useScrollLock, useSheetEscape } from "@/shared/hooks/useScrollLock";

/** Typical marketing screenshot dimensions (~2560×1370); used for layout ratio only. */
const SCREENSHOT_INTRINSIC_WIDTH = 2560;
const SCREENSHOT_INTRINSIC_HEIGHT = 1440;

type ProductScreenshotPlaceholderProps = {
  alt: string;
  label: string;
  src?: string;
  className?: string;
};

type ScreenshotLightboxProps = {
  src: string;
  alt: string;
  onClose: () => void;
};

function ScreenshotLightbox({ src, alt, onClose }: ScreenshotLightboxProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useScrollLock(true);
  useSheetEscape(onClose, true);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          aria-label="Close screenshot preview"
          onClick={onClose}
          className="absolute inset-0 bg-[#0A0A0A]/80 backdrop-blur-[2px]"
        />
        <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-[#D4AF37]/28 bg-[#0A0A0A] shadow-[0_24px_64px_rgba(0,0,0,0.55),0_8px_24px_rgba(212,175,55,0.12)] sm:max-h-[90vh] sm:rounded-2xl">
          <header className="flex shrink-0 items-center gap-3 border-b border-[#D4AF37]/16 px-4 py-3">
            <h2
              id={titleId}
              className="min-w-0 flex-1 truncate text-sm font-semibold text-white"
            >
              {alt}
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#D4AF37]/22 text-neutral-400 transition-colors hover:border-[#D4AF37]/38 hover:bg-[#D4AF37]/8 hover:text-[#D4AF37]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-3 sm:p-4">
            <Image
              src={src}
              alt={alt}
              width={SCREENSHOT_INTRINSIC_WIDTH}
              height={SCREENSHOT_INTRINSIC_HEIGHT}
              sizes="(max-width: 768px) 100vw, 1024px"
              quality={90}
              className="mx-auto max-h-[calc(92vh-4.5rem)] w-auto max-w-full rounded-lg object-contain sm:max-h-[calc(90vh-4.5rem)]"
              priority
            />
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

export function ProductScreenshotPlaceholder({
  alt,
  label,
  src,
  className = "",
}: ProductScreenshotPlaceholderProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const frameClass = [
    "group/image relative overflow-hidden rounded-xl border border-[#D4AF37]/22 bg-[#0A0A0A] shadow-[0_14px_44px_rgba(0,0,0,0.42),0_4px_14px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(245,230,163,0.12)] motion-safe:transition-[border-color,box-shadow] motion-safe:duration-300 motion-safe:hover:border-[#D4AF37]/38 motion-safe:hover:shadow-[0_18px_52px_rgba(0,0,0,0.48),0_6px_20px_rgba(212,175,55,0.12),inset_0_1px_0_rgba(245,230,163,0.16)]",
    className,
  ].join(" ");

  if (src) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className={`${frameClass} relative aspect-[16/9] w-full cursor-zoom-in text-left`}
          aria-label={`View larger: ${alt}`}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 640px) 95vw, (max-width: 1024px) 45vw, 640px"
            quality={90}
            className="object-contain object-center"
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0A0A0A]/70 via-[#0A0A0A]/20 to-transparent pb-2.5 pt-6" />
          <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/28 bg-[#0A0A0A]/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#D4AF37]/90 shadow-sm motion-safe:transition-opacity motion-safe:duration-200 sm:bottom-2.5 sm:right-2.5 sm:px-2.5 sm:py-1 sm:text-[11px]">
            <Expand className="h-3 w-3 shrink-0 opacity-90" aria-hidden="true" />
            Click to enlarge
          </span>
        </button>

        {isLightboxOpen ? (
          <ScreenshotLightbox
            src={src}
            alt={alt}
            onClose={() => setIsLightboxOpen(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className={frameClass} role="img" aria-label={alt}>
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="auth-grid-fine pointer-events-none absolute inset-0 opacity-25" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_35%,rgba(212,175,55,0.08)_0%,transparent_65%)]" />

      <div className="relative flex aspect-[16/9] w-full flex-col">
        <div className="flex items-center gap-2 border-b border-[#D4AF37]/12 px-3 py-2 sm:px-4">
          <span className="h-2 w-2 rounded-full bg-[#D4AF37]/35" aria-hidden="true" />
          <span className="h-2 w-2 rounded-full bg-[#D4AF37]/22" aria-hidden="true" />
          <span className="h-2 w-2 rounded-full bg-[#D4AF37]/14" aria-hidden="true" />
          <span className="ml-2 truncate text-[10px] font-medium tracking-wide text-neutral-500">
            Altair OS
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-6 sm:gap-4 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D4AF37]/24 bg-[#D4AF37]/8 sm:h-12 sm:w-12">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-[#D4AF37]/70 sm:h-6 sm:w-6"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M3 9h18M9 21V9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D4AF37]/75 sm:text-xs">
            Screenshot placeholder
          </p>
          <p className="max-w-[16rem] text-center text-xs leading-relaxed text-neutral-500 sm:text-sm">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
