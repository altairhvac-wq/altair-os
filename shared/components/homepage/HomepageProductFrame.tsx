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
  const isProof = className.includes("mc-os-proof");
  const isHero = className.includes("ah-hero-product");

  return (
    <div className={`mc-product-frame relative ${className}`.trim()}>
      <div
        className={[
          "pointer-events-none absolute rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(238,235,230,0.18)_0%,rgba(220,215,204,0.05)_42%,transparent_70%)]",
          isProof || isHero ? "-inset-[7%] opacity-80" : "-inset-[10%]",
        ].join(" ")}
        aria-hidden="true"
      />
      <div
        className="relative overflow-hidden rounded-xl sm:rounded-2xl"
        style={{
          background: isHero
            ? "linear-gradient(155deg, rgba(247,246,243,0.62) 0%, rgba(211,205,191,0.28) 28%, rgba(62,57,47,0.52) 62%, rgba(12,15,11,0.96) 100%)"
            : "linear-gradient(155deg, rgba(238,235,230,0.42) 0%, rgba(183,177,161,0.18) 28%, rgba(41,48,37,0.55) 62%, rgba(12,15,11,0.98) 100%)",
          padding: "1px",
          boxShadow: isProof
            ? "0 24px 56px -28px rgba(0,0,0,0.75), 0 0 0 1px rgba(230,227,220,0.12), 0 1px 0 rgba(238,235,230,0.18) inset"
            : isHero
              ? "0 32px 64px -34px rgba(0,0,0,0.68), 0 0 0 1px rgba(241,240,235,0.28), 0 1px 0 rgba(249,248,246,0.34) inset"
              : "0 40px 90px -36px rgba(0,0,0,0.85), 0 0 0 1px rgba(230,227,220,0.14), 0 1px 0 rgba(238,235,230,0.22) inset",
        }}
      >
        <div
          className={[
            "relative w-full overflow-hidden rounded-[0.7rem] bg-[#0b0c0a] sm:rounded-[0.95rem]",
            isHero ? "aspect-[16/10] sm:aspect-[16/9.5]" : "aspect-[16/10]",
          ].join(" ")}
        >
          <Image
            src={src}
            alt={alt}
            fill
            priority={priority}
            quality={90}
            sizes={sizes}
            className={[
              "object-cover object-left-top",
              isHero ? "ah-hero-product-image" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        </div>
      </div>
    </div>
  );
}
