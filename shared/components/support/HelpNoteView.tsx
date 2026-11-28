import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSurface,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { describeHelpNoteAudience } from "@/shared/lib/help/catalog";
import { HELP_PATH, helpNotePath } from "@/shared/lib/help/paths";
import { parseHelpText } from "@/shared/lib/help/text";
import type { HelpNote } from "@/shared/lib/help/types";

type HelpNoteViewProps = {
  note: HelpNote;
  areaLabel: string;
  /** False when this sign-in cannot do what the note describes. */
  canFollow: boolean;
  /** Related notes this person can follow. */
  related: readonly HelpNote[];
};

const primaryButtonClass =
  "inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-control)] bg-altair-brass px-3.5 py-2 text-sm font-bold text-[#1C1913] transition-colors hover:bg-altair-brass-interactive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]";
const quietLinkClass =
  "inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-[var(--brand-metal-text)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]";

/** A step or note line, with on-screen labels set apart. */
function HelpLine({ text }: { text: string }) {
  return (
    <>
      {parseHelpText(text).map((segment, index) =>
        segment.label ? (
          <strong key={index} className="font-bold text-altair-ink-on-paper">
            {segment.text}
          </strong>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

/**
 * One how-to note inside the app: the steps, what to know first, and a button
 * that opens the screen the note starts on.
 */
export function HelpNoteView({ note, areaLabel, canFollow, related }: HelpNoteViewProps) {
  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact">
          <Link href={HELP_PATH} className={quietLinkClass}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Help
          </Link>

          <MasterPageHeader
            eyebrow={areaLabel}
            title={note.title}
            subtitle={note.summary}
            density="compact"
          />

          <MasterPageSurface variant="card" className="p-4 sm:p-5">
            <ol className="space-y-3.5">
              {note.steps.map((step, index) => (
                <li key={index} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-altair-brass/20 text-xs font-bold text-[var(--brand-metal-text)]"
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-altair-ink-on-paper-secondary">
                    <span className="sr-only">Step {index + 1}: </span>
                    <HelpLine text={step} />
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {canFollow ? (
                <Link href={note.startHref} className={primaryButtonClass}>
                  {note.startLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <p className="text-sm text-altair-ink-on-paper-secondary">
                  Your sign-in cannot do this one. It is for: {describeHelpNoteAudience(note)}.
                </p>
              )}
            </div>
          </MasterPageSurface>

          {note.goodToKnow && note.goodToKnow.length > 0 ? (
            <MasterPageSurface variant="card" className="p-4 sm:p-5">
              <h2 className="text-sm font-bold text-altair-ink-on-paper">Good to know</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-altair-ink-on-paper-secondary">
                {note.goodToKnow.map((line, index) => (
                  <li key={index}>
                    <HelpLine text={line} />
                  </li>
                ))}
              </ul>
            </MasterPageSurface>
          ) : null}

          {related.length > 0 ? (
            <MasterPageSurface variant="card" className="p-4 sm:p-5">
              <h2 className="text-sm font-bold text-altair-ink-on-paper">Often next</h2>
              <ul className="mt-2 space-y-1.5">
                {related.map((other) => (
                  <li key={other.slug}>
                    <Link href={helpNotePath(other.slug)} className={quietLinkClass}>
                      {other.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </MasterPageSurface>
          ) : null}
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
