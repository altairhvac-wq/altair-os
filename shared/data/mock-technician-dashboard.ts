import type { TechnicianDashboardData } from "@/shared/types/technician";
import { mockTechnicians } from "@/shared/data/mock-technicians";

const marcus = mockTechnicians.find((tech) => tech.id === "tech-001")!;

export const mockTechnicianDashboard: TechnicianDashboardData = {
  technician: marcus,
  shift: {
    status: "clocked_in",
    clockInAt: "2026-05-25T07:15:00",
  },
  currentJob: {
    id: "disp-003",
    customerId: "00000000-0000-0000-0000-000000000001",
    jobNumber: "JOB-1042",
    customerName: "Sarah Mitchell",
    customerPhone: "(512) 555-0198",
    serviceAddress: "1842 Oak Valley Dr",
    city: "Austin",
    state: "TX",
    zip: "78704",
    jobType: "HVAC Maintenance",
    scheduledDate: "2026-05-25T09:00:00",
    status: "in_progress",
    priority: "normal",
    description: "Spring tune-up for rooftop unit.",
    notes: "Gate code: 4421. Dog in backyard — use side gate.",
  },
  upcomingJobs: [
    {
      id: "disp-013",
      customerId: "00000000-0000-0000-0000-000000000002",
      jobNumber: "JOB-1055",
      customerName: "Riverside Apartments",
      customerPhone: "(512) 555-0264",
      serviceAddress: "2100 Riverside Dr, Bldg C",
      city: "Austin",
      state: "TX",
      zip: "78741",
      jobType: "AC Repair",
      scheduledDate: "2026-05-25T13:30:00",
      status: "dispatched",
      priority: "high",
      description: "Unit C-204 not cooling. Tenant home after 1 PM.",
    },
    {
      id: "disp-007",
      customerId: "00000000-0000-0000-0000-000000000003",
      jobNumber: "JOB-1047",
      customerName: "Michael Foster",
      customerPhone: "(512) 555-0331",
      serviceAddress: "118 Birchwood Ct",
      city: "Pflugerville",
      state: "TX",
      zip: "78660",
      jobType: "HVAC Maintenance",
      scheduledDate: "2026-05-25T16:00:00",
      status: "scheduled",
      priority: "normal",
      description: "AC tune-up before summer.",
    },
  ],
  todayJobCount: 3,
  completedTodayCount: 0,
};

export const mockTechnicianDashboardEmpty: TechnicianDashboardData = {
  technician: {
    ...marcus,
    status: "available",
  },
  shift: {
    status: "clocked_out",
  },
  currentJob: null,
  upcomingJobs: [],
  todayJobCount: 0,
  completedTodayCount: 0,
};
