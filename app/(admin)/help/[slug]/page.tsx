import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { HelpNoteView } from "@/shared/components/support/HelpNoteView";
import {
  canFollowHelpNote,
  getHelpArea,
  getHelpNote,
} from "@/shared/lib/help/catalog";
import type { HelpNote } from "@/shared/lib/help/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const note = getHelpNote(slug);
  return { title: note ? note.title : "Help & support" };
}

/**
 * One how-to note inside the app. The notes themselves are public copy (the
 * same text is at /how-to), so a note this sign-in cannot follow is still
 * shown, without its "take me there" button and with who it is for.
 */
export default async function HelpNotePage({ params }: Props) {
  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    redirect("/setup");
  }

  const { slug } = await params;
  const note = getHelpNote(slug);

  if (!note) {
    notFound();
  }

  const related = (note.related ?? [])
    .map((relatedSlug) => getHelpNote(relatedSlug))
    .filter(
      (candidate): candidate is HelpNote =>
        candidate !== null && canFollowHelpNote(candidate, companyContext.permissions),
    );

  return (
    <HelpNoteView
      note={note}
      areaLabel={getHelpArea(note.area).label}
      canFollow={canFollowHelpNote(note, companyContext.permissions)}
      related={related}
    />
  );
}
