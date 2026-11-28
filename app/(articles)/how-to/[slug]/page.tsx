import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HowToNotePage } from "@/shared/components/site/HowToPages";
import { JsonLdScript } from "@/shared/components/site/JsonLdScript";
import { HELP_NOTES, getHelpArea, getHelpNote } from "@/shared/lib/help/catalog";
import { howToNotePath } from "@/shared/lib/help/paths";
import { buildHowToNoteStructuredData } from "@/shared/lib/help/structured-data";
import { buildPublicSocialMetadata } from "@/shared/lib/site/public-site";

type Props = { params: Promise<{ slug: string }> };

/** Only the notes in the catalog exist; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return HELP_NOTES.map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const note = getHelpNote(slug);
  if (!note) return {};

  // The verifier keeps every note title short enough for the site suffix.
  return {
    title: note.title,
    description: note.summary,
    ...buildPublicSocialMetadata({
      path: howToNotePath(note.slug),
      title: `${note.title} · Altair Operating System`,
      description: note.summary,
    }),
  };
}

/** One how-to note, public and static. */
export default async function HowToNoteRoute({ params }: Props) {
  const { slug } = await params;
  const note = getHelpNote(slug);
  if (!note) notFound();

  return (
    <>
      <JsonLdScript data={buildHowToNoteStructuredData(note, getHelpArea(note.area))} />
      <HowToNotePage note={note} />
    </>
  );
}
