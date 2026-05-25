import {
  formatRelationshipStatus,
  formatSubcontractJobStatus,
  type NetworkRevenueSummary,
  type PartnerCompany,
  type PartnerFormData,
  type PartnerRevenueStat,
  type RelationshipStatus,
  type SubcontractJob,
  type SubcontractJobDirection,
  type SubcontractJobStatus,
  type TradeType,
} from "./network";

export function filterPartners(
  partners: PartnerCompany[],
  search: string,
  tradeFilter: TradeType | "all",
  statusFilter: RelationshipStatus | "all",
): PartnerCompany[] {
  const query = search.trim().toLowerCase();

  return partners.filter((partner) => {
    const matchesTrade =
      tradeFilter === "all" || partner.tradeType === tradeFilter;
    const matchesStatus =
      statusFilter === "all" || partner.relationshipStatus === statusFilter;

    if (!matchesTrade || !matchesStatus) return false;
    if (!query) return true;

    const haystack = [
      partner.companyName,
      partner.contactName,
      partner.tradeType,
      partner.serviceArea,
      partner.city,
      partner.state,
      formatRelationshipStatus(partner.relationshipStatus),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function filterSubcontractJobs(
  jobs: SubcontractJob[],
  search: string,
  statusFilter: SubcontractJobStatus | "all",
  tradeFilter: TradeType | "all",
  direction?: SubcontractJobDirection,
): SubcontractJob[] {
  const query = search.trim().toLowerCase();

  return jobs.filter((job) => {
    if (direction && job.direction !== direction) return false;

    const matchesStatus =
      statusFilter === "all" || job.status === statusFilter;
    const matchesTrade =
      tradeFilter === "all" || job.tradeType === tradeFilter;

    if (!matchesStatus || !matchesTrade) return false;
    if (!query) return true;

    const haystack = [
      job.jobNumber,
      job.title,
      job.tradeType,
      job.partnerCompanyName ?? "",
      job.postedBy ?? "",
      job.serviceAddress,
      job.city,
      job.state,
      formatSubcontractJobStatus(job.status),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function getNetworkRevenueSummary(
  partners: PartnerCompany[],
  jobs: SubcontractJob[],
): NetworkRevenueSummary {
  const sentJobs = jobs.filter((j) => j.direction === "sent");
  const receivedJobs = jobs.filter((j) => j.direction === "received");

  const totalPaidOut = sentJobs.reduce((sum, j) => sum + (j.payoutAmount ?? 0), 0);
  const totalEarned = receivedJobs.reduce(
    (sum, j) => sum + (j.earnedAmount ?? 0),
    0,
  );

  const revenueByPartner: PartnerRevenueStat[] = partners
    .map((partner) => {
      const partnerSent = sentJobs.filter(
        (j) => j.partnerCompanyId === partner.id,
      );
      const partnerReceived = receivedJobs.filter(
        (j) => j.partnerCompanyId === partner.id,
      );

      const paidOut = partnerSent.reduce(
        (sum, j) => sum + (j.payoutAmount ?? 0),
        0,
      );
      const earned = partnerReceived.reduce(
        (sum, j) => sum + (j.earnedAmount ?? 0),
        0,
      );

      return {
        partnerId: partner.id,
        partnerCompanyName: partner.companyName,
        tradeType: partner.tradeType,
        jobsSent: partnerSent.length,
        jobsReceived: partnerReceived.length,
        totalPaidOut: paidOut,
        totalEarned: earned,
        totalRevenue: paidOut + earned,
      };
    })
    .filter((stat) => stat.totalRevenue > 0)
    .sort((a, b) => b.totalRevenue - a.totalRevenue);

  return {
    totalPaidOut,
    totalEarned,
    jobsSent: sentJobs.length,
    jobsReceived: receivedJobs.length,
    revenueByPartner,
  };
}

function parseServiceArea(serviceArea: string): { city: string; state: string } {
  const parts = serviceArea.split(",").map((part) => part.trim());
  if (parts.length >= 2) {
    return {
      city: parts.slice(0, -1).join(", "),
      state: parts[parts.length - 1],
    };
  }

  return { city: serviceArea.trim() || "Unknown", state: "TX" };
}

export function formDataToPartner(data: PartnerFormData): PartnerCompany {
  const { city, state } = parseServiceArea(data.serviceArea);
  const today = new Date().toISOString().split("T")[0];

  return {
    id: `partner-${Date.now()}`,
    companyName: data.companyName,
    contactName: data.contactName,
    email: data.email,
    phone: data.phone,
    tradeType: data.tradeType,
    serviceArea: data.serviceArea,
    city,
    state,
    relationshipStatus: data.relationshipStatus,
    jobsCompletedTogether: 0,
    revenueGeneratedTogether: 0,
    rating: 0,
    trustScore: 0,
    insured: false,
    notes: data.notes || undefined,
    addedAt: today,
  };
}
