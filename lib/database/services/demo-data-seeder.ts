import { createClient } from "@/lib/supabase/server";
import { mapDemoDataError } from "@/lib/database/errors";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import {
  clearCompanyDemoData,
  getDemoDataStatus,
  markCompanyDemoDataSeeded,
  prepareCompanyDemoSeed,
  resolveDemoTechnicianId,
} from "@/lib/database/queries/demo-data";
import {
  isDemoEstimateNumber,
  isDemoInvoiceNumber,
  isDemoJobNumber,
  isDemoScopedName,
} from "@/shared/lib/demo-data-identifiers";
import { withDemoName } from "@/shared/lib/demo-data-settings";
import {
  DEMO_CUSTOMERS,
  DEMO_EQUIPMENT,
  DEMO_JOBS,
  DEMO_LEADS,
  DEMO_SERVICE_ITEMS,
  DEMO_TAX_RATE,
  type JobSeed,
} from "@/lib/database/services/demo-data-seed-definitions";

type SeedContext = {
  companyId: string;
  actorId: string;
  technicianId: string;
  demoEmail: string;
  now: Date;
};

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function atTime(base: Date, hours: number, minutes = 0): Date {
  const next = new Date(base);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveDemoCustomerEmail(context: ActiveCompanyContext): string {
  return (
    context.user.email?.trim() ||
    context.profile.email?.trim() ||
    ""
  );
}

type TimeEntrySeedInput = {
  company_id: string;
  technician_id: string;
  job_id?: string | null;
  entry_type: "clock" | "break" | "job_labor";
  started_at: string;
  ended_at?: string | null;
  duration_minutes?: number | null;
  notes?: string | null;
  is_demo?: boolean;
};

type DatabaseInsertError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

type DemoConflictLookup = {
  matchOn: Record<string, unknown>;
  isDemoScoped: (existing: Record<string, unknown>) => boolean;
};

function extractConstraintName(error: DatabaseInsertError): string | null {
  const message = error.message ?? "";
  const match = message.match(/unique constraint "([^"]+)"/i);
  return match?.[1] ?? null;
}

function formatDemoSeedInsertError(
  error: DatabaseInsertError,
  step: string,
  table: string,
): string {
  const constraint = extractConstraintName(error);
  const mapped = mapDemoDataError(error, "seed", { accessVerified: true });

  if (error.code === "23505") {
    const constraintLabel = constraint ? ` (${constraint})` : "";
    return `Demo seed failed at ${step} on ${table}: a matching record already exists${constraintLabel}. Clear demo data and try again.`;
  }

  return mapped;
}

function buildDemoConflictLookup(
  table: string,
  row: Record<string, unknown>,
): DemoConflictLookup | undefined {
  switch (table) {
    case "service_items":
      if (typeof row.name === "string") {
        return {
          matchOn: { name: row.name },
          isDemoScoped: (existing) =>
            isDemoScopedName(String(existing.name ?? "")),
        };
      }
      break;
    case "customers":
      if (typeof row.name === "string") {
        return {
          matchOn: { name: row.name },
          isDemoScoped: (existing) =>
            isDemoScopedName(String(existing.name ?? "")),
        };
      }
      break;
    case "jobs":
      if (typeof row.job_number === "string") {
        return {
          matchOn: { job_number: row.job_number },
          isDemoScoped: (existing) =>
            isDemoJobNumber(String(existing.job_number ?? "")),
        };
      }
      break;
    case "estimates":
      if (typeof row.estimate_number === "string") {
        return {
          matchOn: { estimate_number: row.estimate_number },
          isDemoScoped: (existing) =>
            isDemoEstimateNumber(String(existing.estimate_number ?? "")),
        };
      }
      break;
    case "invoices":
      if (typeof row.invoice_number === "string") {
        return {
          matchOn: { invoice_number: row.invoice_number },
          isDemoScoped: (existing) =>
            isDemoInvoiceNumber(String(existing.invoice_number ?? "")),
        };
      }
      break;
  }

  return undefined;
}

async function findExistingDemoRow(
  companyId: string,
  table: string,
  lookup: DemoConflictLookup,
): Promise<Record<string, unknown> | null> {
  const supabase = await createClient();

  let query = supabase.from(table).select("*").eq("company_id", companyId);

  for (const [column, value] of Object.entries(lookup.matchOn)) {
    query = query.eq(column, value as string);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    console.error("[seedDemoData] conflict lookup failed", {
      table,
      companyId,
      matchOn: lookup.matchOn,
      code: error?.code ?? null,
      message: error?.message ?? null,
    });
    return null;
  }

  return data as Record<string, unknown>;
}

async function closeOpenDemoTimeEntries(
  companyId: string,
  technicianId: string,
): Promise<void> {
  const supabase = await createClient();
  const endedAt = new Date().toISOString();

  const { error } = await supabase
    .from("time_entries")
    .update({
      ended_at: endedAt,
      duration_minutes: 0,
    } as never)
    .eq("company_id", companyId)
    .eq("technician_id", technicianId)
    .eq("is_demo", true)
    .is("ended_at", null);

  if (error) {
    console.error("[seedDemoData] close open demo time entries failed", {
      companyId,
      technicianId,
      code: error.code,
      message: error.message,
    });
  }
}

async function hasOpenRealTimeSegment(
  companyId: string,
  technicianId: string,
  entryType: "clock" | "break" | "job_labor",
): Promise<boolean> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("time_entries")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("technician_id", technicianId)
    .eq("entry_type", entryType)
    .eq("is_demo", false)
    .is("ended_at", null);

  if (error) {
    console.error("[seedDemoData] open time segment lookup failed", {
      companyId,
      technicianId,
      entryType,
      code: error.code,
      message: error.message,
    });
    return false;
  }

  return (count ?? 0) > 0;
}

