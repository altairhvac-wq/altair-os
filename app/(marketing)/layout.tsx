import { Instrument_Serif } from "next/font/google";
import { MetaPixel } from "@/shared/components/analytics/MetaPixel";

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
 */
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
