import type { Metadata } from "next";
import { PricingPageView } from "@/shared/components/pricing/PricingPageView";

export const metadata: Metadata = {
  title: "Pricing · Altair OS",
  description:
    "Altair OS pricing for field service businesses. Start a 14-day free trial with Starter, Growth, or Pro. Credit card required.",
};

export default function PricingPage() {
  return <PricingPageView />;
}
