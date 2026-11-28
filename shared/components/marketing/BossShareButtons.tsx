"use client";

import { useEffect, useState } from "react";
import { trackEngagement } from "@/shared/lib/analytics/client";

/**
 * "Send this to your boss" on /for-techs.
 *
 * A technician rarely buys the software, but is often the one who finds it.
 * These buttons hand a ready-written message to the phone's own text, mail
 * or share sheet; nothing is sent by us and no address or number is asked
 * for. The only thing recorded is that a button was pressed and which one.
 */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c2a05a]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080907]";
const button = `inline-flex min-h-12 items-center justify-center rounded-lg border border-[rgba(230,227,220,0.18)] px-5 py-3 text-sm font-semibold text-[#fbf7ef] transition-colors hover:border-[#c2a05a]/60 ${focusRing}`;

export function BossShareButtons({
  message,
  url,
  subject,
}: {
  /** The words, without the link. */
  readonly message: string;
  readonly url: string;
  readonly subject: string;
}) {
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const full = `${message} ${url}`;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the share sheet exists only in the browser
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const share = async () => {
    trackEngagement("boss_share", "share", { repeat: true });
    try {
      await navigator.share({ title: subject, text: message, url });
    } catch {
      // Closed without sharing: nothing to do.
    }
  };

  const copy = async () => {
    trackEngagement("boss_share", "copy", { repeat: true });
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // No clipboard permission: the message is on the page to select by hand.
    }
  };

  return (
    <div>
      <blockquote className="rounded-xl border border-[rgba(230,227,220,0.12)] bg-[rgba(8,9,7,0.6)] px-4 py-3 text-sm leading-relaxed text-[#e8dcc4]">
        {message} <span className="break-all text-[#c2a05a]">{url}</span>
      </blockquote>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {canShare ? (
          <button type="button" onClick={share} className={`${button} bg-[#a4823a] text-[#080907] hover:bg-[#c2a05a]`}>
            Share it
          </button>
        ) : null}
        <a
          href={`sms:?&body=${encodeURIComponent(full)}`}
          onClick={() => trackEngagement("boss_share", "text", { repeat: true })}
          className={button}
        >
          Text it
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(full)}`}
          onClick={() => trackEngagement("boss_share", "email", { repeat: true })}
          className={button}
        >
          Email it
        </a>
        <button type="button" onClick={copy} className={button} aria-live="polite">
          {copied ? "Copied" : "Copy the message"}
        </button>
      </div>
    </div>
  );
}
