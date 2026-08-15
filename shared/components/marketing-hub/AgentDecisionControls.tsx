"use client";

import { useState, useTransition } from "react";
import { Button, StatusPill } from "@/shared/design-system/components";
import { recordAgentDecisionAction } from "@/app/actions/agent-decisions";

/**
 * The human decision point for one Agent Platform proposal.
 *
 * DELIBERATELY SMALL AND SECONDARY. The Marketing page is automation-first:
 * these are the only buttons in the automation half, and they exist because a
 * decision genuinely cannot be automated, not to give the page something to
 * click.
 *
 * WHAT THE COPY PROMISES. "Approve" says a human agreed. It does NOT say
 * anything was published — the Agent Platform decides that independently on
 * its next cycle, through its own permission engine and effect ledger. The
 * pending state says "queued for the next agent run" for exactly that reason:
 * the platform is behind NAT and pulls, so a decision is never instant, and
 * implying otherwise would be the lie.
 */

type AgentDecisionControlsProps = {
  subjectKind: "approval" | "recommendation" | "video_render";
  subjectId: string;
  /** Set once a decision already exists for this subject. */
  existingDecision?: string | null;
};

export function AgentDecisionControls({
  subjectKind,
  subjectId,
  existingDecision = null,
}: AgentDecisionControlsProps) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(
    existingDecision ? `Recorded: ${existingDecision}` : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  function submit(decision: "APPROVED" | "REJECTED" | "REQUEST_EDIT") {
    setError(null);
    startTransition(async () => {
      const response = await recordAgentDecisionAction(
        subjectKind,
        subjectId,
        decision,
        note,
      );
      if (response.error) {
        setError(response.error);
        return;
      }
      setResult(
        response.duplicate
          ? "Already recorded — queued for the next agent run"
          : "Recorded — queued for the next agent run",
      );
      setShowNote(false);
    });
  }

  if (result) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusPill tone="info" size="sm">
          {result}
        </StatusPill>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => submit("APPROVED")}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => submit("REJECTED")}
        >
          Reject
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => setShowNote((value) => !value)}
        >
          Request edit
        </Button>
      </div>
      {showNote ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={note}
            maxLength={1000}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What should change?"
            className="min-w-0 flex-1 rounded border border-altair-border bg-altair-paper-elevated px-2 py-1 text-xs text-altair-ink"
          />
          <Button
            size="sm"
            variant="primary"
            disabled={pending || note.trim().length === 0}
            onClick={() => submit("REQUEST_EDIT")}
          >
            Send
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-[11px] text-altair-danger">{error}</p> : null}
      <p className="text-[11px] text-altair-ink-muted">
        Decisions are applied by the Agent Platform on its next run. Approving
        here does not publish anything.
      </p>
    </div>
  );
}
