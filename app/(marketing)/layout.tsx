import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import { MetaPixel } from "@/shared/components/analytics/MetaPixel";
import {
  PUBLIC_SITE_ORIGIN,
  buildPublicSocialMetadata,
} from "@/shared/lib/site/public-site";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-altair-display",
  display: "swap",
});

/**
 * Public marketing surfaces only.
 *
 * The Meta Pixel lives here and nowhere else: it used to sit in the root
 * layout and fired a PageView — URL included — on every route, which sent
 * customer estimate-approval and invoice-payment token links, and every
 * signed-in admin and technician page, to Meta (launch audit H2). Nothing
 * under (admin), /technician, the token routes or auth mounts it.
 *
 * Link-preview and crawler metadata for every public marketing page.
 *
 * Without this a link pasted into TikTok, YouTube, iMessage or Slack unfurls
 * as bare text (launch audit H6). Titles and descriptions are inherited from
 * each page's own `metadata`; the Open Graph image, site name, card type and
 * canonical come from here, so a page only has to name itself.
 */
export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_SITE_ORIGIN),
  ...buildPublicSocialMetadata(),
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${instrumentSerif.variable} min-h-full`}>
      <MetaPixel />
      {children}
    </div>
  );
}
