import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";
import {
  clearCompanyDemoData,
  getDemoDataStatus,
  markCompanyDemoDataSeeded,
  resolveDemoTechnicianId,
} from "@/lib/database/queries/demo-data";
import { withDemoName } from "@/shared/lib/demo-data-settings";

type SeedContext = {
  companyId: string;
  actorId: string;
  technicianId: string;
  demoEmail: string;
  now: Date;
};

type ServiceItemSeed = {
  key: string;
  name: string;
  description: string;
  unitPrice: number;
  category: string;
};

type CustomerSeed = {
  key: string;
  name: string;
  phone: string;
  companyName?: string;
  status: "active" | "inactive" | "lead";
  address: string;
  city: string;
  state: string;
  postalCode: string;
  tags: string[];
  notes?: string;
  totalJobs: number;
  totalRevenue: number;
  lastServiceDaysAgo?: number;
  createdDaysAgo: number;
};

type JobSeed = {
  key: string;
  customerKey: string;
  jobNumber: string;
  serviceAddress: string;
  city: string;
  state: string;
  postalCode: string;
  jobType: string;
  scheduledDaysFromNow: number;
  scheduledHour: number;
  scheduledMinute?: number;
  status: "scheduled" | "in_progress" | "completed";
  priority?: "normal" | "high" | "urgent";
  description: string;
  notes?: string;
  createdDaysAgo?: number;
  arrivedMinutesAfterStart?: number;
  workStartedMinutesAfterStart?: number;
  completedMinutesAfterStart?: number;
  completionNotes?: string;
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

const TAX_RATE = 8.25;

const SERVICE_ITEMS: ServiceItemSeed[] = [
  {
    key: "tune-up",
    name: "HVAC Seasonal Tune-Up",
    description: "Full system inspection, filter change, and performance check.",
    unitPrice: 189,
    category: "Maintenance",
  },
  {
    key: "diagnostic",
    name: "AC System Diagnostic",
    description: "Electrical and refrigerant diagnostics for cooling issues.",
    unitPrice: 129,
    category: "Service",
  },
  {
    key: "capacitor",
    name: "Capacitor Replacement",
    description: "Replace failed run capacitor and verify compressor startup.",
    unitPrice: 275,
    category: "Repair",
  },
  {
    key: "furnace",
    name: "Furnace Maintenance",
    description: "Combustion check, heat exchanger inspection, and safety test.",
    unitPrice: 165,
    category: "Maintenance",
  },
  {
    key: "labor",
    name: "Standard Labor Rate",
    description: "Billable technician labor per hour.",
    unitPrice: 95,
    category: "Labor",
  },
  {
    key: "water-heater",
    name: "Water Heater Service",
    description: "Diagnose and repair tank water heater issues.",
    unitPrice: 245,
    category: "Plumbing",
  },
  {
    key: "electrical",
    name: "Electrical Troubleshooting",
    description: "Trace HVAC control circuit and low-voltage wiring faults.",
    unitPrice: 149,
    category: "Electrical",
  },
  {
    key: "system-replacement",
    name: "Packaged RTU Replacement",
    description: "Remove and replace rooftop packaged HVAC unit.",
    unitPrice: 7850,
    category: "Installation",
  },
  {
    key: "furnace-replacement",
    name: "Gas Furnace Replacement",
    description: "High-efficiency furnace replacement with permit and startup.",
    unitPrice: 4200,
    category: "Installation",
  },
];

const CUSTOMERS: CustomerSeed[] = [
  {
    key: "james",
    name: "James Chen",
    phone: "(737) 555-0198",
    status: "active",
    address: "903 Willow Creek Ln",
    city: "Round Rock",
    state: "TX",
    postalCode: "78664",
    tags: ["Residential", "HVAC"],
    notes: "Prefers afternoon appointments. Dog in backyard — knock first.",
    totalJobs: 9,
    totalRevenue: 4820,
    lastServiceDaysAgo: 18,
    createdDaysAgo: 210,
  },
  {
    key: "emily",
    name: "Emily Rodriguez",
    phone: "(512) 555-0311",
    status: "active",
    address: "221 Sunset Ridge",
    city: "Cedar Park",
    state: "TX",
    postalCode: "78613",
    tags: ["Residential", "HVAC"],
    notes: "Older split system. Interested in furnace replacement this fall.",
    totalJobs: 4,
    totalRevenue: 1340,
    lastServiceDaysAgo: 52,
    createdDaysAgo: 160,
  },
  {
    key: "lakewood",
    name: "Lakewood Apartments",
    phone: "(512) 555-0678",
    companyName: "Lakewood Property Management",
    status: "active",
    address: "3200 Lakewood Dr",
    city: "Austin",
    state: "TX",
    postalCode: "78745",
    tags: ["Property Management", "Multi-unit"],
    notes: "Net-15 billing. Call maintenance line before arriving on-site.",
    totalJobs: 26,
    totalRevenue: 21480,
    lastServiceDaysAgo: 4,
    createdDaysAgo: 365,
  },
  {
    key: "greenfield",
    name: "Greenfield Dental Studio",
    phone: "(512) 555-0234",
    companyName: "Greenfield Dental Studio",
    status: "active",
    address: "5500 Business Park Blvd, Ste 200",
    city: "Austin",
    state: "TX",
    postalCode: "78759",
    tags: ["Commercial", "Small Business"],
    notes: "Small commercial suite. After-hours access via loading dock.",
    totalJobs: 12,
    totalRevenue: 9680,
    lastServiceDaysAgo: 0,
    createdDaysAgo: 280,
  },
];

const JOBS: JobSeed[] = [
  {
    key: "maintenanceToday",
    customerKey: "james",
    jobNumber: "JOB-DEMO-1001",
    serviceAddress: "903 Willow Creek Ln",
    city: "Round Rock",
    state: "TX",
    postalCode: "78664",
    jobType: "HVAC Maintenance",
    scheduledDaysFromNow: 0,
    scheduledHour: 9,
    status: "scheduled",
    description: "Spring tune-up — filter change, coil cleaning, and performance check.",
    notes: "Annual maintenance visit. Customer prefers afternoon if rescheduled.",
    createdDaysAgo: 3,
  },
  {
    key: "noCoolingActive",
    customerKey: "greenfield",
    jobNumber: "JOB-DEMO-1002",
    serviceAddress: "5500 Business Park Blvd, Ste 200",
    city: "Austin",
    state: "TX",
    postalCode: "78759",
    jobType: "AC Repair — No Cooling",
    scheduledDaysFromNow: 0,
    scheduledHour: 8,
    status: "in_progress",
    priority: "urgent",
    description: "Suite AC not cooling. Staff reported 82°F indoor temperature.",
    notes: "Active emergency call. Check rooftop unit and thermostat wiring.",
    createdDaysAgo: 0,
    arrivedMinutesAfterStart: 15,
    workStartedMinutesAfterStart: 35,
  },
  {
    key: "waterHeaterToday",
    customerKey: "lakewood",
    jobNumber: "JOB-DEMO-1003",
    serviceAddress: "3200 Lakewood Dr, Unit 8C",
    city: "Austin",
    state: "TX",
    postalCode: "78745",
    jobType: "Water Heater Repair",
    scheduledDaysFromNow: 0,
    scheduledHour: 11,
    status: "scheduled",
    priority: "high",
    description: "Tenant reports lukewarm water and popping noises from tank.",
    notes: "Property management work order #LM-4421.",
    createdDaysAgo: 1,
  },
  {
    key: "capacitorToday",
    customerKey: "emily",
    jobNumber: "JOB-DEMO-1004",
    serviceAddress: "221 Sunset Ridge",
    city: "Cedar Park",
    state: "TX",
    postalCode: "78613",
    jobType: "Capacitor Replacement",
    scheduledDaysFromNow: 0,
    scheduledHour: 14,
    status: "scheduled",
    priority: "high",
    description: "Replace failed run capacitor on outdoor condenser.",
    notes: "Parts on truck. Confirm amp draw after startup.",
    createdDaysAgo: 2,
  },
  {
    key: "electricalToday",
    customerKey: "lakewood",
    jobNumber: "JOB-DEMO-1005",
    serviceAddress: "3200 Lakewood Dr, Building C",
    city: "Austin",
    state: "TX",
    postalCode: "78745",
    jobType: "Electrical Troubleshooting",
    scheduledDaysFromNow: 0,
    scheduledHour: 15,
    scheduledMinute: 30,
    status: "scheduled",
    description: "Intermittent thermostat power loss in common-area HVAC controller.",
    notes: "Check low-voltage transformer and contactor coil.",
    createdDaysAgo: 2,
  },
  {
    key: "furnaceQuoteTomorrow",
    customerKey: "emily",
    jobNumber: "JOB-DEMO-1006",
    serviceAddress: "221 Sunset Ridge",
    city: "Cedar Park",
    state: "TX",
    postalCode: "78613",
    jobType: "Furnace Replacement Quote",
    scheduledDaysFromNow: 1,
    scheduledHour: 10,
    status: "scheduled",
    description: "On-site measurement and quote for 80% AFUE furnace replacement.",
    notes: "Bring replacement sizing worksheet. Draft estimate ready for review.",
    createdDaysAgo: 5,
  },
  {
    key: "completedJamesMaint",
    customerKey: "james",
    jobNumber: "JOB-DEMO-1007",
    serviceAddress: "903 Willow Creek Ln",
    city: "Round Rock",
    state: "TX",
    postalCode: "78664",
    jobType: "Furnace Maintenance",
    scheduledDaysFromNow: -18,
    scheduledHour: 13,
    status: "completed",
    description: "Annual furnace maintenance and combustion safety check.",
    createdDaysAgo: 22,
    arrivedMinutesAfterStart: 10,
    workStartedMinutesAfterStart: 25,
    completedMinutesAfterStart: 115,
    completionNotes: "Replaced dirty filter and cleaned flame sensor. System operating normally.",
  },
  {
    key: "completedLakewoodDiag",
    customerKey: "lakewood",
    jobNumber: "JOB-DEMO-1008",
    serviceAddress: "3200 Lakewood Dr, Unit 14B",
    city: "Austin",
    state: "TX",
    postalCode: "78745",
    jobType: "HVAC Diagnostic",
    scheduledDaysFromNow: -25,
    scheduledHour: 10,
    status: "completed",
    description: "Diagnose weak cooling in unit 14B and verify airflow balance.",
    createdDaysAgo: 28,
    arrivedMinutesAfterStart: 8,
    workStartedMinutesAfterStart: 20,
    completedMinutesAfterStart: 105,
    completionNotes: "Found restricted return grille. Corrected and verified 18° delta-T.",
  },
  {
    key: "completedGreenfieldMaint",
    customerKey: "greenfield",
    jobNumber: "JOB-DEMO-1009",
    serviceAddress: "5500 Business Park Blvd, Ste 200",
    city: "Austin",
    state: "TX",
    postalCode: "78759",
    jobType: "Preventive Maintenance",
    scheduledDaysFromNow: -42,
    scheduledHour: 14,
    status: "completed",
    description: "Quarterly commercial maintenance on split system.",
    createdDaysAgo: 45,
    arrivedMinutesAfterStart: 5,
    workStartedMinutesAfterStart: 15,
    completedMinutesAfterStart: 135,
    completionNotes: "Cleaned condenser coil and verified refrigerant charge.",
  },
  {
    key: "completedJamesCap",
    customerKey: "james",
    jobNumber: "JOB-DEMO-1010",
    serviceAddress: "903 Willow Creek Ln",
    city: "Round Rock",
    state: "TX",
    postalCode: "78664",
    jobType: "Capacitor Replacement",
    scheduledDaysFromNow: -55,
    scheduledHour: 11,
    status: "completed",
    description: "Replace failed run capacitor on heat pump condenser.",
    createdDaysAgo: 58,
    arrivedMinutesAfterStart: 12,
    workStartedMinutesAfterStart: 22,
    completedMinutesAfterStart: 75,
    completionNotes: "Capacitor replaced. Compressor amp draw within spec.",
  },
  {
    key: "completedLakewoodWater",
    customerKey: "lakewood",
    jobNumber: "JOB-DEMO-1011",
    serviceAddress: "3200 Lakewood Dr, Unit 2A",
    city: "Austin",
    state: "TX",
    postalCode: "78745",
    jobType: "Water Heater Service",
    scheduledDaysFromNow: -72,
    scheduledHour: 9,
    status: "completed",
    description: "Replace faulty upper thermostat and flush sediment from tank.",
    createdDaysAgo: 75,
    arrivedMinutesAfterStart: 10,
    workStartedMinutesAfterStart: 20,
    completedMinutesAfterStart: 150,
    completionNotes: "Thermostat replaced. Tank flushed. Stable hot water confirmed.",
  },
  {
    key: "completedGreenfieldElectrical",
    customerKey: "greenfield",
    jobNumber: "JOB-DEMO-1012",
    serviceAddress: "5500 Business Park Blvd, Ste 200",
    city: "Austin",
    state: "TX",
    postalCode: "78759",
    jobType: "Electrical Troubleshooting",
    scheduledDaysFromNow: -95,
    scheduledHour: 15,
    status: "completed",
    description: "Trace intermittent blower motor control circuit fault.",
    createdDaysAgo: 98,
    arrivedMinutesAfterStart: 8,
    workStartedMinutesAfterStart: 18,
    completedMinutesAfterStart: 120,
    completionNotes: "Loose wire nut on relay coil. Repaired and load-tested.",
  },
];

async function insertRow(
  table: string,
  row: Record<string, unknown>,
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(table)
    .insert(row as never)
    .select("id")
    .single();

  if (error || !data) {
    console.error(`[seedDemoData] ${table} insert failed:`, {
      code: error?.code,
      message: error?.message,
    });
    return { id: null, error: error ? mapDatabaseError(error) : `Failed to insert ${table}.` };
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

export async function seedCompanyDemoData(
  context: ActiveCompanyContext,
): Promise<{ error: string | null; seededAt?: string }> {
  const companyId = context.company.id;
  const status = await getDemoDataStatus(companyId, context);

  if (status.hasDemoData) {
    return { error: "Demo data has already been loaded for this company." };
  }

  if (!status.isEligibleForSeed) {
    return {
      error:
        "Demo data can only be loaded into an empty workspace without existing customers, jobs, estimates, or invoices.",
    };
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
  const jobIds: Record<string, string> = {};

  try {
    for (const item of SERVICE_ITEMS) {
      const result = await insertRow("service_items", {
        company_id: companyId,
        name: withDemoName(item.name),
        description: item.description,
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

    for (const customer of CUSTOMERS) {
      const result = await insertRow("customers", {
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

    await insertRow("customer_equipment", {
      company_id: companyId,
      customer_id: customerIds.james,
      name: withDemoName("Heat Pump Split System"),
      equipment_type: "Split Heat Pump",
      brand: "Lennox",
      model_number: "XP16-036",
      serial_number: "DEMO-SN-2208",
      install_date: toDateOnly(addDays(seedContext.now, -820)),
      warranty_expires_at: toDateOnly(addDays(seedContext.now, 120)),
      location: "Backyard condenser / attic air handler",
      is_active: true,
      is_demo: true,
    });

    await insertRow("customer_equipment", {
      company_id: companyId,
      customer_id: customerIds.emily,
      name: withDemoName("Gas Furnace & AC Split"),
      equipment_type: "Split System",
      brand: "Goodman",
      model_number: "GMEC96 + GSX14",
      serial_number: "DEMO-SN-5512",
      install_date: toDateOnly(addDays(seedContext.now, -2400)),
      location: "Garage furnace / side-yard condenser",
      is_active: true,
      is_demo: true,
    });

    await insertRow("customer_equipment", {
      company_id: companyId,
      customer_id: customerIds.lakewood,
      name: withDemoName("Unit 14B Packaged AC"),
      equipment_type: "Packaged AC",
      brand: "Rheem",
      model_number: "RALB-036",
      serial_number: "DEMO-SN-7710",
      install_date: toDateOnly(addDays(seedContext.now, -1100)),
      location: "Roof — Building B",
      is_active: true,
      is_demo: true,
    });

    await insertRow("customer_equipment", {
      company_id: companyId,
      customer_id: customerIds.greenfield,
      name: withDemoName("Suite 200 Split System"),
      equipment_type: "Split AC",
      brand: "Trane",
      model_number: "XR16",
      serial_number: "DEMO-SN-8834",
      install_date: toDateOnly(addDays(seedContext.now, -540)),
      location: "Mechanical room 2B",
      is_active: true,
      is_demo: true,
    });

    for (const jobSeed of JOBS) {
      const scheduledAt = buildJobSchedule(jobSeed, seedContext.now);
      const timestamps = buildJobTimestamps(jobSeed, scheduledAt);
      const customerId = customerIds[jobSeed.customerKey];

      if (!customerId) {
        throw new Error(`Missing demo customer for job ${jobSeed.jobNumber}.`);
      }

      const result = await insertRow("jobs", {
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

    const todayDispatchKeys = [
      "maintenanceToday",
      "noCoolingActive",
      "waterHeaterToday",
      "capacitorToday",
      "electricalToday",
    ] as const;
    const completedDispatchKeys = [
      "completedJamesMaint",
      "completedLakewoodDiag",
      "completedGreenfieldMaint",
      "completedJamesCap",
      "completedLakewoodWater",
      "completedGreenfieldElectrical",
    ] as const;

    for (const key of todayDispatchKeys) {
      const jobSeed = JOBS.find((job) => job.key === key);
      const jobId = jobIds[key];
      if (!jobSeed || !jobId) {
        continue;
      }

      const start = buildJobSchedule(jobSeed, seedContext.now);
      const end = atTime(start, start.getHours() + 2);

      await insertRow("dispatch_assignments", {
        company_id: companyId,
        job_id: jobId,
        technician_id: seedContext.technicianId,
        assigned_by: seedContext.actorId,
        status: jobSeed.status === "in_progress" ? "active" : "active",
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        is_demo: true,
      });
    }

    await insertRow("dispatch_assignments", {
      company_id: companyId,
      job_id: jobIds.furnaceQuoteTomorrow,
      technician_id: seedContext.technicianId,
      assigned_by: seedContext.actorId,
      status: "active",
      scheduled_start: buildJobSchedule(
        JOBS.find((job) => job.key === "furnaceQuoteTomorrow")!,
        seedContext.now,
      ).toISOString(),
      scheduled_end: atTime(addDays(seedContext.now, 1), 12).toISOString(),
      is_demo: true,
    });

    for (const key of completedDispatchKeys) {
      const jobSeed = JOBS.find((job) => job.key === key);
      const jobId = jobIds[key];
      if (!jobSeed || !jobId) {
        continue;
      }

      const start = buildJobSchedule(jobSeed, seedContext.now);
      const end = jobSeed.completedMinutesAfterStart
        ? new Date(start.getTime() + (jobSeed.completedMinutesAfterStart + 15) * 60_000)
        : atTime(start, start.getHours() + 2);

      await insertRow("dispatch_assignments", {
        company_id: companyId,
        job_id: jobId,
        technician_id: seedContext.technicianId,
        assigned_by: seedContext.actorId,
        status: "completed",
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        is_demo: true,
      });
    }

    const jobActivities = [
      { job_id: jobIds.maintenanceToday, event_type: "job_created", metadata: { source: "demo_seed" } },
      { job_id: jobIds.maintenanceToday, event_type: "technician_assigned", metadata: { technicianId: seedContext.technicianId } },
      { job_id: jobIds.noCoolingActive, event_type: "technician_arrived", metadata: {} },
      { job_id: jobIds.noCoolingActive, event_type: "work_started", metadata: {} },
      { job_id: jobIds.completedJamesMaint, event_type: "work_completed", metadata: {} },
      { job_id: jobIds.completedLakewoodDiag, event_type: "work_completed", metadata: {} },
      { job_id: jobIds.completedGreenfieldMaint, event_type: "work_completed", metadata: {} },
      { job_id: jobIds.completedJamesCap, event_type: "work_completed", metadata: {} },
    ];

    for (const activity of jobActivities) {
      await insertRow("job_activities", {
        company_id: companyId,
        job_id: activity.job_id,
        actor_id: seedContext.actorId,
        event_type: activity.event_type,
        metadata: activity.metadata,
        is_demo: true,
      });
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
    ];

    for (const material of materialSeeds) {
      await insertRow("job_materials", {
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

    const estimateDraftReplacementSubtotal = 4200;
    const estimateSentMaintenanceSubtotal = 314;
    const estimateApprovedReplacementSubtotal = 7850;

    const estimateDraft = await insertRow("estimates", {
      company_id: companyId,
      customer_id: customerIds.emily,
      job_id: jobIds.furnaceQuoteTomorrow,
      estimate_number: "EST-DEMO-2001",
      status: "draft",
      subtotal: estimateDraftReplacementSubtotal,
      tax_rate: TAX_RATE,
      tax: roundCurrency(estimateDraftReplacementSubtotal * (TAX_RATE / 100)),
      total: roundCurrency(estimateDraftReplacementSubtotal * (1 + TAX_RATE / 100)),
      valid_until: toDateOnly(addDays(seedContext.now, 21)),
      notes: "Draft furnace replacement estimate — review before sending to customer.",
      created_at: addDays(seedContext.now, -4).toISOString(),
      is_demo: true,
    });

    const estimateSent = await insertRow("estimates", {
      company_id: companyId,
      customer_id: customerIds.james,
      estimate_number: "EST-DEMO-2002",
      status: "sent",
      subtotal: estimateSentMaintenanceSubtotal,
      tax_rate: TAX_RATE,
      tax: roundCurrency(estimateSentMaintenanceSubtotal * (TAX_RATE / 100)),
      total: roundCurrency(estimateSentMaintenanceSubtotal * (1 + TAX_RATE / 100)),
      valid_until: toDateOnly(addDays(seedContext.now, 10)),
      notes: "Annual maintenance package proposal — ready to resend for approval testing.",
      created_at: addDays(seedContext.now, -12).toISOString(),
      is_demo: true,
    });

    const estimateApproved = await insertRow("estimates", {
      company_id: companyId,
      customer_id: customerIds.greenfield,
      job_id: jobIds.noCoolingActive,
      estimate_number: "EST-DEMO-2003",
      status: "approved",
      subtotal: estimateApprovedReplacementSubtotal,
      tax_rate: TAX_RATE,
      tax: roundCurrency(estimateApprovedReplacementSubtotal * (TAX_RATE / 100)),
      total: roundCurrency(estimateApprovedReplacementSubtotal * (1 + TAX_RATE / 100)),
      valid_until: toDateOnly(addDays(seedContext.now, 30)),
      notes: "Approved packaged RTU replacement after repeated no-cooling calls.",
      created_at: addDays(seedContext.now, -35).toISOString(),
      is_demo: true,
    });

    if (
      estimateDraft.error ||
      estimateSent.error ||
      estimateApproved.error ||
      !estimateDraft.id ||
      !estimateSent.id ||
      !estimateApproved.id
    ) {
      throw new Error("Failed to seed estimates.");
    }

    const estimateLineItems = [
      {
        estimate_id: estimateDraft.id,
        service_item_id: serviceItemIds["furnace-replacement"],
        name: withDemoName("Gas Furnace Replacement"),
        description: "80% AFUE furnace replacement with startup and permit.",
        quantity: 1,
        unit_price: 4200,
      },
      {
        estimate_id: estimateSent.id,
        service_item_id: serviceItemIds.furnace,
        name: withDemoName("Furnace Maintenance"),
        description: "Combustion check and safety inspection.",
        quantity: 1,
        unit_price: 165,
      },
      {
        estimate_id: estimateSent.id,
        service_item_id: serviceItemIds.labor,
        name: withDemoName("Standard Labor Rate"),
        description: "Additional labor for duct inspection.",
        quantity: 1.57,
        unit_price: 95,
      },
      {
        estimate_id: estimateApproved.id,
        service_item_id: serviceItemIds["system-replacement"],
        name: withDemoName("Packaged RTU Replacement"),
        description: "Remove existing rooftop unit and install new packaged system.",
        quantity: 1,
        unit_price: 7850,
      },
    ];

    for (const [index, line] of estimateLineItems.entries()) {
      await insertRow("estimate_line_items", {
        company_id: companyId,
        estimate_id: line.estimate_id,
        service_item_id: line.service_item_id,
        sort_order: index,
        name: line.name,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        taxable: true,
        is_demo: true,
      });
    }

    const invoicePaidSubtotal = 129;
    const invoicePaidTax = roundCurrency(invoicePaidSubtotal * (TAX_RATE / 100));
    const invoicePaidTotal = roundCurrency(invoicePaidSubtotal + invoicePaidTax);

    const invoicePartialSubtotal = 1890;
    const invoicePartialTax = roundCurrency(invoicePartialSubtotal * (TAX_RATE / 100));
    const invoicePartialTotal = roundCurrency(invoicePartialSubtotal + invoicePartialTax);
    const invoicePartialPaid = 1000;
    const invoicePartialBalance = roundCurrency(invoicePartialTotal - invoicePartialPaid);

    const invoiceOverdueSubtotal = 165;
    const invoiceOverdueTax = roundCurrency(invoiceOverdueSubtotal * (TAX_RATE / 100));
    const invoiceOverdueTotal = roundCurrency(invoiceOverdueSubtotal + invoiceOverdueTax);

    const invoiceHistoricalSubtotal = 275;
    const invoiceHistoricalTax = roundCurrency(invoiceHistoricalSubtotal * (TAX_RATE / 100));
    const invoiceHistoricalTotal = roundCurrency(invoiceHistoricalSubtotal + invoiceHistoricalTax);

    const invoicePaid = await insertRow("invoices", {
      company_id: companyId,
      customer_id: customerIds.lakewood,
      job_id: jobIds.completedLakewoodDiag,
      invoice_number: "INV-DEMO-3001",
      status: "paid",
      subtotal: invoicePaidSubtotal,
      tax_rate: TAX_RATE,
      tax_amount: invoicePaidTax,
      total: invoicePaidTotal,
      amount_paid: invoicePaidTotal,
      balance_due: 0,
      issue_date: toDateOnly(addDays(seedContext.now, -24)),
      due_date: toDateOnly(addDays(seedContext.now, 6)),
      paid_at: atTime(addDays(seedContext.now, -20), 11, 15).toISOString(),
      notes: "Diagnostic visit — paid in full.",
      created_at: addDays(seedContext.now, -24).toISOString(),
      is_demo: true,
    });

    const invoicePartial = await insertRow("invoices", {
      company_id: companyId,
      customer_id: customerIds.greenfield,
      job_id: jobIds.completedGreenfieldMaint,
      invoice_number: "INV-DEMO-3002",
      status: "partially_paid",
      subtotal: invoicePartialSubtotal,
      tax_rate: TAX_RATE,
      tax_amount: invoicePartialTax,
      total: invoicePartialTotal,
      amount_paid: invoicePartialPaid,
      balance_due: invoicePartialBalance,
      issue_date: toDateOnly(addDays(seedContext.now, -38)),
      due_date: toDateOnly(addDays(seedContext.now, 12)),
      notes: "Quarterly maintenance — deposit received, balance due.",
      created_at: addDays(seedContext.now, -38).toISOString(),
      is_demo: true,
    });

    const invoiceOverdue = await insertRow("invoices", {
      company_id: companyId,
      customer_id: customerIds.james,
      job_id: jobIds.completedJamesMaint,
      invoice_number: "INV-DEMO-3003",
      status: "sent",
      subtotal: invoiceOverdueSubtotal,
      tax_rate: TAX_RATE,
      tax_amount: invoiceOverdueTax,
      total: invoiceOverdueTotal,
      amount_paid: 0,
      balance_due: invoiceOverdueTotal,
      issue_date: toDateOnly(addDays(seedContext.now, -20)),
      due_date: toDateOnly(addDays(seedContext.now, -5)),
      notes: "Furnace maintenance completed — payment overdue.",
      created_at: addDays(seedContext.now, -20).toISOString(),
      is_demo: true,
    });

    const invoiceHistoricalPaid = await insertRow("invoices", {
      company_id: companyId,
      customer_id: customerIds.james,
      job_id: jobIds.completedJamesCap,
      invoice_number: "INV-DEMO-3004",
      status: "paid",
      subtotal: invoiceHistoricalSubtotal,
      tax_rate: TAX_RATE,
      tax_amount: invoiceHistoricalTax,
      total: invoiceHistoricalTotal,
      amount_paid: invoiceHistoricalTotal,
      balance_due: 0,
      issue_date: toDateOnly(addDays(seedContext.now, -54)),
      due_date: toDateOnly(addDays(seedContext.now, -24)),
      paid_at: atTime(addDays(seedContext.now, -50), 16, 0).toISOString(),
      notes: "Capacitor replacement — paid in full.",
      created_at: addDays(seedContext.now, -54).toISOString(),
      is_demo: true,
    });

    if (
      invoicePaid.error ||
      invoicePartial.error ||
      invoiceOverdue.error ||
      invoiceHistoricalPaid.error ||
      !invoicePaid.id ||
      !invoicePartial.id ||
      !invoiceOverdue.id ||
      !invoiceHistoricalPaid.id
    ) {
      throw new Error("Failed to seed invoices.");
    }

    const invoiceLineItems = [
      {
        invoice_id: invoicePaid.id,
        service_item_id: serviceItemIds.diagnostic,
        name: withDemoName("AC System Diagnostic"),
        description: "Cooling diagnostic and airflow verification.",
        quantity: 1,
        unit_price: invoicePaidSubtotal,
        line_total: invoicePaidSubtotal,
      },
      {
        invoice_id: invoicePartial.id,
        service_item_id: serviceItemIds["tune-up"],
        name: withDemoName("HVAC Seasonal Tune-Up"),
        description: "Quarterly commercial maintenance service.",
        quantity: 10,
        unit_price: 189,
        line_total: invoicePartialSubtotal,
      },
      {
        invoice_id: invoiceOverdue.id,
        service_item_id: serviceItemIds.furnace,
        name: withDemoName("Furnace Maintenance"),
        description: "Annual furnace maintenance service.",
        quantity: 1,
        unit_price: invoiceOverdueSubtotal,
        line_total: invoiceOverdueSubtotal,
      },
      {
        invoice_id: invoiceHistoricalPaid.id,
        service_item_id: serviceItemIds.capacitor,
        name: withDemoName("Capacitor Replacement"),
        description: "Replace failed run capacitor.",
        quantity: 1,
        unit_price: invoiceHistoricalSubtotal,
        line_total: invoiceHistoricalSubtotal,
      },
    ];

    for (const [index, line] of invoiceLineItems.entries()) {
      await insertRow("invoice_line_items", {
        company_id: companyId,
        invoice_id: line.invoice_id,
        service_item_id: line.service_item_id,
        name: line.name,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        taxable: true,
        line_total: line.line_total,
        sort_order: index,
        is_demo: true,
      });
    }

    const paymentSeeds = [
      {
        invoice_id: invoicePaid.id,
        amount: invoicePaidTotal,
        payment_date: toDateOnly(addDays(seedContext.now, -20)),
        reference: "DEMO-PAY-3001",
        notes: "Paid in full — check.",
      },
      {
        invoice_id: invoicePartial.id,
        amount: 600,
        payment_date: toDateOnly(addDays(seedContext.now, -35)),
        reference: "DEMO-PAY-3002A",
        notes: "Initial deposit.",
      },
      {
        invoice_id: invoicePartial.id,
        amount: 400,
        payment_date: toDateOnly(addDays(seedContext.now, -8)),
        reference: "DEMO-PAY-3002B",
        notes: "Second installment.",
      },
      {
        invoice_id: invoiceHistoricalPaid.id,
        amount: invoiceHistoricalTotal,
        payment_date: toDateOnly(addDays(seedContext.now, -50)),
        reference: "DEMO-PAY-3004",
        notes: "Historical paid invoice for revenue reporting.",
      },
    ];

    for (const payment of paymentSeeds) {
      await insertRow("invoice_payments", {
        company_id: companyId,
        invoice_id: payment.invoice_id,
        amount: payment.amount,
        payment_method: "card",
        payment_date: payment.payment_date,
        reference: payment.reference,
        notes: payment.notes,
        recorded_by: seedContext.actorId,
        is_demo: true,
      });
    }

    const laborEntries = [
      {
        job_id: jobIds.noCoolingActive,
        started_at: atTime(seedContext.now, 8, 35),
        ended_at: null,
        duration_minutes: null,
        notes: "Active labor on no-cooling repair.",
      },
      {
        job_id: jobIds.completedJamesMaint,
        started_at: atTime(addDays(seedContext.now, -18), 13, 25),
        ended_at: atTime(addDays(seedContext.now, -18), 14, 55),
        duration_minutes: 90,
        notes: "Furnace maintenance labor.",
      },
      {
        job_id: jobIds.completedLakewoodDiag,
        started_at: atTime(addDays(seedContext.now, -25), 10, 20),
        ended_at: atTime(addDays(seedContext.now, -25), 11, 40),
        duration_minutes: 80,
        notes: "Diagnostic and airflow correction.",
      },
      {
        job_id: jobIds.completedGreenfieldMaint,
        started_at: atTime(addDays(seedContext.now, -42), 14, 15),
        ended_at: atTime(addDays(seedContext.now, -42), 16, 0),
        duration_minutes: 105,
        notes: "Commercial preventive maintenance.",
      },
      {
        job_id: jobIds.completedJamesCap,
        started_at: atTime(addDays(seedContext.now, -55), 11, 22),
        ended_at: atTime(addDays(seedContext.now, -55), 12, 10),
        duration_minutes: 48,
        notes: "Capacitor replacement labor.",
      },
      {
        job_id: jobIds.completedLakewoodWater,
        started_at: atTime(addDays(seedContext.now, -72), 9, 20),
        ended_at: atTime(addDays(seedContext.now, -72), 11, 30),
        duration_minutes: 130,
        notes: "Water heater thermostat replacement.",
      },
      {
        job_id: jobIds.completedGreenfieldElectrical,
        started_at: atTime(addDays(seedContext.now, -95), 15, 18),
        ended_at: atTime(addDays(seedContext.now, -95), 16, 45),
        duration_minutes: 87,
        notes: "Electrical troubleshooting on blower control.",
      },
    ];

    for (const entry of laborEntries) {
      await insertRow("time_entries", {
        company_id: companyId,
        technician_id: seedContext.technicianId,
        job_id: entry.job_id,
        entry_type: "job_labor",
        started_at: entry.started_at.toISOString(),
        ended_at: entry.ended_at?.toISOString() ?? null,
        duration_minutes: entry.duration_minutes,
        notes: entry.notes,
        is_demo: true,
      });
    }

    await insertRow("time_entries", {
      company_id: companyId,
      technician_id: seedContext.technicianId,
      entry_type: "clock",
      started_at: atTime(seedContext.now, 7, 45).toISOString(),
      ended_at: null,
      duration_minutes: null,
      notes: "Demo shift clock-in for labor hour reporting.",
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
        message: "JOB-DEMO-1007 furnace maintenance was marked complete.",
        entity_type: "job",
        entity_id: jobIds.completedJamesMaint,
      },
      {
        type: "invoice_paid",
        title: "Demo payment received",
        message: `INV-DEMO-3001 was paid in full ($${invoicePaidTotal.toFixed(2)}).`,
        entity_type: "invoice",
        entity_id: invoicePaid.id,
      },
    ] as const;

    for (const notification of notifications) {
      await insertRow("notifications", {
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
    await clearCompanyDemoData(companyId);
    const message =
      error instanceof Error ? error.message : "Failed to load demo data.";
    return { error: message };
  }
}
