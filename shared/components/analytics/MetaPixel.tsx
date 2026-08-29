"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { pageview } from "@/shared/lib/meta-pixel";

const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "";

/**
 * Module-level guards survive React Strict Mode remounts so the initial
 * Script PageView is not duplicated by the route-tracking effect, and
 * pathname changes are not double-fired in development.
 */
let routeTrackingBootstrapped = false;
let lastTrackedPathname: string | null = null;

/**
 * Loads Meta Pixel once at the app root and tracks SPA navigations.
 *
 * Future Lead: fire `metaPixel.event("Lead", { content_name: "…" })`
 * only after a successful demo-request / contact / signup acceptance —
 * never on form open, click, submit start, or failure.
 */
export function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    if (!META_PIXEL_ID) {
      return;
    }

    if (!routeTrackingBootstrapped) {
      routeTrackingBootstrapped = true;
      lastTrackedPathname = pathname;
      return;
    }

    if (lastTrackedPathname === pathname) {
      return;
    }

    lastTrackedPathname = pathname;
    pageview();
  }, [pathname]);

  if (!META_PIXEL_ID) {
    return null;
  }

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(META_PIXEL_ID)});
fbq('track', 'PageView');
          `.trim(),
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- Meta Pixel noscript fallback */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(META_PIXEL_ID)}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
