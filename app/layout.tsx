import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { PwaServiceWorkerRegistration } from "@/shared/components/pwa/PwaServiceWorkerRegistration";
import { FirstPartyAnalytics } from "@/shared/components/analytics/FirstPartyAnalytics";
import { ToastViewport } from "@/shared/design-system/feedback";
import { NavigationProgress } from "@/shared/components/feedback/NavigationProgress";
import { Suspense } from "react";
// No stylesheet import here, on purpose. The public site loads app/public.css
// and every other route loads app/app.css, each from its own layout, so a
// visitor's first page downloads only the CSS the public pages use. See
// app/public.css; scripts/verify-public-stylesheet.mjs checks the wiring.

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/**
 * Not preloaded. Every page used to preload this 23 KB file in the same
 * breath as the stylesheet, although mono only sets small details (step
 * numbers, figures). The browser still fetches it the moment a page uses it,
 * and `swap` shows the fallback mono until then.
 */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
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
    template: "%s · Altair Operating System",
    default: "Altair Operating System",
  },
  applicationName: "Altair Operating System",
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
        {/* Gold bar on internal link clicks; Suspense because it reads search params. */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <PwaServiceWorkerRegistration />
        {/* First-party, cookieless analytics (migration 202). Root-level so
            marketing, auth and product pages share one count. */}
        <FirstPartyAnalytics />
        {/* The Meta Pixel is mounted in app/(marketing)/layout.tsx only. It
            must never load on authenticated routes or on the public
            estimate-approval / invoice-payment token pages (audit H2). */}
        {children}
        {/* Root-level so admin, technician and public routes share one
            feedback surface, and so its live regions exist in the DOM before
            any message arrives. */}
        <ToastViewport />
      </body>
    </html>
  );
}
