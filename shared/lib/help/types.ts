import type { CompanyPermission } from "@/lib/database/types/roles";

/**
 * The how-to library: one catalog of short, checked "how do I..." notes that
 * three surfaces read (the signed-in Help page, the public /how-to pages and,
 * later, the assistant's "read a how-to note" lookup).
 *
 * A note describes the product as it is. Every on-screen label a step puts in
 * **bold** must be listed in `anchors` with the source file that renders it,
 * and `scripts/verify-help-notes.mjs` fails when the file no longer contains
 * that text. A screen cannot change its words without its note being found.
 */

/** Which part of the product a note belongs to. Drives grouping and order. */
export type HelpAreaId =
  | "getting-started"
  | "customers"
  | "leads"
  | "jobs"
  | "estimates"
  | "invoices"
  | "price-book"
  | "expenses"
  | "team"
  | "reports"
  | "settings"
  | "technician";

/**
 * Which shell the steps are written for. `office` is the admin app (computer
 * or phone); `technician` is the technician phone view; `any` is a page
 * outside both, such as the install page.
 */
export type HelpSurface = "office" | "technician" | "any";

/**
 * Proof that a label a step quotes is really on the screen: `text` appears
 * verbatim in `file` (repo-relative). Read only by the verifier.
 */
export type HelpAnchor = {
  readonly file: string;
  readonly text: string;
};

export type HelpNote = {
  /** URL-safe id; also the public page path segment. Never reused. */
  readonly slug: string;
  /** Sentence case, starts with a verb: "Send an invoice". */
  readonly title: string;
  /** One plain sentence saying what the note gets done. */
  readonly summary: string;
  readonly area: HelpAreaId;
  readonly surface: HelpSurface;
  /**
   * Who can do this. Any one of these permissions is enough; an empty list
   * means everyone who can sign in. Uses the same names the app's access
   * control uses, so the Help page shows a person only notes they can follow.
   */
  readonly requires: readonly CompanyPermission[];
  /** The signed-in page where the task starts. Must be a real route. */
  readonly startHref: string;
  /** Button text for the "take me there" link: "Open Invoices". */
  readonly startLabel: string;
  /**
   * 2 to 7 short steps. `**Label**` marks words copied from the screen and is
   * the only markup allowed.
   */
  readonly steps: readonly string[];
  /** Short, true conditions worth knowing before starting. Same markup. */
  readonly goodToKnow?: readonly string[];
  /** Other questions this note answers, for search. Lower case, no markup. */
  readonly alsoAsked?: readonly string[];
  /** Slugs of notes that usually come next. */
  readonly related?: readonly string[];
  readonly anchors: readonly HelpAnchor[];
};

export type HelpArea = {
  readonly id: HelpAreaId;
  /** Shown as the group heading. */
  readonly label: string;
  /** One line under the heading on the public index. */
  readonly blurb: string;
};
