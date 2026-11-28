"use client";

import { ClipboardCopy } from "lucide-react";
import { Toast, ToolButton, copyText, useToast } from "@/shared/components/resources/tools/ToolControls";

/**
 * The code another website pastes to show one calculator, with a copy
 * button. The text is built on the server from shared/lib/resources/embeds.ts
 * and shown as plain text: nothing here is typed by a visitor.
 */
export function EmbedSnippet({ code, name }: { readonly code: string; readonly name: string }) {
  const toast = useToast();
  return (
    <div>
      <pre className="overflow-x-auto rounded-xl border border-stone-200 bg-stone-900 p-4 text-[12px] leading-relaxed text-stone-100" aria-label={`Code to embed the ${name}`}>
        <code>{code}</code>
      </pre>
      <div className="mt-3">
        <ToolButton
          variant="primary"
          icon={ClipboardCopy}
          onClick={async () => {
            const ok = await copyText(code);
            toast.show(ok ? "Copied. Paste it into your page where the calculator should appear." : "Copy was blocked by the browser. Select the code and copy it by hand.");
          }}
        >
          Copy the code
        </ToolButton>
      </div>
      <Toast message={toast.message} />
    </div>
  );
}
