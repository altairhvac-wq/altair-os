"use client";

import { BreakEvenTool } from "@/shared/components/resources/calc/BreakEvenTool";
import { JobProfitabilityTool } from "@/shared/components/resources/calc/JobProfitabilityTool";
import { LaborRateTool } from "@/shared/components/resources/calc/LaborRateTool";
import type { EmbedToolId } from "@/shared/lib/resources/embeds";

/**
 * One calculator, as it appears inside another website's page.
 *
 * ============ EVERY LINK OPENS A NEW TAB ============
 * The calculators link to the full tools, and those are ordinary in-app
 * links. Followed inside a frame, an in-app link would draw the rest of the
 * site inside the other website's page, which is exactly what the framing
 * ban on every other page exists to prevent. So this wrapper catches every
 * click on a link before the router sees it and opens the address in a new
 * tab instead. (The root layout's FrameGuard is the second lock: any page
 * other than a listed embed that finds itself in a frame blanks itself.
 * Before the script has loaded, the layout's <base target="_blank"> does the
 * same job as this handler.)
 */

function Tool({ id }: { readonly id: EmbedToolId }) {
  switch (id) {
    case "labor-rate":
      return <LaborRateTool compact />;
    case "break-even":
      return <BreakEvenTool compact />;
    case "job-profitability":
      return <JobProfitabilityTool compact />;
  }
}

export function EmbedFrame({ id, title, fullUrl }: { readonly id: EmbedToolId; readonly title: string; readonly fullUrl: string }) {
  return (
    <div
      className="mx-auto max-w-[640px] p-2"
      onClickCapture={(event) => {
        const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
        if (!(anchor instanceof HTMLAnchorElement)) return;
        // Stop the in-app router (it skips a click that was already handled) and leave the frame alone.
        event.preventDefault();
        event.stopPropagation();
        window.open(anchor.href, "_blank", "noopener,noreferrer");
      }}
    >
      <Tool id={id} />
      <p className="mt-2 px-1 text-center text-[12px] leading-relaxed text-stone-500">
        <a href={fullUrl} target="_blank" rel="noopener" className="font-semibold text-[#77591B] underline underline-offset-2">
          {title}
        </a>{" "}
        by Altair Operating System. Your numbers stay in your browser.
      </p>
    </div>
  );
}