function validateTimeEntrySeed(input: TimeEntrySeedInput): string | null {
  if (input.entry_type === "job_labor" && !input.job_id) {
    return "Demo time entry seed error: job labor requires a job.";
  }

  const startedAt = Date.parse(input.started_at);
  if (!Number.isFinite(startedAt)) {
    return "Demo time entry seed error: invalid start time.";
  }

  if (input.ended_at) {
    const endedAt = Date.parse(input.ended_at);
    if (!Number.isFinite(endedAt)) {
      return "Demo time entry seed error: invalid end time.";
    }

    if (endedAt < startedAt) {
      return "Demo time entry seed error: end time must be after start time.";
    }
  }

  if (input.duration_minutes != null && input.duration_minutes < 0) {
    return "Demo time entry seed error: duration cannot be negative.";
  }

  return null;
}

async function insertTimeEntry(
  step: string,
  companyId: string,
  row: TimeEntrySeedInput,
  options: { allowSkipOpenSegment?: boolean } = {},
): Promise<void> {
  const validationError = validateTimeEntrySeed(row);
  if (validationError) {
    throw new Error(validationError);
  }

  const isOpenSegment = row.ended_at == null;
  if (options.allowSkipOpenSegment && isOpenSegment) {
    const hasRealOpenSegment = await hasOpenRealTimeSegment(
      companyId,
      row.technician_id,
      row.entry_type,
    );
    if (hasRealOpenSegment) {
      console.warn("[seedDemoData] skipping open demo time segment", {
        step,
        companyId,
        entryType: row.entry_type,
        technicianId: row.technician_id,
      });
      return;
    }
  }

  const result = await insertRow(step, companyId, "time_entries", row);
  if (result.error || !result.id) {
    throw new Error(result.error ?? "Failed to seed time entries.");
  }
}

async function insertRow(
  step: string,
  companyId: string,
  table: string,
  row: Record<string, unknown>,
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .insert(row as never)
    .select("id")
    .single();

  if (!error && data) {
    return { id: (data as { id: string }).id, error: null };
  }

  const conflictLookup = buildDemoConflictLookup(table, row);
  if (error?.code === "23505" && conflictLookup) {
    const existing = await findExistingDemoRow(companyId, table, conflictLookup);
    if (existing && conflictLookup.isDemoScoped(existing)) {
      const existingId = String(existing.id ?? "");
      if (existing.is_demo === false) {
        await supabase
          .from(table)
          .update({ is_demo: true } as never)
          .eq("id", existingId);
      }

      console.warn("[seedDemoData] reusing existing demo-scoped row", {
        step,
        table,
        companyId,
        id: existingId,
        matchOn: conflictLookup.matchOn,
      });
      return { id: existingId, error: null };
    }
  }

  if (error || !data) {
    console.error("[seedDemoData] insert failed", {
      step,
      table,
      companyId,
      code: error?.code ?? null,
      message: error?.message ?? null,
      details: error?.details ?? null,
      hint: error?.hint ?? null,
      constraint: error ? extractConstraintName(error) : null,
      matchOn: conflictLookup?.matchOn ?? null,
    });
    return {
      id: null,
      error: error
        ? formatDemoSeedInsertError(error, step, table)
        : `Failed to insert ${table}.`,
    };
  }

  return { id: (data as { id: string }).id, error: null };
}

function buildJobSchedule(seed: JobSeed, now: Date): Date {
  const day = addDays(now, seed.scheduledDaysFromNow);
  return atTime(day, seed.scheduledHour, seed.scheduledMinute ?? 0);
}

function buildJobTimestamps(
  seed: JobSeed,
  scheduledAt: Date,
): {
  arrivedAt?: string;
  workStartedAt?: string;
  completedAt?: string;
} {
  if (seed.status === "scheduled") {
    return {};
  }

  const arrivedAt = seed.arrivedMinutesAfterStart
    ? new Date(scheduledAt.getTime() + seed.arrivedMinutesAfterStart * 60_000)
    : undefined;
  const workStartedAt = seed.workStartedMinutesAfterStart
    ? new Date(scheduledAt.getTime() + seed.workStartedMinutesAfterStart * 60_000)
    : undefined;
  const completedAt = seed.completedMinutesAfterStart
    ? new Date(scheduledAt.getTime() + seed.completedMinutesAfterStart * 60_000)
    : undefined;

  return {
    arrivedAt: arrivedAt?.toISOString(),
    workStartedAt: workStartedAt?.toISOString(),
    completedAt: completedAt?.toISOString(),
  };
}

function computeTax(subtotal: number): { tax: number; total: number } {
  const tax = roundCurrency(subtotal * (DEMO_TAX_RATE / 100));
  return { tax, total: roundCurrency(subtotal + tax) };
}

