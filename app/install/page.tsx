import type { Metadata } from "next";
import { InstallPageView } from "@/shared/components/pwa/InstallPageView";

export const metadata: Metadata = {
  title: "Install",
  description:
    "Add Altair OS to your home screen and open it like an app on iPhone, iPad, or Android.",
};

export default function InstallPage() {
  return <InstallPageView />;
}
