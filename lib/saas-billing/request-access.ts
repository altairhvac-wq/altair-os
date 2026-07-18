import "server-only";

import { cache } from "react";
import { resolveCompanyBillingAccess } from "@/lib/saas-billing/resolver";
import type { CompanyBillingAccess } from "@/lib/saas-billing/types";

/**
 * Request-scoped billing access. Deduplicates resolver work across a single
 * authenticated render (layouts + any nested callers).
 */
export const getRequestCompanyBillingAccess = cache(
  async (companyId: string): Promise<CompanyBillingAccess> => {
    return resolveCompanyBillingAccess(companyId);
  },
);
