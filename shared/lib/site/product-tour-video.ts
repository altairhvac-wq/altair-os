/**
 * The Altair Operating System product tour: every feature a buyer gets, one by one, on the real app.
 *
 * Owner 2026-11-24: "I think we need a video that goes through everything we do kind of quickly ...
 * Everything on one app." and 2026-11-25: "I want it on our homepage where the other demo ad thing
 * was and I want it a little bit better of a presence on there."
 *
 * Shared by the homepage hero and the homepage's JSON-LD (schema.org VideoObject), so the title,
 * files, chapters and transcript are decided in one place. Imports nothing from the app.
 *
 * Every line of the transcript is what the narrator says, and every feature it names was checked
 * against the code and shared/lib/site/not-yet.ts before recording (2026-11-25). The screens are the
 * real app with a made-up sample company.
 */

export const PRODUCT_TOUR_VIDEO = {
  title: "Altair Operating System: Everything You Get",
  description:
    "Every feature you get with Altair Operating System, one at a time, on the real app: leads, customers and their equipment, the price book, estimates customers approve on their phone, dispatch, the technician's phone, invoices, payment links, reports and the public contractor directory.",
  /** Site-hosted files (public/marketing/video). */
  file: "/marketing/video/product-tour.mp4",
  /** Muted, smaller loop that plays in the hero until the visitor presses Watch. */
  preview: "/marketing/video/product-tour-preview.mp4",
  poster: "/marketing/video/product-tour-poster.webp",
  /** The same video on the Altair Operating System YouTube channel once it is public; null until then. */
  youtubeId: null as string | null,
  uploadDate: "2026-11-25",
  /** ISO 8601, 2:18. */
  duration: "PT2M18S",
  durationLabel: "2:18",
} as const;

export const PRODUCT_TOUR_CHAPTERS: readonly { at: string; seconds: number; label: string }[] = [
  { at: "0:00", seconds: 0, label: "Leads" },
  { at: "0:19", seconds: 19, label: "Customers, equipment and the price book" },
  { at: "0:43", seconds: 43, label: "Estimates approved on the customer's phone" },
  { at: "0:55", seconds: 55, label: "Dispatch" },
  { at: "1:06", seconds: 66, label: "The technician's phone" },
  { at: "1:19", seconds: 79, label: "Invoices" },
  { at: "1:30", seconds: 90, label: "Getting paid" },
  { at: "1:43", seconds: 103, label: "Reports" },
  { at: "1:53", seconds: 113, label: "The contractor directory" },
  { at: "2:04", seconds: 124, label: "One app, one record for every job" },
];

export const PRODUCT_TOUR_TRANSCRIPT: readonly string[] = [
  "Here's every single thing you get with Altair Operating System. Ten features, one app. Let's go.",
  "One. Leads. Every call and web inquiry goes on one list with a next step, and you can see which sources actually turn into work. When a lead's ready, it becomes an estimate in a click.",
  "Two. Customers. One record for each, with every job, estimate, invoice and payment. Plus the equipment on site, down to the serial number, and it flags old units and expired warranties, so you know who to call.",
  "Three. Your price book. Every service, part and labor rate, with your cost right next to your price. Build it once, and every estimate pulls from it.",
  "Four. Estimates. Send it as a link. Your customer reads every line on their phone, signs with a finger, and it's approved. No app, no login. And the second they sign, it becomes a job.",
  "Five. Dispatch. The whole day on one board. Every technician in their own row, unassigned jobs waiting on the left, and a map of every job. Pick the tech, and it's on their phone.",
  "Six. Your tech's phone. Their day, in order. One tap opens the customer, the address, the notes and the equipment, and they clock in from the same phone. Every step they tap shows up back at the office.",
  "Seven. Invoices. The approved estimate becomes the invoice in one click. Same lines, nothing retyped, and it stays tied to the job and the estimate it came from.",
  "Eight. Getting paid. Send the payment link, and your customer pays by card from their phone, straight into your own Stripe account. Cash, checks and partial payments go on the same invoice, so the balance is always right.",
  "Nine. Reports. What you collected, your average ticket, how many estimates you close, who owes you and how late it is, your sales tax, and a summary you can print for your accountant.",
  "Ten. The directory. Your company can have a page in our public contractor directory, marked as an Altair member and listed first. Quote requests from your page come straight into your leads.",
  "That's all ten. First call to paid, one record for every job, and every plan includes all of it. That's Altair Operating System.",
];

/** schema.org VideoObject for the tour. `pageUrl` is the page it is the main video of (the homepage). */
export function buildProductTourStructuredData(input: {
  readonly origin: string;
  readonly pageUrl: string;
  readonly publisherName: string;
}): Record<string, unknown> {
  const v = PRODUCT_TOUR_VIDEO;
  const yt = v.youtubeId;
  const total = 138;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: v.title,
    description: v.description,
    thumbnailUrl: yt
      ? [`${input.origin}${v.poster}`, `https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`]
      : [`${input.origin}${v.poster}`],
    uploadDate: v.uploadDate,
    duration: v.duration,
    contentUrl: `${input.origin}${v.file}`,
    ...(yt ? { embedUrl: `https://www.youtube.com/embed/${yt}` } : {}),
    url: input.pageUrl,
    inLanguage: "en-US",
    transcript: PRODUCT_TOUR_TRANSCRIPT.join(" "),
    publisher: {
      "@type": "Organization",
      name: input.publisherName,
      logo: { "@type": "ImageObject", url: `${input.origin}/icons/icon-512.png` },
    },
    hasPart: PRODUCT_TOUR_CHAPTERS.map((c, i) => ({
      "@type": "Clip",
      name: c.label,
      startOffset: c.seconds,
      endOffset: i + 1 < PRODUCT_TOUR_CHAPTERS.length ? PRODUCT_TOUR_CHAPTERS[i + 1].seconds : total,
    })),
  };
}
