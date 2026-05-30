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
  email: string;
  phone: string;
  companyName?: string;
  status: "active" | "inactive" | "lead";
  address: string;
  city: string;
  state: string;
  postalCode: string;
  tags: string[];
  notes?: string;
  totalJobs?: number;
  totalRevenue?: number;
  lastServiceDaysAgo?: number;
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
];

const CUSTOMERS: CustomerSeed[] = [
  {
    key: "sarah",
    name: "Sarah Mitchell",
    email: "sarah.mitchell@riversidehomes.com",
    phone: "(512) 555-0142",
    companyName: "Riverside Homes LLC",
    status: "active",
    address: "1842 Oak Valley Dr",
    city: "Austin",
    state: "TX",
    postalCode: "78704",
    tags: ["Commercial", "HVAC"],
    notes: "Prefers morning appointments. Gate code: 4421.",
    totalJobs: 14,
    totalRevenue: 4825,
    lastServiceDaysAgo: 19,
  },
  {
    key: "james",
    name: "James Chen",
    email: "j.chen@gmail.com",
    phone: "(737) 555-0198",
    status: "active",
    address: "903 Willow Creek Ln",
    city: "Round Rock",
    state: "TX",
    postalCode: "78664",
    tags: ["Residential", "HVAC"],
    totalJobs: 6,
    totalRevenue: 1280,
    lastServiceDaysAgo: 37,
  },
  {
    key: "greenfield",
    name: "Greenfield Property Group",
    email: "ops@greenfieldpg.com",
    phone: "(512) 555-0234",
    companyName: "Greenfield Property Group",
    status: "active",
    address: "5500 Business Park Blvd, Ste 200",
    city: "Austin",
    state: "TX",
    postalCode: "78759",
    tags: ["Commercial", "Multi-unit"],
    notes: "Net-30 billing. Contact Maria for scheduling.",
    totalJobs: 31,
    totalRevenue: 12460,
    lastServiceDaysAgo: 11,
  },
  {
    key: "emily",
    name: "Emily Rodriguez",
    email: "emily.r@outlook.com",
    phone: "(512) 555-0311",
    status: "lead",
    address: "221 Sunset Ridge",
    city: "Cedar Park",
    state: "TX",
    postalCode: "78613",
    tags: ["Residential"],
    notes: "Requested estimate for capacitor replacement.",
  },
  {
    key: "lakewood",
    name: "Lakewood Apartments",
    email: "maintenance@lakewoodapt.com",
    phone: "(512) 555-0678",
    companyName: "Lakewood Apartments",
    status: "active",
    address: "3200 Lakewood Dr",
    city: "Austin",
    state: "TX",
    postalCode: "78745",
    tags: ["Commercial", "Property Management"],
    totalJobs: 22,
    totalRevenue: 8940,
    lastServiceDaysAgo: 7,
  },
];

