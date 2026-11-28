"use client";

import { useId, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { requestIntegrationsAction } from "@/app/actions/integration-requests";
import { Button } from "@/shared/design-system/components/Button";
import {
  fieldCheckboxClass,
  fieldLabelClass,
  fieldTextareaClass,
} from "@/shared/design-system/components/field-styles";
import { SettingsAlertBanner } from "@/shared/components/settings/SettingsAlertBanner";
import {
  INTEGRATION_REQUEST_NOTE_MAX_LENGTH,
  PLANNED_INTEGRATIONS,
  PLANNED_INTEGRATION_GROUPS,
} from "@/shared/types/customer-integrations";

/**
 * The "Not available yet" list, with a way to say "I would use that one".
 *
 * ============ WHAT THIS IS NOT ============
 * Not a Connect button. Nothing here starts a connection, because none of
 * these exist. A tick and Send stores one request (see
 * app/actions/integration-requests.ts); the reply says it arrived and
 * promises nothing.
 *
 * `requestedOn` comes from the server already written as a date ("Nov 27"),
 * so the server and the browser print the same text whatever time zone the
 * browser is in.
 */
export function IntegrationRequestForm({
  companyId,
  requestedOn,
  hiddenKeys = [],
}: {
  /** The company this page was loaded for; the action refuses a mismatch. */
  companyId: string;
  /** Integration key to the day this company asked for it. */
  requestedOn: Readonly<Record<string, string>>;
  /**
   * Keys that are available on this deployment (QuickBooks Online once its
   * keys are set), so they are not offered as "not available yet".
   */
  hiddenKeys?: readonly string[];
}) {
  const noteId = useId();
  const [checked, setChecked] = useState<readonly string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  // A key ticked in this tab and since recorded (the page re-reads after a
  // send) is no longer a choice, so it never counts towards the next send.
  const pendingKeys = checked.filter((key) => !requestedOn[key]);
  const canSend = pendingKeys.length > 0 || note.trim().length > 0;

  function toggle(key: string) {
    setSent(false);
    setError(null);
    setChecked((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSend || isPending) {
      return;
    }

    setError(null);
    setSent(false);

    startTransition(async () => {
      let result: Awaited<ReturnType<typeof requestIntegrationsAction>>;

      try {
        result = await requestIntegrationsAction(
          { keys: [...pendingKeys], note },
          companyId,
        );
      } catch {
        setError("We could not send that. Check your connection and try again.");
        return;
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      setChecked([]);
      setNote("");
      setSent(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0" data-testid="integration-request-form">
      <div className="space-y-4">
        {PLANNED_INTEGRATION_GROUPS.map((group) => {
          const items = PLANNED_INTEGRATIONS.filter(
            (item) => item.group === group.id && !hiddenKeys.includes(item.key),
          );

          if (items.length === 0) {
            return null;
          }

          return (
            <fieldset key={group.id} className="min-w-0">
              <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-altair-ink-muted">
                {group.title}
              </legend>
              <ul className="mt-1.5 divide-y divide-altair-border/60 overflow-hidden rounded-[var(--radius-control)] border border-[var(--north-star-plate-border)] bg-[var(--surface-tile)]">
                {items.map((item) => {
                  const askedOn = requestedOn[item.key];
                  const inputId = `integration-request-${item.key}`;

                  return (
                    <li
                      key={item.key}
                      data-testid={`planned-integration-${item.key}`}
                      data-requested={askedOn ? "true" : "false"}
                    >
                      {askedOn ? (
                        <div className="flex min-h-11 items-start gap-3 px-3 py-2.5">
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-altair-success-foreground"
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-altair-ink">
                              {item.label}
                            </span>
                            <span className="block text-xs leading-5 text-altair-ink-secondary">
                              {item.wouldDo}
                            </span>
                            <span className="mt-0.5 block text-xs font-medium text-altair-success-foreground">
                              You asked for this on {askedOn}. We have your request.
                            </span>
                          </span>
                        </div>
                      ) : (
                        <label
                          htmlFor={inputId}
                          className="flex min-h-11 cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-[rgb(28_25_19_/_0.04)]"
                        >
                          <input
                            id={inputId}
                            type="checkbox"
                            className={`${fieldCheckboxClass} mt-0.5 shrink-0`}
                            checked={checked.includes(item.key)}
                            onChange={() => toggle(item.key)}
                            disabled={isPending}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-altair-ink">
                              {item.label}
                            </span>
                            <span className="block text-xs leading-5 text-altair-ink-secondary">
                              {item.wouldDo}
                            </span>
                          </span>
                        </label>
                      )}
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
      </div>

      <div className="mt-4">
        <label htmlFor={noteId} className={fieldLabelClass}>
          Something else, or anything we should know{" "}
          <span className="font-normal text-altair-ink-on-paper-secondary">
            (optional)
          </span>
        </label>
        <textarea
          id={noteId}
          name="note"
          rows={2}
          maxLength={INTEGRATION_REQUEST_NOTE_MAX_LENGTH}
          value={note}
          onChange={(event) => {
            setSent(false);
            setError(null);
            setNote(event.target.value);
          }}
          disabled={isPending}
          placeholder="For example: the app you use for payroll, or what you would want sent to your books"
          className={`${fieldTextareaClass} mt-1`}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          variant="primary"
          loading={isPending}
          disabled={!canSend}
        >
          {isPending ? "Sending…" : "Send to Altair"}
        </Button>
        <span className="text-xs leading-5 text-altair-ink-muted">
          {pendingKeys.length > 0
            ? `${pendingKeys.length} ticked. Sending tells us you would use ${pendingKeys.length === 1 ? "it" : "them"}; it does not turn anything on.`
            : "Sending tells us what you would use. It does not turn anything on."}
        </span>
      </div>

      {error ? (
        <SettingsAlertBanner tone="error" className="mt-3">
          {error}
        </SettingsAlertBanner>
      ) : null}
      {sent ? (
        <SettingsAlertBanner tone="success" className="mt-3">
          Got it. Your request went to the Altair team.
        </SettingsAlertBanner>
      ) : null}
    </form>
  );
}
