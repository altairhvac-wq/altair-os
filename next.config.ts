import os from "os";
import type { NextConfig } from "next";

function getLocalDevOrigins(): string[] {
  const origins = new Set<string>();

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const net of interfaces ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        origins.add(net.address);
      }
    }
  }

  for (const origin of process.env.DEV_ALLOWED_ORIGINS?.split(",") ?? []) {
    const trimmed = origin.trim();
    if (trimmed) {
      origins.add(trimmed);
    }
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getLocalDevOrigins(),
  images: {
    qualities: [70, 75, 90],
  },
  async redirects() {
    return [
      {
        // The sidebar item is labeled "Dashboard" but the route is "/";
        // people type /dashboard and hit a 404 without this.
        source: "/dashboard",
        destination: "/",
        permanent: false,
      },
      {
        source: "/tech",
        destination: "/technician",
        permanent: false,
      },
      {
        source: "/tech/jobs",
        destination: "/technician",
        permanent: false,
      },
      {
        source: "/tech/profile",
        destination: "/technician",
        permanent: false,
      },
      {
        source: "/sign-up",
        destination: "/signup",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
