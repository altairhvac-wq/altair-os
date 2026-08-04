import { isValidEmail, normalizeEmail } from "@/shared/lib/email-validation";
import {
  isValidIanaTimeZone,
  normalizeCompanyTimeZone,
} from "@/shared/lib/company-timezones";
import {
  normalizeTradeKey,
  type TradeKey,
} from "@/shared/lib/trades/trade-options";

export type CompanyProfileEditableFields = {
  name: string;
  trade: TradeKey | null;
  timezone: string;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
};

export type CompanyProfileInput = {
  name?: string;
  trade?: string | null;
  timezone?: string;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export type CompanyProfileFormValues = {
  name: string;
  trade: string;
  timezone: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

function trimOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function companyProfileToFormValues(
  profile: CompanyProfileEditableFields,
): CompanyProfileFormValues {
  return {
    name: profile.name,
    trade: profile.trade ?? "",
    timezone: profile.timezone,
    phone: profile.phone ?? "",
    email: profile.email ?? "",
    addressLine1: profile.addressLine1 ?? "",
    addressLine2: profile.addressLine2 ?? "",
    city: profile.city ?? "",
    state: profile.state ?? "",
    postalCode: profile.postalCode ?? "",
    country: profile.country || "US",
  };
}

export function validateCompanyProfileInput(
  input: CompanyProfileInput,
): { data?: CompanyProfileEditableFields; error?: string } {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) {
    return { error: "Company name is required." };
  }

  if (name.length > 120) {
    return { error: "Company name must be 120 characters or fewer." };
  }

  const tradeRaw =
    input.trade === null || input.trade === undefined
      ? null
      : String(input.trade).trim();
  const trade = tradeRaw ? normalizeTradeKey(tradeRaw) : null;
  if (tradeRaw && !trade) {
    return { error: "Select a valid trade." };
  }

  const timezoneRaw =
    typeof input.timezone === "string" ? input.timezone.trim() : "";
  if (!timezoneRaw) {
    return { error: "Timezone is required." };
  }
  if (!isValidIanaTimeZone(timezoneRaw)) {
    return { error: "Select a valid timezone." };
  }

  const emailRaw = trimOrNull(input.email);
  if (emailRaw && !isValidEmail(emailRaw)) {
    return { error: "Enter a valid company email address." };
  }

  const phone = trimOrNull(input.phone);
  if (phone && phone.length > 40) {
    return { error: "Phone number must be 40 characters or fewer." };
  }

  const addressLine1 = trimOrNull(input.addressLine1);
  const addressLine2 = trimOrNull(input.addressLine2);
  const city = trimOrNull(input.city);
  const state = trimOrNull(input.state);
  const postalCode = trimOrNull(input.postalCode);

  if (addressLine1 && addressLine1.length > 200) {
    return { error: "Address line 1 must be 200 characters or fewer." };
  }
  if (addressLine2 && addressLine2.length > 200) {
    return { error: "Address line 2 must be 200 characters or fewer." };
  }
  if (city && city.length > 100) {
    return { error: "City must be 100 characters or fewer." };
  }
  if (state && state.length > 100) {
    return { error: "State / province must be 100 characters or fewer." };
  }
  if (postalCode && postalCode.length > 30) {
    return { error: "Postal code must be 30 characters or fewer." };
  }

  const countryRaw = trimOrNull(input.country) ?? "US";
  if (countryRaw.length > 100) {
    return { error: "Country must be 100 characters or fewer." };
  }

  return {
    data: {
      name,
      trade,
      timezone: normalizeCompanyTimeZone(timezoneRaw),
      phone,
      email: emailRaw ? normalizeEmail(emailRaw) : null,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country: countryRaw,
    },
  };
}

export function validateCompanyTimezoneInput(
  timezone: unknown,
): { timezone?: string; error?: string } {
  const timezoneRaw = typeof timezone === "string" ? timezone.trim() : "";
  if (!timezoneRaw) {
    return { error: "Timezone is required." };
  }
  if (!isValidIanaTimeZone(timezoneRaw)) {
    return { error: "Select a valid timezone." };
  }

  return { timezone: normalizeCompanyTimeZone(timezoneRaw) };
}
