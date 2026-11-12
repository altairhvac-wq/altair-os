/**
 * The Altair Operating System commercial: one job from first call to paid.
 *
 * Shared by the homepage hero, the /how-it-works page and their JSON-LD
 * (schema.org VideoObject), so the title, file, chapters and transcript are
 * decided in one place. Imports nothing from the app, so the middleware can
 * read the page path at the edge.
 *
 * Every line of the transcript is what the narrator says in the video; every
 * feature it names is shipped (see shared/lib/site/landing-pages.ts for the
 * code paths behind leads, estimates, approval links, dispatch, the technician
 * app, estimate-to-invoice and payments).
 */

export const VIDEO_PAGE_PATH = "/how-it-works";

export const COMMERCIAL_VIDEO = {
  title: "HVAC Software Demo: One Job From First Call to Paid",
  description:
    "One real job in Altair Operating System, start to finish: a call becomes a lead, the lead becomes an estimate, the customer signs on her phone, the job lands on the dispatch board, the technician runs it from his phone, and the invoice is paid the same day.",
  /** Site-hosted files (public/marketing/video). */
  file: "/marketing/video/altair-commercial.mp4",
  poster: "/marketing/video/altair-commercial-poster.webp",
  /** The same video on the Altair Operating System YouTube channel. */
  youtubeId: "kVL6ulgAzCo",
  uploadDate: "2026-11-11",
  /** ISO 8601, 2:27. */
  duration: "PT2M27S",
} as const;

export const COMMERCIAL_CHAPTERS: readonly { at: string; seconds: number; label: string }[] = [
  { at: "0:00", seconds: 0, label: "The day that never stops" },
  { at: "0:37", seconds: 37, label: "One place for all of it" },
  { at: "0:51", seconds: 51, label: "One real job: lead, estimate, approval, dispatch, field, invoice, paid" },
  { at: "1:51", seconds: 111, label: "What that means for your business" },
  { at: "2:13", seconds: 133, label: "Try it free" },
];

/**
 * The narration, paragraph by paragraph. The voice says "Altair OS" in two
 * places; the written transcript uses the product's public name, "Altair
 * Operating System" (owner rule, 2026-11-12), until the video is re-recorded.
 */
export const COMMERCIAL_TRANSCRIPT: readonly string[] = [
  "Have you ever felt like there are a million tasks to do, and the phone never stops ringing with questions on every job? Quotes are waiting on you, the trucks are out, and somebody still owes you money.",
  "And all of it lives in five different places. A calendar for the schedule. A spreadsheet for hours. Texts to tell your guys where to go. Quotes in one program, invoices in another.",
  "So the same customer gets typed in three times. A quote slips through the cracks. Invoices go out late. And you end up running the paperwork instead of growing the business.",
  "Altair Operating System puts all of it in one place. Your leads, quotes, schedule, technicians, hours, invoices and payments, all connected. Here's what that looks like with one real job.",
  "Take one call. Rachel's water heater just let go. Dana adds her as a lead while they're still talking.",
  "One click turns that lead into an estimate. Her information carries right over, so nobody types it twice. Prices come from your price book, so every quote is consistent. $2,820.",
  "Rachel gets it on her phone. No app, no login. She signs with her finger, and it's approved.",
  "The moment she signs, the job lands on today's board. Dana assigns Luis for one o'clock, and it's on his phone.",
  "Luis has the address, the notes, and the approved estimate. No calling the office to ask. Every step he taps shows up back at the office, and his hours start when the work does. When he's done, he writes up what he did and closes the job.",
  "Back at the office, the approved estimate becomes the invoice in one click. No retyping. Rachel pays, Dana records it, and it's paid in full. Same day.",
  "That's one job. Now picture every job running that way.",
  "Your team enters things once. Your techs and your office stay on the same page. Invoices go out the day the work is done. And you can see what's booked, what's owed, and what's been collected, any time.",
  "That's time back in your week, and room to grow.",
  "Altair Operating System. One connected system for your whole business. Try it free for 14 days at altair-op.com.",
];

/**
 * schema.org VideoObject for the commercial. `origin` is the public site
 * origin; `pageUrl` is the page the video is the main content of (Google's
 * video indexing prefers a dedicated watch page).
 */
export function buildCommercialVideoStructuredData(input: {
  readonly origin: string;
  readonly pageUrl: string;
  readonly publisherName: string;
}): Record<string, unknown> {
  const v = COMMERCIAL_VIDEO;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: v.title,
    description: v.description,
    thumbnailUrl: [`${input.origin}${v.poster}`, `https://i.ytimg.com/vi/${v.youtubeId}/maxresdefault.jpg`],
    uploadDate: v.uploadDate,
    duration: v.duration,
    contentUrl: `${input.origin}${v.file}`,
    embedUrl: `https://www.youtube.com/embed/${v.youtubeId}`,
    url: input.pageUrl,
    inLanguage: "en-US",
    transcript: COMMERCIAL_TRANSCRIPT.join(" "),
    publisher: {
      "@type": "Organization",
      name: input.publisherName,
      logo: { "@type": "ImageObject", url: `${input.origin}/icons/icon-512.png` },
    },
    hasPart: COMMERCIAL_CHAPTERS.map((c, i) => ({
      "@type": "Clip",
      name: c.label,
      startOffset: c.seconds,
      ...(i + 1 < COMMERCIAL_CHAPTERS.length ? { endOffset: COMMERCIAL_CHAPTERS[i + 1].seconds } : { endOffset: 147 }),
      url: `${input.pageUrl}?t=${c.seconds}`,
    })),
  };
}
