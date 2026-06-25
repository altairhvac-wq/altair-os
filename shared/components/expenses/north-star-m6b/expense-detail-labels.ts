import {
  formatExpenseAmount,
  formatExpenseDate,
} from "@/shared/types/expense";

/** Missing-value placeholder on ivory section cards */
export const northStarMissingValueClass =
  "text-sm font-medium italic text-[#64748B]";

/** Missing-value placeholder on dark hero / meta surfaces */
export const northStarDarkMissingValueClass =
  "font-medium italic text-[#B8AD9E]";

export function getExpenseMerchantLabel(merchant: string) {
  const trimmed = merchant.trim();
  if (trimmed) {
    return { text: trimmed, missing: false };
  }

  return { text: "Missing merchant", missing: true };
}

export function getExpenseDateLabel(date: string | undefined) {
  if (!date) {
    return { text: "Date not set", missing: true };
  }

  return { text: formatExpenseDate(date), missing: false };
}

export function getExpenseAmountLabel(amount: number | undefined) {
  if (amount == null) {
    return { text: "Missing amount", missing: true };
  }

  return { text: formatExpenseAmount(amount), missing: false };
}

export function getExpenseTechnicianLabel(technician: string) {
  const trimmed = technician.trim();
  if (trimmed) {
    return { text: trimmed, missing: false };
  }

  return { text: "No technician", missing: true };
}

export function getExpenseJobLabel(jobNumber: string | undefined) {
  const trimmed = jobNumber?.trim();
  if (trimmed) {
    return { text: trimmed, missing: false };
  }

  return { text: "No job linked", missing: true };
}
