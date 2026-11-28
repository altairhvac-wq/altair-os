import type { AssistantCapability } from "@/lib/assistant/types";
import {
  HELP_NOTES,
  canFollowHelpNote,
  describeHelpNoteAudience,
  getHelpNote,
  listHelpNotesFor,
  searchHelpNotes,
} from "@/shared/lib/help/catalog";
import { HELP_PATH, helpNotePath } from "@/shared/lib/help/paths";
import { plainHelpText } from "@/shared/lib/help/text";

/**
 * The first two capabilities: find a how-to note, and read one. They read the
 * same catalog the Help page and the public /how-to pages read, so the
 * assistant can only say what those pages say. No database is touched.
 */

const SEARCH_RESULT_LIMIT = 5;

export const helpSearchCapability: AssistantCapability = {
  id: "help.search",
  kind: "read",
  title: "Search the how-to notes",
  description:
    "Find how-to notes about using the product. Use this first for any \"how do I\" or \"where is\" question. Returns up to five notes this person can follow (slug, title, one-line summary), and separately the titles of matching notes that are for other roles, with who can do them. Read a note with help_read before giving its steps.",
  input: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "A few plain words about the task, such as \"send invoice\" or \"add receipt\".",
        maxLength: 200,
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  allowed: () => true,
  async run(context, input, environment) {
    const query = String(input.query);
    const mine = listHelpNotesFor(context.permissions);
    const found = searchHelpNotes(mine, query).slice(0, SEARCH_RESULT_LIMIT);

    // Notes that match but belong to another role. Only the title and who can
    // do it are given: enough to say "the office does that", nothing more.
    const forOthers = searchHelpNotes(
      HELP_NOTES.filter((note) => !canFollowHelpNote(note, context.permissions)),
      query,
    ).slice(0, 3);

    const lines: string[] = [];
    if (found.length === 0) {
      lines.push("No how-to note this person can follow matches that.");
    } else {
      lines.push("Notes this person can follow:");
      for (const note of found) {
        lines.push(`- slug: ${note.slug} | ${note.title} | ${note.summary}`);
      }
    }
    if (forOthers.length > 0) {
      lines.push("", "Matching notes for other roles (this person cannot do these):");
      for (const note of forOthers) {
        lines.push(`- ${note.title} | done by: ${describeHelpNoteAudience(note)}`);
      }
    }

    return {
      ok: true,
      forModel: lines.join("\n"),
      blocks:
        found.length > 0
          ? [
              {
                kind: "help-note-list",
                notes: found.map((note) => ({
                  slug: note.slug,
                  title: note.title,
                  summary: note.summary,
                })),
              },
            ]
          : [],
      source: {
        label: "Help: the how-to notes",
        href: HELP_PATH,
        readAt: environment.now.toISOString(),
      },
    };
  },
};

export const helpReadCapability: AssistantCapability = {
  id: "help.read",
  kind: "read",
  title: "Read a how-to note",
  description:
    "Read one how-to note by its slug (from help_search): its steps in order, what to know first, and the page where the task starts. Give the person the steps as the note has them.",
  input: {
    type: "object",
    properties: {
      slug: {
        type: "string",
        description: "The note's slug exactly as help_search returned it.",
        maxLength: 60,
      },
    },
    required: ["slug"],
    additionalProperties: false,
  },
  allowed: () => true,
  async run(context, input, environment) {
    const note = getHelpNote(String(input.slug));

    if (!note) {
      return { ok: false, message: "There is no how-to note with that slug. Search again." };
    }
    if (!canFollowHelpNote(note, context.permissions)) {
      return {
        ok: false,
        message: `That task is not available to this person's sign-in. It is done by: ${describeHelpNoteAudience(note)}.`,
      };
    }

    const steps = note.steps.map(plainHelpText);
    const goodToKnow = (note.goodToKnow ?? []).map(plainHelpText);

    return {
      ok: true,
      forModel: [
        `${note.title}: ${note.summary}`,
        "Steps:",
        ...steps.map((step, index) => `${index + 1}. ${step}`),
        ...(goodToKnow.length > 0 ? ["Good to know:", ...goodToKnow.map((line) => `- ${line}`)] : []),
        `Starts on: ${note.startLabel}`,
      ].join("\n"),
      blocks: [
        {
          kind: "help-note",
          slug: note.slug,
          title: note.title,
          summary: note.summary,
          steps: note.steps,
          goodToKnow: note.goodToKnow ?? [],
          startHref: note.startHref,
          startLabel: note.startLabel,
        },
      ],
      source: {
        label: `Help: "${note.title}"`,
        href: helpNotePath(note.slug),
        readAt: environment.now.toISOString(),
      },
    };
  },
};
