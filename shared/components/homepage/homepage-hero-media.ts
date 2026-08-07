/**
 * Scene 1 hero background media.
 *
 * Replace production media by updating DEFAULT_HOMEPAGE_HERO_MEDIA
 * (or pass `media` into <HomepageHero />). Do not hardcode stock URLs
 * elsewhere in the hero tree.
 */
export type HomepageHeroImageMedia = {
  type: "image";
  src: string;
  alt: string;
};

export type HomepageHeroVideoMedia = {
  type: "video";
  src: string;
  /** Shown while the video loads and when reduced motion is preferred. */
  poster?: string;
  alt: string;
};

export type HomepageHeroMedia =
  | HomepageHeroImageMedia
  | HomepageHeroVideoMedia;

/**
 * Temporary cinematic still (Canon ALT-RES-001 — Before Sunrise).
 * Swap `src` / `type` here when the production loop is ready.
 */
export const DEFAULT_HOMEPAGE_HERO_MEDIA: HomepageHeroMedia = {
  type: "image",
  src: "/marketing/hero/scene-1-placeholder.png",
  alt: "Before sunrise in a modern mountain home — coffee steaming beside an open notebook, truck keys, and work boots by the door, with cool dawn light over the valley outside.",
};
