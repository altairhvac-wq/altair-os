import Image from "next/image";
import {
  ALTAIR_BRAND_MARK_PRESENTATIONS,
  type AltairBrandPresentation,
} from "@/shared/components/brand/brand-assets";

export type AltairBrandMarkProps = {
  /** Cropped presentation derived from the approved concept-v1 reference. */
  presentation: AltairBrandPresentation;
  className?: string;
  priority?: boolean;
};

/**
 * Approved Version 1 brand lockup — raster crops from `altair-logo-concept-v1.png`.
 * Use for high-impact brand surfaces (auth hero, header chrome, branded loading).
 *
 * For compact operational UI (technician shell, document footers), use the
 * secondary `<AltairLogo />` vector fallback instead.
 */
export function AltairBrandMark({
  presentation,
  className = "",
  priority = false,
}: AltairBrandMarkProps) {
  const config = ALTAIR_BRAND_MARK_PRESENTATIONS[presentation];

  return (
    <Image
      src={config.src}
      alt="Altair"
      width={config.intrinsicWidth}
      height={config.intrinsicHeight}
      priority={priority}
      sizes={config.sizes}
      className={`h-auto w-auto max-w-full shrink-0 ${className}`.trim()}
    />
  );
}
