import type {
  CustomerSeed,
  EquipmentSeed,
  EstimateSeed,
  InvoiceSeed,
  JobSeed,
  LeadSeed,
  MaterialSeed,
  NotificationSeed,
  ServiceItemSeed,
} from "@/lib/database/services/demo-data-seed-definitions";
import { ELECTRICAL_DEMO_SEED_PACK } from "@/lib/database/services/demo-data-seed-pack-electrical";
import { HVAC_DEMO_SEED_PACK } from "@/lib/database/services/demo-data-seed-pack-hvac";
import { normalizeTradeKey } from "@/shared/lib/trades/trade-options";

export type DemoSeedPack = {
  serviceItems: ServiceItemSeed[];
  customers: CustomerSeed[];
  leads: LeadSeed[];
  equipment: EquipmentSeed[];
  jobs: JobSeed[];
  materials: MaterialSeed[];
  estimates: EstimateSeed[];
  invoices: InvoiceSeed[];
  notifications: NotificationSeed[];
};

export function getDemoSeedDefinitionsForTrade(
  companyTrade: string | null | undefined,
): DemoSeedPack {
  if (normalizeTradeKey(companyTrade) === "electrical") {
    return ELECTRICAL_DEMO_SEED_PACK;
  }

  return HVAC_DEMO_SEED_PACK;
}
