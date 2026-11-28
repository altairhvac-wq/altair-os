import { HOW_TO_PATH, howToNotePath } from "@/shared/lib/help/paths";
import { plainHelpText } from "@/shared/lib/help/text";
import type { HelpArea, HelpNote } from "@/shared/lib/help/types";
import { PUBLIC_SITE_NAME, PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";

/** What the public how-to section is called, everywhere it is named. */
export const HOW_TO_SECTION_NAME = "Product how-to";

const absolute = (path: string) => `${PUBLIC_SITE_ORIGIN}${path}`;

/** The index page: a collection of the note pages. */
export function buildHowToIndexStructuredData(input: {
  description: string;
  notes: readonly HelpNote[];
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${HOW_TO_SECTION_NAME}: ${PUBLIC_SITE_NAME}`,
    description: input.description,
    url: absolute(HOW_TO_PATH),
    isPartOf: { "@type": "WebSite", name: PUBLIC_SITE_NAME, url: PUBLIC_SITE_ORIGIN },
    hasPart: input.notes.map((note) => ({
      "@type": "WebPage",
      name: note.title,
      url: absolute(howToNotePath(note.slug)),
    })),
  };
}

/**
 * One note: its steps as a HowTo, plus the breadcrumb trail. The steps are
 * the same text the page shows, with the label markup removed.
 */
export function buildHowToNoteStructuredData(
  note: HelpNote,
  area: HelpArea,
): Record<string, unknown> {
  const url = absolute(howToNotePath(note.slug));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HowTo",
        name: note.title,
        description: note.summary,
        url,
        step: note.steps.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          text: plainHelpText(step),
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: HOW_TO_SECTION_NAME, item: absolute(HOW_TO_PATH) },
          { "@type": "ListItem", position: 2, name: area.label, item: `${absolute(HOW_TO_PATH)}#${area.id}` },
          { "@type": "ListItem", position: 3, name: note.title, item: url },
        ],
      },
    ],
  };
}
