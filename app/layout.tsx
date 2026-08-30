import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { MetaPixel } from "@/shared/components/analytics/MetaPixel";
import { PwaServiceWorkerRegistration } from "@/shared/components/pwa/PwaServiceWorkerRegistration";
import { ToastViewport } from "@/shared/design-system/feedback";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Altair Prestige display face.
 *
 * Instrument Serif was already in the project but scoped to the marketing
 * layout, so the product itself was set entirely in one sans — a large part of
 * why the admin read as generic next to the brand surfaces. Promoting it to the
 * root layout gives the whole product a display register for page identity
 * (greetings, page titles) while Geist keeps every functional role.
 *
 * Self-hosted by next/font, one weight, `display: swap`.
 */
const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-altair-display",
  display: "swap",
});

/** Matches `--surface-canvas` in globals.css */
const APP_SHELL_BACKGROUND = "#f8f7f4";
/** Premium slate accent used across auth/admin surfaces */
/* Matches `--chrome` (--pg-graphite-900). The browser status bar sits directly
 * above the app's own chrome, so any drift between them reads as a seam. */
const APP_THEME_COLOR = "#1c211a";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: APP_THEME_COLOR,
  colorScheme: "light",
  /**
   * Resize the layout viewport when the on-screen keyboard opens instead of
   * overlaying it. Without this, dvh-sized sheets/forms keep their full
   * height under the keyboard on mobile, producing unreachable "blank space
   * at the bottom of the form" scroll traps (beta bug, iPhone Safari,
   * /leads + estimate form).
   */
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  /**
   * Route segments set only their own name (`title: "Customers"`); this
   * template supplies the product suffix so browser tabs, history entries,
   * and bookmarks are distinguishable in a multi-tab workflow. `default`
   * covers segments that set no title of their own.
   */
  title: {
    template: "%s · Altair OS",
    default: "Altair OS",
  },
  applicationName: "Altair OS",
  description: "Field service command center for trades companies",
  appleWebApp: {
    capable: true,
    title: "Altair",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full overflow-x-clip antialiased`}
      style={{ backgroundColor: APP_SHELL_BACKGROUND }}
    >
      <body
        className="flex min-h-full max-w-full flex-col overflow-x-clip"
        style={{ backgroundColor: APP_SHELL_BACKGROUND }}
      >
        <PwaServiceWorkerRegistration />
        <MetaPixel />
        {children}
        {/* Root-level so admin, technician and public routes share one
            feedback surface, and so its live regions exist in the DOM before
            any message arrives. */}
        <ToastViewport />
      </body>
    </html>
  );
}
