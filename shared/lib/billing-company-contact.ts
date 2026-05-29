import type { CompanyRow } from "@/lib/database/types/core-tables";
import { isValidEmail } from "@/shared/lib/email-validation";

export type BillingCompanyContact = {
  name: string;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  /** Optional logo URL for invoice letterhead (future settings wiring). */
  logoUrl?: string | null;
};

export function mapCompanyRowToBillingContact(
  company: Pick<
    CompanyRow,
    | "name"
    | "phone"
    | "email"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "postal_code"
  >,
): BillingCompanyContact {
  return {
    name: company.name,
    phone: company.phone?.trim() || null,
    email: company.email?.trim() || null,
    addressLine1: company.address_line1?.trim() || null,
    addressLine2: company.address_line2?.trim() || null,
    city: company.city?.trim() || null,
    state: company.state?.trim() || null,
    postalCode: company.postal_code?.trim() || null,
  };
}

export function getBillingCompanyReplyTo(
  contact: Pick<BillingCompanyContact, "email">,
): string | undefined {
  const email = contact.email?.trim();

  if (!email || !isValidEmail(email)) {
    return undefined;
  }

  return email;
}

export function formatBillingCompanyCityState(
  contact: Pick<BillingCompanyContact, "city" | "state">,
): string | null {
  const city = contact.city?.trim();
  const state = contact.state?.trim();

  if (city && state) {
    return `${city}, ${state}`;
  }

  return city || state || null;
}

export function formatBillingCompanyAddressLines(
  contact: Pick<
    BillingCompanyContact,
    "addressLine1" | "addressLine2" | "city" | "state" | "postalCode"
  >,
): string[] {
  const lines: string[] = [];

  if (contact.addressLine1?.trim()) {
    lines.push(contact.addressLine1.trim());
  }

  if (contact.addressLine2?.trim()) {
    lines.push(contact.addressLine2.trim());
  }

  const cityState = formatBillingCompanyCityState(contact);
  const postalCode = contact.postalCode?.trim();
  const locality = [cityState, postalCode].filter(Boolean).join(" ");

  if (locality) {
    lines.push(locality);
  }

  return lines;
}

export function formatBillingCompanyContactLines(
  contact: Pick<
    BillingCompanyContact,
    "phone" | "email" | "city" | "state"
  >,
): string[] {
  const lines: string[] = [];

  if (contact.phone?.trim()) {
    lines.push(contact.phone.trim());
  }

  if (contact.email?.trim()) {
    lines.push(contact.email.trim());
  }

  const cityState = formatBillingCompanyCityState(contact);

  if (cityState) {
    lines.push(cityState);
  }

  return lines;
}
