import type { MetadataRoute } from "next";

/** Matches `.admin-canvas` shell background in globals.css */
const APP_SHELL_BACKGROUND = "#f1f5f9";
/** Premium slate accent used across auth/admin surfaces */
const APP_THEME_COLOR = "#0f172a";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Altair OS",
    short_name: "Altair",
    description: "Field service command center for trades companies",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: APP_SHELL_BACKGROUND,
    theme_color: APP_THEME_COLOR,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
