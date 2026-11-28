import Link from "next/link";
import {
  ResourceCard,
  ResourceChrome,
  ResourceMain,
  resourceLinkClass,
} from "@/shared/components/resources/ResourcePageShell";
import { HowToSearch, type HowToSearchNote } from "@/shared/components/site/HowToSearch";
import {
  HELP_AREAS,
  HELP_NOTES,
  describeHelpNoteAudience,
  getHelpArea,
  getHelpNote,
  listHelpNotesInArea,
} from "@/shared/lib/help/catalog";
import { HOW_TO_PATH, howToNotePath } from "@/shared/lib/help/paths";
import { HOW_TO_SECTION_NAME } from "@/shared/lib/help/structured-data";
import { parseHelpText } from "@/shared/lib/help/text";
import type { HelpNote } from "@/shared/lib/help/types";
import { PUBLIC_SITE_NAME } from "@/shared/lib/site/public-site";
import { SUPPORT_EMAIL } from "@/shared/lib/site/support";

/**
 * The public how-to pages: the same notes the signed-in Help page shows,
 * readable without an account. Static; no data is read.
 */

const eyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#77591B]";
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2A05A]/40";

/** A step or note line, with on-screen labels set apart. */
function HelpLine({ text }: { readonly text: string }) {
  return (
    <>
      {parseHelpText(text).map((segment, index) =>
        segment.label ? (
          <strong key={index} className="font-semibold text-stone-900">
            {segment.text}
          </strong>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

function surfaceLine(note: HelpNote): string {
  if (note.surface === "technician") return "In the technician view, on a phone";
  if (note.surface === "any") return "On your own phone or computer";
  return "In the office view, on a computer or a phone";
}

export function HowToIndexPage() {
  const searchNotes: HowToSearchNote[] = HELP_NOTES.map((note) => ({
    slug: note.slug,
    title: note.title,
    summary: note.summary,
    steps: note.steps,
    goodToKnow: note.goodToKnow,
    alsoAsked: note.alsoAsked,
    areaLabel: getHelpArea(note.area).label,
  }));

  return (
    <ResourceChrome>
      <ResourceMain width="wide">
        <header>
          <p className={eyebrowClass}>{HOW_TO_SECTION_NAME}</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.5rem]">
            How to do it in {PUBLIC_SITE_NAME}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
            Short steps for the things an HVAC shop does every day. Each note names the buttons as
            they appear on the screen, and each one is checked against the software it describes.
          </p>
        </header>

        <HowToSearch notes={searchNotes} />

        <div className="mt-10 space-y-10">
          {HELP_AREAS.map((area) => {
            const notes = listHelpNotesInArea(area.id);
            if (notes.length === 0) return null;
            return (
              <section key={area.id} id={area.id} aria-labelledby={`${area.id}-heading`} className="scroll-mt-28">
                <h2 id={`${area.id}-heading`} className="text-xl font-semibold tracking-tight text-[#0A0A0A]">
                  {area.label}
                </h2>
                <p className="mt-1 text-sm text-stone-600">{area.blurb}</p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {notes.map((note) => (
                    <li key={note.slug}>
                      <Link
                        href={howToNotePath(note.slug)}
                        className={`block h-full rounded-2xl border border-stone-200/80 bg-white px-5 py-4 shadow-sm transition-colors hover:border-[#C2A05A] ${focusRing}`}
                      >
                        <span className="block text-[15px] font-semibold text-stone-900">{note.title}</span>
                        <span className="mt-1 block text-sm leading-snug text-stone-600">{note.summary}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <p className="mt-12 text-sm text-stone-600">
          Something missing or out of date? Write to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={resourceLinkClass}>
            {SUPPORT_EMAIL}
          </a>{" "}
          and a person will answer.
        </p>
      </ResourceMain>
    </ResourceChrome>
  );
}

export function HowToNotePage({ note }: { readonly note: HelpNote }) {
  const area = getHelpArea(note.area);
  const related = (note.related ?? [])
    .map((slug) => getHelpNote(slug))
    .filter((candidate): candidate is HelpNote => candidate !== null);

  return (
    <ResourceChrome>
      <ResourceMain>
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-stone-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href={HOW_TO_PATH} className={`rounded-sm hover:text-[#77591B] ${focusRing}`}>
                {HOW_TO_SECTION_NAME}
              </Link>
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true">/</span>
              <Link href={`${HOW_TO_PATH}#${area.id}`} className={`rounded-sm hover:text-[#77591B] ${focusRing}`}>
                {area.label}
              </Link>
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true">/</span>
              <span aria-current="page">{note.title}</span>
            </li>
          </ol>
        </nav>

        <header>
          <p className={eyebrowClass}>{area.label}</p>
          <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-[#0A0A0A] sm:text-[2.5rem]">
            {note.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">{note.summary}</p>
        </header>

        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Who can do this</dt>
            <dd className="mt-1 text-stone-800">{describeHelpNoteAudience(note)}</dd>
          </div>
          <div className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Where</dt>
            <dd className="mt-1 text-stone-800">{surfaceLine(note)}</dd>
          </div>
        </dl>

        <ResourceCard className="mt-6">
          <h2 className="text-lg font-semibold text-[#0A0A0A]">Steps</h2>
          <ol className="mt-4 space-y-4">
            {note.steps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#77591B] text-[13px] font-bold text-white"
                >
                  {index + 1}
                </span>
                <span className="pt-0.5 text-[15px] leading-relaxed text-stone-700">
                  <span className="sr-only">Step {index + 1}: </span>
                  <HelpLine text={step} />
                </span>
              </li>
            ))}
          </ol>
        </ResourceCard>

        {note.goodToKnow && note.goodToKnow.length > 0 ? (
          <section className="mt-6" aria-labelledby="good-to-know">
            <h2 id="good-to-know" className="text-lg font-semibold text-[#0A0A0A]">
              Good to know
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-stone-700">
              {note.goodToKnow.map((line, index) => (
                <li key={index}>
                  <HelpLine text={line} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="mt-8" aria-labelledby="related-notes">
            <h2 id="related-notes" className="text-lg font-semibold text-[#0A0A0A]">
              Often next
            </h2>
            <ul className="mt-3 space-y-2 text-[15px]">
              {related.map((other) => (
                <li key={other.slug}>
                  <Link href={howToNotePath(other.slug)} className={resourceLinkClass}>
                    {other.title}
                  </Link>
                  <span className="text-stone-600">: {other.summary}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-10 text-sm text-stone-600">
          <Link href={HOW_TO_PATH} className={resourceLinkClass}>
            All how-to notes
          </Link>
        </p>
      </ResourceMain>
    </ResourceChrome>
  );
}