export async function seedCompanyDemoData(
  context: ActiveCompanyContext,
): Promise<{ error: string | null; seededAt?: string }> {
  const companyId = context.company.id;
  const status = await getDemoDataStatus(companyId, context);

  if (status.hasDemoData) {
    return { error: "Demo data has already been loaded for this company." };
  }

  const prepResult = await prepareCompanyDemoSeed(companyId);
  if (prepResult.error) {
    return { error: prepResult.error };
  }

  const demoEmail = resolveDemoCustomerEmail(context);
  if (!demoEmail) {
    return {
      error:
        "Your account needs an email address before demo data can be loaded. Demo customer emails route to the owner/admin for safe testing.",
    };
  }

  const seedContext: SeedContext = {
    companyId,
    actorId: context.user.id,
    technicianId: await resolveDemoTechnicianId(companyId, context.user.id),
    demoEmail,
    now: new Date(),
  };

  const serviceItemIds: Record<string, string> = {};
  const customerIds: Record<string, string> = {};
  const leadIds: Record<string, string> = {};
  const jobIds: Record<string, string> = {};

  try {
    for (const item of DEMO_SERVICE_ITEMS) {
      const result = await insertRow("seed_service_items", companyId, "service_items", {
        company_id: companyId,
        name: withDemoName(item.name),
        description: item.description,
        unit_cost: item.unitCost ?? null,
        unit_price: item.unitPrice,
        taxable: true,
        category: item.category,
        is_active: true,
        is_demo: true,
      });

      if (result.error || !result.id) {
        throw new Error(result.error ?? "Failed to seed service items.");
      }

      serviceItemIds[item.key] = result.id;
    }

    for (const customer of DEMO_CUSTOMERS) {
      const result = await insertRow("seed_customers", companyId, "customers", {
        company_id: companyId,
        name: withDemoName(customer.name),
        email: seedContext.demoEmail,
        phone: customer.phone,
        company_name: customer.companyName ?? null,
        status: customer.status,
        address_line1: customer.address,
        city: customer.city,
        state: customer.state,
        postal_code: customer.postalCode,
        tags: customer.tags,
        notes: customer.notes ?? null,
        total_jobs: customer.totalJobs,
        total_revenue: customer.totalRevenue,
        last_service_date:
          customer.lastServiceDaysAgo !== undefined
            ? addDays(seedContext.now, -customer.lastServiceDaysAgo).toISOString()
            : null,
        created_at: addDays(seedContext.now, -customer.createdDaysAgo).toISOString(),
        is_demo: true,
      });

      if (result.error || !result.id) {
        throw new Error(result.error ?? "Failed to seed customers.");
      }

      customerIds[customer.key] = result.id;
    }

    for (const lead of DEMO_LEADS) {
      const convertedCustomerId = lead.convertedCustomerKey
        ? customerIds[lead.convertedCustomerKey]
        : null;
      const createdAt = addDays(seedContext.now, -lead.createdDaysAgo).toISOString();

      const result = await insertRow("seed_leads", companyId, "leads", {
        company_id: companyId,
        created_by: seedContext.actorId,
        first_name: lead.firstName,
        last_name: lead.lastName,
        company_name: lead.companyName ?? null,
        email: seedContext.demoEmail,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        notes: lead.notes ?? null,
        converted_customer_id: convertedCustomerId,
        lost_at: lead.status === "lost" ? createdAt : null,
        lost_reason: lead.lostReason ?? null,
        created_at: createdAt,
        is_demo: true,
      });

      if (result.error || !result.id) {
        throw new Error(result.error ?? "Failed to seed leads.");
      }

      leadIds[lead.key] = result.id;
    }

    for (const lead of DEMO_LEADS) {
      const leadId = leadIds[lead.key];
      if (!leadId) {
        continue;
      }

      const createdAt = addDays(seedContext.now, -lead.createdDaysAgo).toISOString();
      const leadName = `${lead.firstName} ${lead.lastName}`.trim();

      await insertRow("seed_lead_activities", companyId, "lead_activities", {
        company_id: companyId,
        lead_id: leadId,
        activity_type: "lead_created",
        created_by: seedContext.actorId,
        created_at: createdAt,
        metadata: { actorName: leadName },
      });

      if (lead.status === "estimate_sent") {
        await insertRow("seed_lead_activities", companyId, "lead_activities", {
          company_id: companyId,
          lead_id: leadId,
          activity_type: "status_changed",
          created_by: seedContext.actorId,
          created_at: addDays(seedContext.now, -Math.max(lead.createdDaysAgo - 2, 0)).toISOString(),
          metadata: {
            previousStatus: "new",
            nextStatus: "estimate_sent",
          },
        });
      }

      if (lead.status === "lost") {
        await insertRow("seed_lead_activities", companyId, "lead_activities", {
          company_id: companyId,
          lead_id: leadId,
          activity_type: "lost",
          created_by: seedContext.actorId,
          created_at: createdAt,
          metadata: lead.lostReason ? { lostReason: lead.lostReason } : {},
        });
      }
    }

    for (const equipment of DEMO_EQUIPMENT) {
      const customerId = customerIds[equipment.customerKey];
      if (!customerId) {
        continue;
      }

      await insertRow("seed_customer_equipment", companyId, "customer_equipment", {
        company_id: companyId,
        customer_id: customerId,
        name: withDemoName(equipment.name),
        equipment_type: equipment.equipmentType,
        brand: equipment.brand,
        model_number: equipment.modelNumber,
        serial_number: equipment.serialNumber,
        install_date: toDateOnly(addDays(seedContext.now, -equipment.installDaysAgo)),
        warranty_expires_at: equipment.warrantyDaysFromNow
          ? toDateOnly(addDays(seedContext.now, equipment.warrantyDaysFromNow))
          : null,
        location: equipment.location,
        is_active: true,
        is_demo: true,
      });
    }

    for (const jobSeed of DEMO_JOBS) {
      const scheduledAt = buildJobSchedule(jobSeed, seedContext.now);
      const timestamps = buildJobTimestamps(jobSeed, scheduledAt);
      const customerId = customerIds[jobSeed.customerKey];

      if (!customerId) {
        throw new Error(`Missing demo customer for job ${jobSeed.jobNumber}.`);
      }

      const result = await insertRow("seed_jobs", companyId, "jobs", {
        company_id: companyId,
        customer_id: customerId,
        job_number: jobSeed.jobNumber,
        service_address: jobSeed.serviceAddress,
        city: jobSeed.city,
        state: jobSeed.state,
        postal_code: jobSeed.postalCode,
        job_type: jobSeed.jobType,
        scheduled_at: scheduledAt.toISOString(),
        status: jobSeed.status,
        priority: jobSeed.priority ?? "normal",
        description: jobSeed.description,
        notes: jobSeed.notes ?? null,
        assigned_technician_id: seedContext.technicianId,
        arrived_at: timestamps.arrivedAt ?? null,
        work_started_at: timestamps.workStartedAt ?? null,
        completed_at: timestamps.completedAt ?? null,
        completion_notes: jobSeed.completionNotes ?? null,
        created_at: addDays(
          seedContext.now,
          -(jobSeed.createdDaysAgo ?? Math.abs(jobSeed.scheduledDaysFromNow) + 1),
        ).toISOString(),
        is_demo: true,
      });

      if (result.error || !result.id) {
        throw new Error(result.error ?? `Failed to seed job ${jobSeed.jobNumber}.`);
      }

      jobIds[jobSeed.key] = result.id;
    }

    for (const jobSeed of DEMO_JOBS) {
      const jobId = jobIds[jobSeed.key];
      if (!jobId) {
        continue;
      }

      const start = buildJobSchedule(jobSeed, seedContext.now);
      const end =
        jobSeed.status === "completed" && jobSeed.completedMinutesAfterStart
          ? new Date(start.getTime() + (jobSeed.completedMinutesAfterStart + 15) * 60_000)
          : atTime(start, start.getHours() + 2);

      const dispatchStatus =
        jobSeed.status === "completed"
          ? "completed"
          : "active";

      if (jobSeed.status === "completed" || jobSeed.scheduledDaysFromNow >= 0) {
        await insertRow("seed_dispatch_assignments", companyId, "dispatch_assignments", {
          company_id: companyId,
          job_id: jobId,
          technician_id: seedContext.technicianId,
          assigned_by: seedContext.actorId,
          status: dispatchStatus,
          scheduled_start: start.toISOString(),
          scheduled_end: end.toISOString(),
          is_demo: true,
        });
      }
    }

    for (const jobSeed of DEMO_JOBS) {
      const jobId = jobIds[jobSeed.key];
      if (!jobId) {
        continue;
      }

      if (jobSeed.status === "completed") {
        await insertRow("seed_job_activities", companyId, "job_activities", {
          company_id: companyId,
          job_id: jobId,
          actor_id: seedContext.actorId,
          event_type: "work_completed",
          metadata: { source: "demo_seed" },
          is_demo: true,
        });
      } else if (jobSeed.status === "in_progress") {
        await insertRow("seed_job_activities", companyId, "job_activities", {
          company_id: companyId,
          job_id: jobId,
          actor_id: seedContext.actorId,
          event_type: "technician_arrived",
          metadata: {},
          is_demo: true,
        });
        await insertRow("seed_job_activities", companyId, "job_activities", {
          company_id: companyId,
          job_id: jobId,
          actor_id: seedContext.actorId,
          event_type: "work_started",
          metadata: {},
          is_demo: true,
        });
      } else if (jobSeed.scheduledDaysFromNow === 0) {
        await insertRow("seed_job_activities", companyId, "job_activities", {
          company_id: companyId,
          job_id: jobId,
          actor_id: seedContext.actorId,
          event_type: "job_created",
          metadata: { source: "demo_seed" },
          is_demo: true,
        });
        await insertRow("seed_job_activities", companyId, "job_activities", {
          company_id: companyId,
          job_id: jobId,
          actor_id: seedContext.actorId,
          event_type: "technician_assigned",
          metadata: { technicianId: seedContext.technicianId },
          is_demo: true,
        });
      }
    }

    const materialSeeds = [
      {
        customer_id: customerIds.james,
        job_id: jobIds.completedJamesMaint,
        service_item_id: serviceItemIds.furnace,
        name: "Furnace filter — 16x25x1",
        quantity: 1,
        unit_cost: 18,
        unit_price: 32,
      },
      {
        customer_id: customerIds.james,
        job_id: jobIds.completedJamesCap,
        service_item_id: serviceItemIds.capacitor,
        name: "45/5 MFD run capacitor",
        quantity: 1,
        unit_cost: 42,
        unit_price: 275,
      },
      {
        customer_id: customerIds.greenfield,
        job_id: jobIds.completedGreenfieldMaint,
        service_item_id: serviceItemIds["tune-up"],
        name: "Condenser coil cleaner",
        quantity: 2,
        unit_cost: 12,
        unit_price: 28,
      },
      {
        customer_id: customerIds.lakewood,
        job_id: jobIds.completedLakewoodWater,
        service_item_id: serviceItemIds["water-heater"],
        name: "Upper thermostat — 4500W",
        quantity: 1,
        unit_cost: 28,
        unit_price: 95,
      },
      {
        customer_id: customerIds.marcus,
        job_id: jobIds.completedMarcusNoCool,
        service_item_id: serviceItemIds["refrigerant-leak"],
        name: "R-410A refrigerant — 2 lb",
        quantity: 2,
        unit_cost: 45,
        unit_price: 85,
      },
      {
        customer_id: customerIds.sarah,
        job_id: jobIds.completedSarahCap,
        service_item_id: serviceItemIds.capacitor,
        name: "45/5 MFD run capacitor",
        quantity: 1,
        unit_cost: 38,
        unit_price: 275,
      },
      {
        customer_id: customerIds.ridgewood,
        job_id: jobIds.completedRidgewoodBlower,
        service_item_id: serviceItemIds["blower-motor"],
        name: "ECM blower motor — 1/2 HP",
        quantity: 1,
        unit_cost: 285,
        unit_price: 685,
      },
      {
        customer_id: customerIds.bistro84,
        job_id: jobIds.completedBistroRefrigerant,
        service_item_id: serviceItemIds["refrigerant-leak"],
        name: "Flare fitting repair kit",
        quantity: 1,
        unit_cost: 22,
        unit_price: 65,
      },
      {
        customer_id: customerIds.mainStreet,
        job_id: jobIds.completedMainStreetThermostat,
        service_item_id: serviceItemIds["thermostat-install"],
        name: "Programmable thermostat",
        quantity: 1,
        unit_cost: 85,
        unit_price: 195,
      },
      {
        customer_id: customerIds.sunrise,
        job_id: jobIds.completedSunriseMaint,
        service_item_id: serviceItemIds["tune-up"],
        name: "RTU belt set",
        quantity: 1,
        unit_cost: 35,
        unit_price: 78,
      },
      {
        customer_id: customerIds.westlake,
        job_id: jobIds.completedWestlakeMaint,
        service_item_id: serviceItemIds["tune-up"],
        name: "MERV-13 filter — 20x25x4",
        quantity: 2,
        unit_cost: 28,
        unit_price: 55,
      },
      {
        customer_id: customerIds.techHub,
        job_id: jobIds.completedTechHubNoCool,
        service_item_id: serviceItemIds.diagnostic,
        name: "VRF communication board",
        quantity: 1,
        unit_cost: 320,
        unit_price: 580,
      },
    ];

    for (const material of materialSeeds) {
      await insertRow("seed_job_materials", companyId, "job_materials", {
        company_id: companyId,
        customer_id: material.customer_id,
        job_id: material.job_id,
        service_item_id: material.service_item_id,
        name: withDemoName(material.name),
        description: "Demo material for profitability reporting.",
        quantity: material.quantity,
        unit_cost: material.unit_cost,
        unit_price: material.unit_price,
        taxable: true,
        added_by: seedContext.actorId,
        is_demo: true,
      });
    }

    type EstimateSeed = {
      key: string;
      customerKey: string;
      jobKey?: string;
      estimateNumber: string;
      status: "draft" | "sent" | "approved" | "declined";
      subtotal: number;
      validUntilDaysFromNow: number;
      notes: string;
      createdDaysAgo: number;
      lineItems: Array<{
        serviceItemKey: string;
        name: string;
        description: string;
        quantity: number;
        unitPrice: number;
      }>;
    };

    const estimateSeeds: EstimateSeed[] = [
      {
        key: "draftFurnace",
        customerKey: "emily",
        jobKey: "furnaceQuoteTomorrow",
        estimateNumber: "EST-DEMO-2001",
        status: "draft",
        subtotal: 4200,
        validUntilDaysFromNow: 21,
        notes: "Draft furnace replacement estimate — review before sending to customer.",
        createdDaysAgo: 4,
        lineItems: [
          {
            serviceItemKey: "furnace-replacement",
            name: "Gas Furnace Replacement",
            description: "80% AFUE furnace replacement with startup and permit.",
            quantity: 1,
            unitPrice: 4200,
          },
        ],
      },
      {
        key: "sentMaintenance",
        customerKey: "james",
        estimateNumber: "EST-DEMO-2002",
        status: "sent",
        subtotal: 349,
        validUntilDaysFromNow: 10,
        notes: "Annual maintenance package proposal — ready to resend for approval testing.",
        createdDaysAgo: 12,
        lineItems: [
          {
            serviceItemKey: "maintenance-package",
            name: "Annual Maintenance Package",
            description: "Two seasonal tune-ups plus priority scheduling.",
            quantity: 1,
            unitPrice: 349,
          },
        ],
      },
      {
        key: "approvedRtu",
        customerKey: "greenfield",
        jobKey: "noCoolingActive",
        estimateNumber: "EST-DEMO-2003",
        status: "approved",
        subtotal: 7850,
        validUntilDaysFromNow: 30,
        notes: "Approved packaged RTU replacement after repeated no-cooling calls.",
        createdDaysAgo: 35,
        lineItems: [
          {
            serviceItemKey: "system-replacement",
            name: "Packaged RTU Replacement",
            description: "Remove existing rooftop unit and install new packaged system.",
            quantity: 1,
            unitPrice: 7850,
          },
        ],
      },
      {
        key: "draftDuctwork",
        customerKey: "mainStreet",
        estimateNumber: "EST-DEMO-2004",
        status: "draft",
        subtotal: 890,
        validUntilDaysFromNow: 14,
        notes: "Draft ductwork repair estimate for retail RTU supply run.",
        createdDaysAgo: 2,
        lineItems: [
          {
            serviceItemKey: "ductwork-repair",
            name: "Ductwork Repair",
            description: "Seal and repair disconnected supply duct in ceiling plenum.",
            quantity: 1,
            unitPrice: 890,
          },
        ],
      },
      {
        key: "sentRtuRepair",
        customerKey: "bistro84",
        estimateNumber: "EST-DEMO-2005",
        status: "sent",
        subtotal: 1425,
        validUntilDaysFromNow: 7,
        notes: "Commercial RTU repair quote — compressor and contactor replacement.",
        createdDaysAgo: 8,
        lineItems: [
          {
            serviceItemKey: "rtu-repair",
            name: "Commercial RTU Repair",
            description: "Diagnose and repair rooftop packaged unit components.",
            quantity: 1,
            unitPrice: 475,
          },
          {
            serviceItemKey: "labor",
            name: "Standard Labor Rate",
            description: "Additional labor for compressor swap.",
            quantity: 10,
            unitPrice: 95,
          },
        ],
      },
      {
        key: "sentIaq",
        customerKey: "westlake",
        estimateNumber: "EST-DEMO-2006",
        status: "sent",
        subtotal: 1150,
        validUntilDaysFromNow: 18,
        notes: "Indoor air quality upgrade for medical office waiting room.",
        createdDaysAgo: 6,
        lineItems: [
          {
            serviceItemKey: "iaq-addon",
            name: "Indoor Air Quality Add-On",
            description: "UV light and MERV-13 media filter upgrade.",
            quantity: 1,
            unitPrice: 1150,
          },
        ],
      },
      {
        key: "approvedMaintPackage",
        customerKey: "sunrise",
        estimateNumber: "EST-DEMO-2007",
        status: "approved",
        subtotal: 698,
        validUntilDaysFromNow: 45,
        notes: "Approved annual maintenance package for both buildings.",
        createdDaysAgo: 40,
        lineItems: [
          {
            serviceItemKey: "maintenance-package",
            name: "Annual Maintenance Package",
            description: "Two seasonal tune-ups per building.",
            quantity: 2,
            unitPrice: 349,
          },
        ],
      },
      {
        key: "approvedBlower",
        customerKey: "ridgewood",
        jobKey: "completedRidgewoodBlower",
        estimateNumber: "EST-DEMO-2008",
        status: "approved",
        subtotal: 685,
        validUntilDaysFromNow: 60,
        notes: "Approved blower motor replacement for clubhouse unit.",
        createdDaysAgo: 42,
        lineItems: [
          {
            serviceItemKey: "blower-motor",
            name: "Blower Motor Replacement",
            description: "Replace failed ECM blower motor and verify airflow.",
            quantity: 1,
            unitPrice: 685,
          },
        ],
      },
      {
        key: "declinedReplacement",
        customerKey: "marcus",
        estimateNumber: "EST-DEMO-2009",
        status: "declined",
        subtotal: 6200,
        validUntilDaysFromNow: -5,
        notes: "Customer declined full system replacement — considering repair instead.",
        createdDaysAgo: 55,
        lineItems: [
          {
            serviceItemKey: "system-replacement",
            name: "Packaged RTU Replacement",
            description: "Full dual-zone system replacement proposal.",
            quantity: 1,
            unitPrice: 6200,
          },
        ],
      },
      {
        key: "declinedOld",
        customerKey: "oakwood",
        estimateNumber: "EST-DEMO-2010",
        status: "declined",
        subtotal: 4200,
        validUntilDaysFromNow: -30,
        notes: "Central plant upgrade declined — budget deferred to next fiscal year.",
        createdDaysAgo: 90,
        lineItems: [
          {
            serviceItemKey: "furnace-replacement",
            name: "Boiler Component Upgrade",
            description: "Replace aging boiler controls and zone valves.",
            quantity: 1,
            unitPrice: 4200,
          },
        ],
      },
    ];

    const estimateIds: Record<string, string> = {};

    for (const estimate of estimateSeeds) {
      const { tax, total } = computeTax(estimate.subtotal);
      const result = await insertRow("seed_estimates", companyId, "estimates", {
        company_id: companyId,
        customer_id: customerIds[estimate.customerKey],
        job_id: estimate.jobKey ? jobIds[estimate.jobKey] : null,
        estimate_number: estimate.estimateNumber,
        status: estimate.status,
        subtotal: estimate.subtotal,
        tax_rate: DEMO_TAX_RATE,
        tax,
        total,
        valid_until: toDateOnly(addDays(seedContext.now, estimate.validUntilDaysFromNow)),
        notes: estimate.notes,
        created_at: addDays(seedContext.now, -estimate.createdDaysAgo).toISOString(),
        is_demo: true,
      });

      if (result.error || !result.id) {
        throw new Error(result.error ?? "Failed to seed estimates.");
      }

      estimateIds[estimate.key] = result.id;

      for (const [index, line] of estimate.lineItems.entries()) {
        await insertRow("seed_estimate_line_items", companyId, "estimate_line_items", {
          company_id: companyId,
          estimate_id: result.id,
          service_item_id: serviceItemIds[line.serviceItemKey],
          sort_order: index,
          name: withDemoName(line.name),
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          taxable: true,
          is_demo: true,
        });
      }
    }

    type InvoiceSeed = {
      key: string;
      customerKey: string;
      jobKey?: string;
      invoiceNumber: string;
      status: "paid" | "partially_paid" | "overdue" | "sent";
      subtotal: number;
      amountPaid: number;
      issueDaysAgo: number;
      dueDaysFromNow: number;
      paidDaysAgo?: number;
      notes: string;
      lineItems: Array<{
        serviceItemKey: string;
        name: string;
        description: string;
        quantity: number;
        unitPrice: number;
      }>;
      payments?: Array<{
        amount: number;
        paymentDaysAgo: number;
        reference: string;
        notes: string;
      }>;
    };

    const invoiceSeeds: InvoiceSeed[] = [
      {
        key: "paidDiag",
        customerKey: "lakewood",
        jobKey: "completedLakewoodDiag",
        invoiceNumber: "INV-DEMO-3001",
        status: "paid",
        subtotal: 129,
        amountPaid: 0,
        issueDaysAgo: 24,
        dueDaysFromNow: 6,
        paidDaysAgo: 20,
        notes: "Diagnostic visit — paid in full.",
        lineItems: [
          {
            serviceItemKey: "diagnostic",
            name: "AC System Diagnostic",
            description: "Cooling diagnostic and airflow verification.",
            quantity: 1,
            unitPrice: 129,
          },
        ],
        payments: [
          {
            amount: 0,
            paymentDaysAgo: 20,
            reference: "DEMO-PAY-3001",
            notes: "Paid in full — check.",
          },
        ],
      },
      {
        key: "partialMaint",
        customerKey: "greenfield",
        jobKey: "completedGreenfieldMaint",
        invoiceNumber: "INV-DEMO-3002",
        status: "partially_paid",
        subtotal: 1890,
        amountPaid: 1000,
        issueDaysAgo: 38,
        dueDaysFromNow: 12,
        notes: "Quarterly maintenance — deposit received, balance due.",
        lineItems: [
          {
            serviceItemKey: "tune-up",
            name: "HVAC Seasonal Tune-Up",
            description: "Quarterly commercial maintenance service.",
            quantity: 10,
            unitPrice: 189,
          },
        ],
        payments: [
          {
            amount: 600,
            paymentDaysAgo: 35,
            reference: "DEMO-PAY-3002A",
            notes: "Initial deposit.",
          },
          {
            amount: 400,
            paymentDaysAgo: 8,
            reference: "DEMO-PAY-3002B",
            notes: "Second installment.",
          },
        ],
      },
      {
        key: "overdueFurnace",
        customerKey: "james",
        jobKey: "completedJamesMaint",
        invoiceNumber: "INV-DEMO-3003",
        status: "overdue",
        subtotal: 165,
        amountPaid: 0,
        issueDaysAgo: 20,
        dueDaysFromNow: -5,
        notes: "Furnace maintenance completed — payment overdue.",
        lineItems: [
          {
            serviceItemKey: "furnace",
            name: "Furnace Maintenance",
            description: "Annual furnace maintenance service.",
            quantity: 1,
            unitPrice: 165,
          },
        ],
      },
      {
        key: "paidHistoricalCap",
        customerKey: "james",
        jobKey: "completedJamesCap",
        invoiceNumber: "INV-DEMO-3004",
        status: "paid",
        subtotal: 275,
        amountPaid: 0,
        issueDaysAgo: 54,
        dueDaysFromNow: -24,
        paidDaysAgo: 50,
        notes: "Capacitor replacement — paid in full.",
        lineItems: [
          {
            serviceItemKey: "capacitor",
            name: "Capacitor Replacement",
            description: "Replace failed run capacitor.",
            quantity: 1,
            unitPrice: 275,
          },
        ],
        payments: [
          {
            amount: 0,
            paymentDaysAgo: 50,
            reference: "DEMO-PAY-3004",
            notes: "Historical paid invoice for revenue reporting.",
          },
        ],
      },
      {
        key: "paidMarcus",
        customerKey: "marcus",
        jobKey: "completedMarcusNoCool",
        invoiceNumber: "INV-DEMO-3005",
        status: "paid",
        subtotal: 520,
        amountPaid: 0,
        issueDaysAgo: 10,
        dueDaysFromNow: 20,
        paidDaysAgo: 7,
        notes: "Refrigerant leak repair — paid via card on-site.",
        lineItems: [
          {
            serviceItemKey: "refrigerant-leak",
            name: "Refrigerant Leak Repair",
            description: "Locate leak, repair line set, evacuate, and recharge.",
            quantity: 1,
            unitPrice: 520,
          },
        ],
        payments: [
          {
            amount: 0,
            paymentDaysAgo: 7,
            reference: "DEMO-PAY-3005",
            notes: "Paid in full — card on-site.",
          },
        ],
      },
      {
        key: "partialBistro",
        customerKey: "bistro84",
        jobKey: "completedBistroRefrigerant",
        invoiceNumber: "INV-DEMO-3006",
        status: "partially_paid",
        subtotal: 520,
        amountPaid: 300,
        issueDaysAgo: 45,
        dueDaysFromNow: -10,
        notes: "Refrigerant repair — partial payment received, balance outstanding.",
        lineItems: [
          {
            serviceItemKey: "refrigerant-leak",
            name: "Refrigerant Leak Repair",
            description: "Kitchen make-up air unit leak repair.",
            quantity: 1,
            unitPrice: 520,
          },
        ],
        payments: [
          {
            amount: 300,
            paymentDaysAgo: 42,
            reference: "DEMO-PAY-3006",
            notes: "Partial payment — restaurant manager check.",
          },
        ],
      },
      {
        key: "overdueSunrise",
        customerKey: "sunrise",
        jobKey: "completedSunriseMaint",
        invoiceNumber: "INV-DEMO-3007",
        status: "overdue",
        subtotal: 189,
        amountPaid: 0,
        issueDaysAgo: 28,
        dueDaysFromNow: -14,
        notes: "Quarterly RTU maintenance — net-30 overdue.",
        lineItems: [
          {
            serviceItemKey: "tune-up",
            name: "HVAC Seasonal Tune-Up",
            description: "Quarterly RTU maintenance service.",
            quantity: 1,
            unitPrice: 189,
          },
        ],
      },
      {
        key: "sentSarah",
        customerKey: "sarah",
        jobKey: "completedSarahCap",
        invoiceNumber: "INV-DEMO-3008",
        status: "sent",
        subtotal: 275,
        amountPaid: 0,
        issueDaysAgo: 3,
        dueDaysFromNow: 27,
        notes: "Capacitor replacement — recently sent, awaiting payment.",
        lineItems: [
          {
            serviceItemKey: "capacitor",
            name: "Capacitor Replacement",
            description: "Replace failed run capacitor on outdoor condenser.",
            quantity: 1,
            unitPrice: 275,
          },
        ],
      },
      {
        key: "sentOakwood",
        customerKey: "oakwood",
        jobKey: "completedOakwoodDiag",
        invoiceNumber: "INV-DEMO-3009",
        status: "sent",
        subtotal: 129,
        amountPaid: 0,
        issueDaysAgo: 5,
        dueDaysFromNow: 25,
        notes: "Zone valve diagnostic — invoice sent to property management.",
        lineItems: [
          {
            serviceItemKey: "diagnostic",
            name: "AC System Diagnostic",
            description: "Central plant zone valve diagnostic.",
            quantity: 1,
            unitPrice: 129,
          },
        ],
      },
      {
        key: "paidWestlake",
        customerKey: "westlake",
        jobKey: "completedWestlakeMaint",
        invoiceNumber: "INV-DEMO-3010",
        status: "paid",
        subtotal: 189,
        amountPaid: 0,
        issueDaysAgo: 65,
        dueDaysFromNow: -35,
        paidDaysAgo: 60,
        notes: "Semi-annual medical office maintenance — paid via ACH.",
        lineItems: [
          {
            serviceItemKey: "tune-up",
            name: "HVAC Seasonal Tune-Up",
            description: "Semi-annual preventive maintenance.",
            quantity: 1,
            unitPrice: 189,
          },
        ],
        payments: [
          {
            amount: 0,
            paymentDaysAgo: 60,
            reference: "DEMO-PAY-3010",
            notes: "Paid via ACH — medical office billing.",
          },
        ],
      },
    ];

    const invoiceIds: Record<string, string> = {};
    const invoiceTotals: Record<string, number> = {};

    for (const invoice of invoiceSeeds) {
      const { tax, total } = computeTax(invoice.subtotal);
      const amountPaid =
        invoice.status === "paid"
          ? total
          : invoice.amountPaid;
      const balanceDue = roundCurrency(total - amountPaid);

      const result = await insertRow("seed_invoices", companyId, "invoices", {
        company_id: companyId,
        customer_id: customerIds[invoice.customerKey],
        job_id: invoice.jobKey ? jobIds[invoice.jobKey] : null,
        invoice_number: invoice.invoiceNumber,
        status: invoice.status,
        subtotal: invoice.subtotal,
        tax_rate: DEMO_TAX_RATE,
        tax_amount: tax,
        total,
        amount_paid: amountPaid,
        balance_due: balanceDue,
        issue_date: toDateOnly(addDays(seedContext.now, -invoice.issueDaysAgo)),
        due_date: toDateOnly(addDays(seedContext.now, invoice.dueDaysFromNow)),
        paid_at:
          invoice.paidDaysAgo !== undefined
            ? atTime(addDays(seedContext.now, -invoice.paidDaysAgo), 11, 15).toISOString()
            : null,
        notes: invoice.notes,
        created_at: addDays(seedContext.now, -invoice.issueDaysAgo).toISOString(),
        is_demo: true,
      });

      if (result.error || !result.id) {
        throw new Error(result.error ?? "Failed to seed invoices.");
      }

      invoiceIds[invoice.key] = result.id;
      invoiceTotals[invoice.key] = total;

      for (const [index, line] of invoice.lineItems.entries()) {
        await insertRow("seed_invoice_line_items", companyId, "invoice_line_items", {
          company_id: companyId,
          invoice_id: result.id,
          service_item_id: serviceItemIds[line.serviceItemKey],
          name: withDemoName(line.name),
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unitPrice,
          taxable: true,
          line_total: roundCurrency(line.quantity * line.unitPrice),
          sort_order: index,
          is_demo: true,
        });
      }

      if (invoice.payments) {
        for (const payment of invoice.payments) {
          const paymentAmount =
            payment.amount > 0 ? payment.amount : total;

          await insertRow("seed_invoice_payments", companyId, "invoice_payments", {
            company_id: companyId,
            invoice_id: result.id,
            amount: paymentAmount,
            payment_method: "card",
            payment_date: toDateOnly(addDays(seedContext.now, -payment.paymentDaysAgo)),
            reference: payment.reference,
            notes: payment.notes,
            recorded_by: seedContext.actorId,
            is_demo: true,
          });
        }
      }
    }

    await closeOpenDemoTimeEntries(companyId, seedContext.technicianId);

    for (const jobSeed of DEMO_JOBS) {
      const jobId = jobIds[jobSeed.key];
      if (!jobId) {
        continue;
      }

      if (jobSeed.status === "in_progress") {
        const start = buildJobSchedule(jobSeed, seedContext.now);
        const workStarted = jobSeed.workStartedMinutesAfterStart
          ? new Date(
              start.getTime() + jobSeed.workStartedMinutesAfterStart * 60_000,
            )
          : start;

        await insertTimeEntry(
          "seed_time_entries",
          companyId,
          {
            company_id: companyId,
            technician_id: seedContext.technicianId,
            job_id: jobId,
            entry_type: "job_labor",
            started_at: workStarted.toISOString(),
            ended_at: null,
            duration_minutes: null,
            notes: "Active labor on no-cooling repair.",
            is_demo: true,
          },
          { allowSkipOpenSegment: true },
        );
      } else if (
        jobSeed.status === "completed" &&
        jobSeed.workStartedMinutesAfterStart &&
        jobSeed.completedMinutesAfterStart
      ) {
        const start = buildJobSchedule(jobSeed, seedContext.now);
        const workStarted = new Date(
          start.getTime() + jobSeed.workStartedMinutesAfterStart * 60_000,
        );
        const completed = new Date(
          start.getTime() + jobSeed.completedMinutesAfterStart * 60_000,
        );
        const durationMinutes = Math.round(
          (completed.getTime() - workStarted.getTime()) / 60_000,
        );

        await insertTimeEntry("seed_time_entries", companyId, {
          company_id: companyId,
          technician_id: seedContext.technicianId,
          job_id: jobId,
          entry_type: "job_labor",
          started_at: workStarted.toISOString(),
          ended_at: completed.toISOString(),
          duration_minutes: durationMinutes,
          notes: `${jobSeed.jobType} labor.`,
          is_demo: true,
        });
      }
    }

    await insertTimeEntry(
      "seed_time_entries_clock",
      companyId,
      {
        company_id: companyId,
        technician_id: seedContext.technicianId,
        entry_type: "clock",
        started_at: atTime(seedContext.now, 7, 45).toISOString(),
        ended_at: null,
        duration_minutes: null,
        notes: "Demo shift clock-in for labor hour reporting.",
        is_demo: true,
      },
      { allowSkipOpenSegment: true },
    );

    await insertTimeEntry("seed_time_entries_clock", companyId, {
      company_id: companyId,
      technician_id: seedContext.technicianId,
      entry_type: "clock",
      started_at: atTime(addDays(seedContext.now, -1), 7, 30).toISOString(),
      ended_at: atTime(addDays(seedContext.now, -1), 16, 15).toISOString(),
      duration_minutes: 525,
      notes: "Previous day shift for labor hour reporting.",
      is_demo: true,
    });

    const notifications = [
      {
        type: "job_assigned",
        title: "Demo job assigned",
        message: "You were assigned JOB-DEMO-1001 — HVAC Maintenance for James Chen.",
        entity_type: "job",
        entity_id: jobIds.maintenanceToday,
      },
      {
        type: "job_completed",
        title: "Demo job completed",
        message: "JOB-DEMO-1013 furnace maintenance was marked complete.",
        entity_type: "job",
        entity_id: jobIds.completedJamesMaint,
      },
      {
        type: "invoice_paid",
        title: "Demo payment received",
        message: `INV-DEMO-3001 was paid in full ($${invoiceTotals.paidDiag.toFixed(2)}).`,
        entity_type: "invoice",
        entity_id: invoiceIds.paidDiag,
      },
      {
        type: "job_assigned",
        title: "Demo urgent job assigned",
        message: "You were assigned JOB-DEMO-1002 — AC Repair (No Cooling) at Greenfield Dental.",
        entity_type: "job",
        entity_id: jobIds.noCoolingActive,
      },
      {
        type: "invoice_paid",
        title: "Demo payment received",
        message: `INV-DEMO-3005 was paid in full ($${invoiceTotals.paidMarcus.toFixed(2)}).`,
        entity_type: "invoice",
        entity_id: invoiceIds.paidMarcus,
      },
      {
        type: "job_completed",
        title: "Demo job completed",
        message: "JOB-DEMO-1017 blower motor replacement completed at Ridgewood Estates.",
        entity_type: "job",
        entity_id: jobIds.completedRidgewoodBlower,
      },
    ] as const;

    for (const notification of notifications) {
      await insertRow("seed_notifications", companyId, "notifications", {
        company_id: companyId,
        user_id: seedContext.actorId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        entity_type: notification.entity_type,
        entity_id: notification.entity_id,
        metadata: { source: "demo_seed" },
        is_demo: true,
      });
    }

    const markResult = await markCompanyDemoDataSeeded(
      companyId,
      context,
      seedContext.actorId,
    );

    if (markResult.error) {
      throw new Error(markResult.error);
    }

    return { error: null, seededAt: new Date().toISOString() };
  } catch (error) {
    console.error("[seedDemoData] seed aborted, rolling back demo data", {
      companyId,
      message: error instanceof Error ? error.message : String(error),
    });

    const clearResult = await clearCompanyDemoData(companyId);
    if (clearResult.error) {
      console.error("[seedDemoData] rollback clear failed", {
        step: "rollback_clear_demo_data",
        table: "clear_company_demo_data",
        companyId,
        message: clearResult.error,
      });
    }

    const message =
      error instanceof Error ? error.message : "Failed to load demo data.";
    return { error: message };
  }
}
