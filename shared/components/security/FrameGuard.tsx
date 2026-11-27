"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { isEmbedPath } from "@/shared/lib/resources/embeds";

/**
 * The second lock on the framing ban.
 *
 * Every page except the listed embed pages is sent with headers that forbid
 * showing it inside another website (lib/security/response-headers.ts).
 * Those headers protect a page when it is LOADED. An in-app link does not
 * load a page; it swaps the content in place. So a frame that started on an
 * embed could, in principle, be walked to another page without the headers
 * ever being asked.
 *
 * This closes that, and does not lean on the headers to do it: a page that
 * is not one of the listed embeds and finds itself inside a frame hides
 * itself before it is drawn and sends the frame to a blank page. (Reloading
 * and letting the headers refuse it would leave the page live until the
 * reload answered, and would loop forever on any address the headers happen
 * to allow.)
 *
 * The test is the exact list of embed pages: /embed on its own, an unknown
 * id and another letter case are all "not an embed". Outside a frame, which
 * is every normal visit and all of the signed-in product, it does nothing.
 *
 * Renders nothing.
 */
export function FrameGuard() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (window.self === window.top) return;
    if (isEmbedPath(pathname)) return;
    document.documentElement.style.display = "none";
    window.location.replace("about:blank");
  }, [pathname]);

  return null;
}