async function insertRow(
  table: string,
  row: Record<string, unknown>,
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient();
  const builder = supabase.from(table);
  const { data, error } = await builder
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

  const seedContext: SeedContext = {
    companyId,
    actorId: context.user.id,
    technicianId: await resolveDemoTechnicianId(companyId, context.user.id),
    now: new Date(),
  };

  const serviceItemIds: Record<string, string> = {};
  const customerIds: Record<string, string> = {};

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
        email: customer.email,
        phone: customer.phone,
        company_name: customer.companyName ?? null,
        status: customer.status,
        address_line1: customer.address,
        city: customer.city,
        state: customer.state,
        postal_code: customer.postalCode,
        tags: customer.tags,
        notes: customer.notes ?? null,
        total_jobs: customer.totalJobs ?? 0,
        total_revenue: customer.totalRevenue ?? 0,
        last_service_date:
          customer.lastServiceDaysAgo !== undefined
            ? addDays(seedContext.now, -customer.lastServiceDaysAgo).toISOString()
            : null,
        is_demo: true,
      });

      if (result.error || !result.id) {
        throw new Error(result.error ?? "Failed to seed customers.");
      }

      customerIds[customer.key] = result.id;
    }

    await insertRow("customer_equipment", {
      company_id: companyId,
      customer_id: customerIds.sarah,
      name: withDemoName("Rooftop Package Unit RTU-4"),
      equipment_type: "Packaged HVAC",
      brand: "Carrier",
      model_number: "48TCFD16A2M6A0A0",
      serial_number: "DEMO-SN-4421",
      install_date: toDateOnly(addDays(seedContext.now, -900)),
      warranty_expires_at: toDateOnly(addDays(seedContext.now, 180)),
      location: "Roof — north wing",
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

    const todayMorning = atTime(seedContext.now, 9, 0);
    const todayActiveStart = atTime(seedContext.now, 8, 0);
    const tomorrowAfternoon = atTime(addDays(seedContext.now, 1), 13, 0);
    const lastWeek = atTime(addDays(seedContext.now, -6), 14, 0);

    const jobScheduledToday = await insertRow("jobs", {
      company_id: companyId,
      customer_id: customerIds.sarah,
      job_number: "JOB-DEMO-1001",
      service_address: "1842 Oak Valley Dr",
      city: "Austin",
      state: "TX",
      postal_code: "78704",
      job_type: "HVAC Maintenance",
      scheduled_at: todayMorning.toISOString(),
      status: "scheduled",
      priority: "normal",
      description: "Spring tune-up for rooftop unit. Check refrigerant levels and filters.",
      notes: "Gate code: 4421. Customer prefers morning slot.",
      assigned_technician_id: seedContext.technicianId,
      is_demo: true,
    });

    const jobActive = await insertRow("jobs", {
      company_id: companyId,
      customer_id: customerIds.greenfield,
      job_number: "JOB-DEMO-1002",
      service_address: "5500 Business Park Blvd, Ste 200",
      city: "Austin",
      state: "TX",
      postal_code: "78759",
      job_type: "AC Repair",
      scheduled_at: todayActiveStart.toISOString(),
      status: "in_progress",
      priority: "urgent",
      description: "Suite 200 AC not cooling. Tenant reported 82°F indoor temp.",
      notes: "Contact Maria on-site. Building access via loading dock.",
      assigned_technician_id: seedContext.technicianId,
      arrived_at: atTime(seedContext.now, 8, 15).toISOString(),
      work_started_at: atTime(seedContext.now, 8, 35).toISOString(),
      is_demo: true,
    });

    const jobCompletedJames = await insertRow("jobs", {
      company_id: companyId,
      customer_id: customerIds.james,
      job_number: "JOB-DEMO-1003",
      service_address: "903 Willow Creek Ln",
      city: "Round Rock",
      state: "TX",
      postal_code: "78664",
      job_type: "Furnace Maintenance",
      scheduled_at: lastWeek.toISOString(),
      status: "completed",
      priority: "normal",
      description: "Annual furnace maintenance and combustion safety check.",
      assigned_technician_id: seedContext.technicianId,
      arrived_at: atTime(addDays(seedContext.now, -6), 14, 10).toISOString(),
      work_started_at: atTime(addDays(seedContext.now, -6), 14, 25).toISOString(),
      completed_at: atTime(addDays(seedContext.now, -6), 16, 5).toISOString(),
      completion_notes: "Replaced dirty filter and cleaned flame sensor. System operating normally.",
      is_demo: true,
    });

    const jobScheduledTomorrow = await insertRow("jobs", {
      company_id: companyId,
      customer_id: customerIds.emily,
      job_number: "JOB-DEMO-1004",
      service_address: "221 Sunset Ridge",
      city: "Cedar Park",
      state: "TX",
      postal_code: "78613",
      job_type: "Capacitor Replacement",
      scheduled_at: tomorrowAfternoon.toISOString(),
      status: "scheduled",
      priority: "high",
      description: "Follow-up visit after approved estimate for failed run capacitor.",
      assigned_technician_id: seedContext.technicianId,
      is_demo: true,
    });

    const jobCompletedLakewood = await insertRow("jobs", {
      company_id: companyId,
      customer_id: customerIds.lakewood,
      job_number: "JOB-DEMO-1005",
      service_address: "3200 Lakewood Dr, Unit 14B",
      city: "Austin",
      state: "TX",
      postal_code: "78745",
      job_type: "HVAC Diagnostic",
      scheduled_at: atTime(addDays(seedContext.now, -3), 10, 0).toISOString(),
      status: "completed",
      priority: "normal",
      description: "Diagnose weak cooling in unit 14B and verify airflow balance.",
      assigned_technician_id: seedContext.technicianId,
      arrived_at: atTime(addDays(seedContext.now, -3), 10, 8).toISOString(),
      work_started_at: atTime(addDays(seedContext.now, -3), 10, 20).toISOString(),
      completed_at: atTime(addDays(seedContext.now, -3), 11, 45).toISOString(),
      completion_notes: "Found restricted return grille. Corrected and verified 18° delta-T.",
      is_demo: true,
    });

    const jobs = [
      jobScheduledToday,
      jobActive,
      jobCompletedJames,
      jobScheduledTomorrow,
      jobCompletedLakewood,
    ];

    if (jobs.some((job) => job.error || !job.id)) {
      throw new Error("Failed to seed jobs.");
    }

    const jobIds = {
      scheduledToday: jobScheduledToday.id!,
      active: jobActive.id!,
      completedJames: jobCompletedJames.id!,
      scheduledTomorrow: jobScheduledTomorrow.id!,
      completedLakewood: jobCompletedLakewood.id!,
    };

    for (const [jobId, start, end] of [
      [jobIds.scheduledToday, todayMorning, atTime(seedContext.now, 11, 0)],
      [jobIds.active, todayActiveStart, atTime(seedContext.now, 12, 0)],
      [jobIds.scheduledTomorrow, tomorrowAfternoon, atTime(addDays(seedContext.now, 1), 15, 0)],
    ] as const) {
      await insertRow("dispatch_assignments", {
        company_id: companyId,
        job_id: jobId,
        technician_id: seedContext.technicianId,
        assigned_by: seedContext.actorId,
        status: "active",
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        is_demo: true,
      });
    }

    await insertRow("dispatch_assignments", {
      company_id: companyId,
      job_id: jobIds.completedJames,
      technician_id: seedContext.technicianId,
      assigned_by: seedContext.actorId,
      status: "completed",
      scheduled_start: lastWeek.toISOString(),
      scheduled_end: atTime(addDays(seedContext.now, -6), 16, 30).toISOString(),
      is_demo: true,
    });

    const jobActivities = [
      {
        job_id: jobIds.scheduledToday,
        event_type: "job_created",
        metadata: { source: "demo_seed" },
      },
      {
        job_id: jobIds.scheduledToday,
        event_type: "technician_assigned",
        metadata: { technicianId: seedContext.technicianId },
      },
      {
        job_id: jobIds.active,
        event_type: "technician_arrived",
        metadata: {},
      },
      {
        job_id: jobIds.active,
        event_type: "work_started",
        metadata: {},
      },
      {
        job_id: jobIds.completedJames,
        event_type: "work_completed",
        metadata: {},
      },
      {
        job_id: jobIds.completedLakewood,
        event_type: "work_completed",
        metadata: {},
      },
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

    await insertRow("job_materials", {
      company_id: companyId,
      customer_id: customerIds.james,
      job_id: jobIds.completedJames,
      service_item_id: serviceItemIds.furnace,
      name: withDemoName("Furnace filter — 16x25x1"),
      description: "Standard pleated filter",
      quantity: 1,
      unit_cost: 18,
      unit_price: 32,
      taxable: true,
      added_by: seedContext.actorId,
      is_demo: true,
    });

    const taxRate = 8.25;

    const estimateDraft = await insertRow("estimates", {
      company_id: companyId,
      customer_id: customerIds.emily,
      job_id: jobIds.scheduledTomorrow,
      estimate_number: "EST-DEMO-2001",
      status: "draft",
      subtotal: 275,
      tax_rate: taxRate,
      tax: roundCurrency(275 * (taxRate / 100)),
      total: roundCurrency(275 * (1 + taxRate / 100)),
      valid_until: toDateOnly(addDays(seedContext.now, 14)),
      notes: "Draft estimate pending final review before sending.",
      is_demo: true,
    });

    const estimateSent = await insertRow("estimates", {
      company_id: companyId,
      customer_id: customerIds.james,
      estimate_number: "EST-DEMO-2002",
      status: "sent",
      subtotal: 314,
      tax_rate: taxRate,
      tax: roundCurrency(314 * (taxRate / 100)),
      total: roundCurrency(314 * (1 + taxRate / 100)),
      valid_until: toDateOnly(addDays(seedContext.now, 10)),
      notes: "Annual maintenance package proposal.",
      is_demo: true,
    });

    const estimateApproved = await insertRow("estimates", {
      company_id: companyId,
      customer_id: customerIds.sarah,
      job_id: jobIds.scheduledToday,
      estimate_number: "EST-DEMO-2003",
      status: "approved",
      subtotal: 189,
      tax_rate: taxRate,
      tax: roundCurrency(189 * (taxRate / 100)),
      total: roundCurrency(189 * (1 + taxRate / 100)),
      valid_until: toDateOnly(addDays(seedContext.now, 21)),
      notes: "Approved spring tune-up for rooftop unit.",
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
        service_item_id: serviceItemIds.capacitor,
        name: withDemoName("Capacitor Replacement"),
        description: "Replace failed run capacitor and verify amp draw.",
        quantity: 1,
        unit_price: 275,
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
        service_item_id: serviceItemIds["tune-up"],
        name: withDemoName("HVAC Seasonal Tune-Up"),
        description: "Approved spring tune-up service.",
        quantity: 1,
        unit_price: 189,
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

    const invoiceUnpaidTotal = roundCurrency(165 * (1 + taxRate / 100));
    const invoicePaidSubtotal = 129;
    const invoicePaidTax = roundCurrency(invoicePaidSubtotal * (taxRate / 100));
    const invoicePaidTotal = roundCurrency(invoicePaidSubtotal + invoicePaidTax);

    const invoiceUnpaid = await insertRow("invoices", {
      company_id: companyId,
      customer_id: customerIds.james,
      job_id: jobIds.completedJames,
      invoice_number: "INV-DEMO-3001",
      status: "sent",
      subtotal: 165,
      tax_rate: taxRate,
      tax_amount: roundCurrency(165 * (taxRate / 100)),
      total: invoiceUnpaidTotal,
      amount_paid: 0,
      balance_due: invoiceUnpaidTotal,
      issue_date: toDateOnly(addDays(seedContext.now, -2)),
      due_date: toDateOnly(addDays(seedContext.now, 28)),
      notes: "Furnace maintenance completed — payment outstanding.",
      is_demo: true,
    });

    const invoicePaid = await insertRow("invoices", {
      company_id: companyId,
      customer_id: customerIds.lakewood,
      job_id: jobIds.completedLakewood,
      invoice_number: "INV-DEMO-3002",
      status: "paid",
      subtotal: invoicePaidSubtotal,
      tax_rate: taxRate,
      tax_amount: invoicePaidTax,
      total: invoicePaidTotal,
      amount_paid: invoicePaidTotal,
      balance_due: 0,
      issue_date: toDateOnly(addDays(seedContext.now, -2)),
      due_date: toDateOnly(addDays(seedContext.now, 28)),
      paid_at: atTime(addDays(seedContext.now, -1), 15, 30).toISOString(),
      notes: "Diagnostic visit — paid in full.",
      is_demo: true,
    });

    if (
      invoiceUnpaid.error ||
      invoicePaid.error ||
      !invoiceUnpaid.id ||
      !invoicePaid.id
    ) {
      throw new Error("Failed to seed invoices.");
    }

    await insertRow("invoice_line_items", {
      company_id: companyId,
      invoice_id: invoiceUnpaid.id,
      service_item_id: serviceItemIds.furnace,
      name: withDemoName("Furnace Maintenance"),
      description: "Annual furnace maintenance service.",
      quantity: 1,
      unit_price: 165,
      taxable: true,
      line_total: 165,
      sort_order: 0,
      is_demo: true,
    });

    await insertRow("invoice_line_items", {
      company_id: companyId,
      invoice_id: invoicePaid.id,
      service_item_id: serviceItemIds.diagnostic,
      name: withDemoName("AC System Diagnostic"),
      description: "Cooling diagnostic and airflow verification.",
      quantity: 1,
      unit_price: invoicePaidSubtotal,
      taxable: true,
      line_total: invoicePaidSubtotal,
      sort_order: 0,
      is_demo: true,
    });

    await insertRow("invoice_payments", {
      company_id: companyId,
      invoice_id: invoicePaid.id,
      amount: invoicePaidTotal,
      payment_method: "card",
      payment_date: toDateOnly(addDays(seedContext.now, -1)),
      reference: "DEMO-PAY-8842",
      notes: "Demo payment recorded for evaluator walkthrough.",
      recorded_by: seedContext.actorId,
      is_demo: true,
    });

    const laborEntries = [
      {
        job_id: jobIds.active,
        started_at: atTime(seedContext.now, 8, 35),
        ended_at: null,
        duration_minutes: null,
        notes: "Active labor on AC repair.",
      },
      {
        job_id: jobIds.completedJames,
        started_at: atTime(addDays(seedContext.now, -6), 14, 25),
        ended_at: atTime(addDays(seedContext.now, -6), 16, 0),
        duration_minutes: 95,
        notes: "Furnace maintenance labor.",
      },
      {
        job_id: jobIds.completedLakewood,
        started_at: atTime(addDays(seedContext.now, -3), 10, 20),
        ended_at: atTime(addDays(seedContext.now, -3), 11, 40),
        duration_minutes: 80,
        notes: "Diagnostic and airflow correction.",
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
      notes: "Demo shift clock-in for time tracking reports.",
      is_demo: true,
    });

    const notifications = [
      {
        type: "job_assigned",
        title: "Demo job assigned",
        message: "You were assigned JOB-DEMO-1001 — HVAC Maintenance at Riverside Homes.",
        entity_type: "job",
        entity_id: jobIds.scheduledToday,
      },
      {
        type: "job_completed",
        title: "Demo job completed",
        message: "JOB-DEMO-1003 furnace maintenance was marked complete.",
        entity_type: "job",
        entity_id: jobIds.completedJames,
      },
      {
        type: "invoice_paid",
        title: "Demo payment received",
        message: "INV-DEMO-3002 was paid in full ($" + invoicePaidTotal.toFixed(2) + ").",
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
