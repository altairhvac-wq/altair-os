import type { LeadStatus } from "@/shared/types/lead";

export const LEAD_STATUS_NORTH_STAR_BADGE_STYLES: Record<LeadStatus, string> = {
  new: "bg-[#EFE4CB] text-[#4F4638] ring-[rgba(138,99,36,0.18)]",
  contacted: "bg-[#F1E7D2] text-[#4F4638] ring-[rgba(138,99,36,0.14)]",
  scheduled: "bg-[#F1E7D2] text-[#4F4638] ring-[rgba(138,99,36,0.14)]",
  estimate_sent: "bg-[rgba(201,164,77,0.18)] text-[#4F4638] ring-[rgba(201,164,77,0.28)]",
  won: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  lost: "bg-[#F1E7D2] text-[#4F4638] ring-[rgba(138,99,36,0.12)]",
};

export const leadNorthStarStyles = {
  sectionCard:
    "rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] p-4",
  sectionTitle: "text-sm font-semibold text-[#17130E]",
  sectionLabel:
    "text-xs font-medium uppercase tracking-wide text-[#4F4638]",
  sectionValue: "mt-1 text-sm text-[#17130E]",
  sectionValueStrong: "mt-1 text-sm font-semibold text-[#17130E]",
  helperText: "mt-1 text-xs leading-snug text-[#64748B]",
  primaryText: "text-[#17130E]",
  secondaryText: "text-[#4F4638]",
  linkAccent:
    "font-medium text-[#8A6324] transition-colors hover:text-[#B88A2E]",
  formLabel: "mb-1 block text-xs font-semibold text-[#4F4638]",
  formInput:
    "w-full min-h-10 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-2 text-sm text-[#17130E] placeholder:text-[#64748B] outline-none transition-colors focus:border-[#B88A2E] focus:bg-[#FBF7EF] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)] sm:min-h-[44px] sm:py-2.5",
  formTextarea:
    "w-full min-h-[80px] max-w-full resize-y rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-2 text-sm text-[#17130E] placeholder:text-[#64748B] outline-none transition-colors focus:border-[#B88A2E] focus:bg-[#FBF7EF] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)] sm:min-h-[96px] sm:py-2.5",
  formSelect:
    "w-full min-h-10 rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-2 text-sm text-[#17130E] outline-none transition-colors focus:border-[#B88A2E] focus:bg-[#FBF7EF] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)] sm:min-h-[44px] sm:py-2.5",
  optionalFieldsCard:
    "space-y-3 rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] p-3",
  followUpChipActive:
    "rounded-full bg-[rgba(201,164,77,0.18)] px-3 py-1.5 text-xs font-semibold text-[#4F4638] ring-1 ring-inset ring-[rgba(201,164,77,0.28)]",
  followUpChipInactive:
    "rounded-full bg-[#FFF9EA] px-3 py-1.5 text-xs font-semibold text-[#4F4638] ring-1 ring-inset ring-[rgba(138,99,36,0.18)] transition-colors hover:bg-[#F3EBDD] hover:ring-[rgba(201,164,77,0.28)]",
  toggleLink:
    "text-xs font-semibold text-[#8A6324] transition-colors hover:text-[#B88A2E]",
  saveButton:
    "inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-4 py-2 text-sm font-semibold text-[#17130E] shadow-[0_2px_10px_rgba(138,99,36,0.28)] transition-all hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px] sm:w-auto sm:py-2.5",
  secondaryButton:
    "inline-flex min-h-10 items-center justify-center rounded-lg border border-[rgba(138,99,36,0.22)] bg-[#FFF9EA] px-3 py-2 text-sm font-semibold text-[#4F4638] transition-colors hover:border-[#C9A44D] hover:bg-[#F3EBDD] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9 sm:px-2.5 sm:py-1.5 sm:text-xs",
  menuShell:
    "absolute bottom-full right-0 z-10 mb-1 min-w-[12rem] overflow-hidden rounded-xl border border-[rgba(138,99,36,0.18)] bg-[#FBF7EF] py-1 shadow-lg sm:bottom-auto sm:top-full sm:mb-0 sm:mt-1",
  menuItem:
    "block w-full px-3 py-2.5 text-left text-sm font-medium text-[#4F4638] transition-colors hover:bg-[#F3EBDD]",
  aiSection:
    "min-w-0 overflow-hidden rounded-[1rem] border border-[rgba(138,99,36,0.14)] bg-[#FBF7EF] px-3 py-3 sm:px-4 sm:py-3.5",
  aiSectionUnavailable:
    "min-w-0 overflow-hidden rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FFF9EA] px-3 py-3 sm:px-4 sm:py-3.5",
  aiIcon: "h-4 w-4 text-[#8A6324]",
  aiIconMuted: "h-4 w-4 text-[#4F4638]",
  aiGenerateButton:
    "mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-[rgba(201,164,77,0.35)] bg-[#FFF9EA] px-3 py-2.5 text-sm font-semibold text-[#4F4638] transition-colors hover:border-[#C9A44D] hover:bg-[#F3EBDD] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9 sm:w-auto sm:px-2.5 sm:py-1.5 sm:text-xs",
  aiDraftShell:
    "mt-3 min-w-0 rounded-lg border border-[rgba(138,99,36,0.14)] bg-[#FFF9EA] px-3 py-2.5",
  aiDraftLabel:
    "min-w-0 text-[11px] font-semibold uppercase tracking-wide text-[#8A6324]",
  aiDraftText: "mt-2 break-words whitespace-pre-wrap text-sm leading-relaxed text-[#17130E]",
  aiActionButton:
    "inline-flex min-h-9 items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold text-[#4F4638] transition-colors hover:bg-[#F3EBDD] hover:text-[#17130E] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-8 sm:px-1.5 sm:py-1",
  timelineConnector: "absolute left-4 top-8 h-[calc(100%-1rem)] w-px bg-[rgba(138,99,36,0.18)]",
  timelineIconWrap:
    "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EFE4CB] text-[#8A6324] ring-1 ring-[rgba(138,99,36,0.12)]",
  timelineTitle: "text-sm font-semibold text-[#17130E]",
  timelineMeta: "text-xs text-[#64748B]",
  timelineBody: "mt-1 whitespace-pre-wrap text-sm text-[#4F4638]",
  timelineAuthor: "mt-1 text-xs text-[#64748B]",
  emptyState: "text-sm text-[#64748B]",
} as const;

export const ls = leadNorthStarStyles;
