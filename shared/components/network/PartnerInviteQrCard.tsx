"use client";

import { useState } from "react";
import { Check, Copy, Download, QrCode } from "lucide-react";

const MOCK_INVITE_LINK = "https://altair.app/connect/altair-hvac-austin";

function MockQrPlaceholder() {
  const cells = Array.from({ length: 49 }, (_, index) => {
    const row = Math.floor(index / 7);
    const col = index % 7;
    const filled =
      (row + col) % 2 === 0 ||
      (row === 0 && col < 3) ||
      (col === 0 && row < 3) ||
      (row === 6 && col > 3) ||
      (col === 6 && row > 3);

    return filled;
  });

  return (
    <div
      className="grid grid-cols-7 gap-0.5 rounded-lg bg-white p-2.5 ring-1 ring-slate-200"
      aria-hidden="true"
    >
      {cells.map((filled, index) => (
        <div
          key={index}
          className={`h-3 w-3 rounded-[1px] sm:h-3.5 sm:w-3.5 ${
            filled ? "bg-slate-900" : "bg-white"
          }`}
        />
      ))}
    </div>
  );
}

export function PartnerInviteQrCard() {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(MOCK_INVITE_LINK);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function handleDownloadQr() {
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 2000);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="mx-auto shrink-0 sm:mx-0">
          <MockQrPlaceholder />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-cyan-600" />
            <h3 className="text-sm font-bold text-slate-900">Partner Invite QR</h3>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Scan to connect with this company
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">{MOCK_INVITE_LINK}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy Invite Link"}
            </button>
            <button
              type="button"
              onClick={handleDownloadQr}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              {downloaded ? "Download queued" : "Download QR"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
