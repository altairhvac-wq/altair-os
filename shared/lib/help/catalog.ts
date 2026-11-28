import {
  COMPANY_ROLE_LABELS,
  COMPANY_ROLE_PERMISSIONS,
  type CompanyPermission,
} from "@/lib/database/types/roles";
import type { CompanyRole } from "@/lib/database/types/enums";
import { HELP_NOTES } from "@/shared/lib/help/all-notes";
import type { HelpArea, HelpAreaId, HelpNote } from "@/shared/lib/help/types";

export { HELP_NOTES };
export { searchHelpNotes } from "@/shared/lib/help/search";

/** Groups, in the order a new company meets them. */
export const HELP_AREAS: readonly HelpArea[] = [
  {
    id: "getting-started",
    label: "Getting started",
    blurb: "Set the company up, bring your customers in and put the app on your phone.",
  },
  { id: "customers", label: "Customers", blurb: "Add, find and keep customer records and their equipment." },
  { id: "leads", label: "Leads", blurb: "Track people who called but have not booked yet." },
  { id: "jobs", label: "Jobs and scheduling", blurb: "Book work, assign it and follow it through the day." },
  { id: "estimates", label: "Estimates", blurb: "Price the work, send it and get a yes." },
  { id: "invoices", label: "Invoices and payments", blurb: "Bill finished work and see what is still owed." },
  { id: "price-book", label: "Price book", blurb: "The services you sell and what you charge for them." },
  { id: "expenses", label: "Expenses and receipts", blurb: "Record what the company spent and who spent it." },
  { id: "team", label: "Team and time", blurb: "Invite people, set what they can do and see their hours." },
  { id: "reports", label: "Reports", blurb: "Money in, money owed and how the month is going." },
  { id: "settings", label: "Settings", blurb: "Company details, your numbers, card payments and your plan." },
  {
    id: "technician",
    label: "For technicians, on a phone",
    blurb: "The day's jobs, time, photos and receipts from the field.",
  },
];

const NOTES_BY_SLUG = new Map(HELP_NOTES.map((note) => [note.slug, note]));

export function getHelpNote(slug: string): HelpNote | null {
  return NOTES_BY_SLUG.get(slug) ?? null;
}

export function getHelpArea(id: HelpAreaId): HelpArea {
  const area = HELP_AREAS.find((candidate) => candidate.id === id);
  if (!area) {
    throw new Error(`Unknown help area: ${id}`);
  }
  return area;
}

/** Notes in an area, in the order they were written (the order of the task). */
export function listHelpNotesInArea(
  id: HelpAreaId,
  notes: readonly HelpNote[] = HELP_NOTES,
): HelpNote[] {
  return notes.filter((note) => note.area === id);
}

export type HelpPermissionMap = Readonly<Record<CompanyPermission, boolean>>;

/**
 * Whether this person can do what the note describes. A note with no
 * requirement is for everyone who can sign in.
 */
export function canFollowHelpNote(
  note: HelpNote,
  permissions: HelpPermissionMap,
): boolean {
  if (note.requires.length === 0) {
    return true;
  }
  return note.requires.some((permission) => permissions[permission] === true);
}

/** The notes this person can follow, in catalog order. */
export function listHelpNotesFor(permissions: HelpPermissionMap): HelpNote[] {
  return HELP_NOTES.filter((note) => canFollowHelpNote(note, permissions));
}

const ROLE_ORDER: readonly CompanyRole[] = [
  "owner",
  "admin",
  "dispatcher",
  "office_staff",
  "technician",
  "subcontractor",
];

/**
 * The roles that can follow a note, as the app names them. Empty means
 * everyone. Derived from the permission table so it cannot drift from it.
 */
export function helpNoteRoleLabels(note: HelpNote): string[] {
  if (note.requires.length === 0) {
    return [];
  }

  return ROLE_ORDER.filter((role) =>
    note.requires.some((permission) =>
      (COMPANY_ROLE_PERMISSIONS[permission] as readonly string[]).includes(role),
    ),
  ).map((role) => COMPANY_ROLE_LABELS[role]);
}

/**
 * "Owner, Admin and Office Staff", or "Everyone on the team". A note written
 * for the technician view names the technician: the permission behind it is
 * also held by owners and dispatchers, but they are not who the steps are for.
 */
export function describeHelpNoteAudience(note: HelpNote): string {
  if (note.surface === "technician" && note.requires.length > 0) {
    return "Technicians, on the jobs assigned to them";
  }
  const labels = helpNoteRoleLabels(note);
  if (labels.length === 0) {
    return "Everyone on the team";
  }
  if (labels.length === 1) {
    return labels[0];
  }
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
