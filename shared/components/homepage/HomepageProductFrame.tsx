import Image from "next/image";

type HomepageProductFrameProps = {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
};

/**
 * Product stage: maximize application pixels.
 * Thin silver edge + soft depth only — no browser chrome, no perspective.
 */
export function HomepageProductFrame({
  src,
  alt,
  priority = false,
  className = "",
  sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 58vw, 820px",
}: HomepageProductFrameProps) {
  return (
    <div className={`mc-product-frame relative ${className}`.trim()}>
      <div
        className="pointer-events-none absolute -inset-[10%] rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(210,216,224,0.14)_0%,rgba(210,216,224,0.04)_42%,transparent_70%)]"
        aria-hidden="true"
      />
      <div
        className="relative overflow-hidden rounded-xl sm:rounded-2xl"
        style={{
          background:
            "linear-gradient(155deg, rgba(230,236,244,0.42) 0%, rgba(170,178,190,0.18) 28%, rgba(40,46,56,0.55) 62%, rgba(12,14,18,0.98) 100%)",
          padding: "1px",
          boxShadow:
            "0 40px 90px -36px rgba(0,0,0,0.85), 0 0 0 1px rgba(222,228,236,0.14), 0 1px 0 rgba(230,236,244,0.22) inset",
        }}
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[0.7rem] bg-[#0a0c10] sm:rounded-[0.95rem]">
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            quality={90}
            sizes={sizes}
            className="object-cover object-left-top"
          />
        </div>
      </div>
    </div>
  );
}
