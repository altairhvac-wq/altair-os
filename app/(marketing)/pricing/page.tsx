import type { Metadata } from "next";
import { PricingPageView } from "@/shared/components/pricing/PricingPageView";

export const metadata: Metadata = {
  title: "Pricing · Altair OS",
  description:
    "Founding Company Beta — Starter, Growth, and Pro plans free for 3 months. No credit card required.",
};

export default function PricingPage() {
  return <PricingPageView />;
}
