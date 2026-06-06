import Image from "next/image";
import {
  FOUNDING_BETA_OFFER,
  FOUNDING_PLANS,
} from "@/shared/data/founding-pricing";

type ProductScreenshotPlaceholderProps = {
  alt: string;
  label: string;
  src?: string;
  className?: string;
};

export function ProductScreenshotPlaceholder({
  alt,
  label,
  src,
  className = "",
}: ProductScreenshotPlaceholderProps) {
  const frameClass = [
    "group/image relative overflow-hidden rounded-xl border border-[#D4AF37]/22 bg-[#0A0A0A] shadow-[0_14px_44px_rgba(0,0,0,0.42),0_4px_14px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(245,230,163,0.12)] motion-safe:transition-[border-color,box-shadow] motion-safe:duration-300 motion-safe:hover:border-[#D4AF37]/38 motion-safe:hover:shadow-[0_18px_52px_rgba(0,0,0,0.48),0_6px_20px_rgba(212,175,55,0.12),inset_0_1px_0_rgba(245,230,163,0.16)]",
    className,
  ].join(" ");

  if (src) {
    return (
      <div className={`${frameClass} relative aspect-[16/10] w-full`}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 560px"
          className="object-cover object-top"
        />
      </div>
    );
  }

  return (
    <div className={frameClass} role="img" aria-label={alt}>
      <div className="auth-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="auth-grid-fine pointer-events-none absolute inset-0 opacity-25" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_35%,rgba(212,175,55,0.08)_0%,transparent_65%)]" />

      <div className="relative flex aspect-[16/10] w-full flex-col">
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
