import { Mail, MapPin, Phone } from "lucide-react";
import {
  formatBillingCompanyAddressLines,
  formatBillingCompanyContactLines,
  type BillingCompanyContact,
} from "@/shared/lib/billing-company-contact";

type BillingCompanyContactBlockProps = {
  company: BillingCompanyContact;
  showAddress?: boolean;
  className?: string;
};

export function BillingCompanyContactBlock({
  company,
  showAddress = false,
  className = "",
}: BillingCompanyContactBlockProps) {
  const contactLines = formatBillingCompanyContactLines(company);
  const addressLines = showAddress
    ? formatBillingCompanyAddressLines(company)
    : [];

  const lines = showAddress
    ? [...addressLines, ...contactLines.filter((line) => !addressLines.includes(line))]
    : contactLines;

  if (lines.length === 0) {
    return null;
  }

  const iconForLine = (line: string) => {
    if (company.phone?.trim() === line) {
      return Phone;
    }

    if (company.email?.trim() === line) {
      return Mail;
    }

    return MapPin;
  };

  return (
    <div className={`space-y-1.5 text-sm text-slate-600 ${className}`}>
      {lines.map((line) => {
        const Icon = iconForLine(line);

        return (
          <div key={line} className="flex items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span className="min-w-0 break-words">{line}</span>
          </div>
        );
      })}
    </div>
  );
}
