"use client";

import { useState, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { generateLeadFollowUpAction } from "@/app/actions/lead-ai";
import { formatActionError } from "@/shared/lib/operational-errors";

type LeadFollowUpAiAssistantProps = {
  leadId: string;
  aiFeaturesEnabled: boolean;
};

export function LeadFollowUpAiAssistant({
  leadId,
  aiFeaturesEnabled,
}: LeadFollowUpAiAssistantProps) {
  const [followUpText, setFollowUpText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!aiFeaturesEnabled) {
    return null;
  }

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateLeadFollowUpAction(leadId);

      if (result.error || !result.followUpText?.trim()) {
        setError(
          formatActionError(
            result.error,
            "Could not generate a follow-up draft.",
          ),
        );
        return;
      }

      setFollowUpText(result.followUpText);
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-cyan-200 bg-cyan-50/40 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Sparkles className="h-4 w-4 text-cyan-600" />
        Generate follow-up
      </div>
      <p className="mt-1 text-xs text-slate-600">
        Draft a follow-up message when you are ready. AI does not run automatically.
      </p>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={isPending}
        className="mt-3 admin-btn-secondary text-xs"
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Generating...
          </span>
        ) : (
          "Generate follow-up"
        )}
      </button>

      {error ? <p className="mt-3 text-xs text-rose-600">{error}</p> : null}

      {followUpText ? (
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
          {followUpText}
        </p>
      ) : null}
    </div>
  );
}
