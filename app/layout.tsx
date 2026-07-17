import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PwaServiceWorkerRegistration } from "@/shared/components/pwa/PwaServiceWorkerRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Matches `--surface-canvas` in globals.css */
const APP_SHELL_BACKGROUND = "#faf6ef";
/** Warm graphite accent used across auth/admin surfaces */
const APP_THEME_COLOR = "#1d1812";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: APP_THEME_COLOR,
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: "Altair OS",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full overflow-x-clip antialiased`}
      style={{ backgroundColor: APP_SHELL_BACKGROUND }}
    >
      <body
        className="flex min-h-full max-w-full flex-col overflow-x-clip"
        style={{ backgroundColor: APP_SHELL_BACKGROUND }}
      >
        <PwaServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
