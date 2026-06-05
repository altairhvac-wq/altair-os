"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  updateMemberAvailability,
  updateMemberCertifications,
  updateMemberLaborCostRate,
  updateMemberNotes,
} from "@/lib/database/queries/team-member-profile";
import type { TeamMemberProfile } from "@/shared/types/team-member-profile";
import { parseLaborCostRateInput } from "@/shared/types/team-member-profile";

function revalidateTeamMemberProfile(membershipId: string) {
  revalidatePath(`/team/${membershipId}`);
  revalidatePath("/settings");
}

export type TeamMemberProfileActionResult = {
  error?: string;
  profile?: TeamMemberProfile;
};

export async function updateMemberLaborCostRateAction(
  membershipId: string,
  laborCostRate: string,
): Promise<TeamMemberProfileActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const parsed = parseLaborCostRateInput(laborCostRate);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const result = await updateMemberLaborCostRate(
    context.company.id,
    membershipId,
    parsed.cents,
    { userId: context.user.id, role: context.role },
    context,
  );

  if (result.error) {
    return { error: result.error };
  }

  revalidateTeamMemberProfile(membershipId);
  return { profile: result.profile };
}

export async function updateMemberNotesAction(
  membershipId: string,
  notes: string,
): Promise<TeamMemberProfileActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const result = await updateMemberNotes(
    context.company.id,
    membershipId,
    notes,
    { userId: context.user.id, role: context.role },
    context,
  );

  if (result.error) {
    return { error: result.error };
  }

  revalidateTeamMemberProfile(membershipId);
  return { profile: result.profile };
}

export async function updateMemberAvailabilityAction(
  membershipId: string,
  availableForDispatch: boolean,
  emergencyOnCall: boolean,
): Promise<TeamMemberProfileActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const result = await updateMemberAvailability(
    context.company.id,
    membershipId,
    { availableForDispatch, emergencyOnCall },
    { userId: context.user.id, role: context.role },
    context,
  );

  if (result.error) {
    return { error: result.error };
  }

  revalidateTeamMemberProfile(membershipId);
  return { profile: result.profile };
}

export async function updateMemberCertificationsAction(
  membershipId: string,
  certifications: string[],
): Promise<TeamMemberProfileActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const result = await updateMemberCertifications(
    context.company.id,
    membershipId,
    certifications,
    { userId: context.user.id, role: context.role },
    context,
  );

  if (result.error) {
    return { error: result.error };
  }

  revalidateTeamMemberProfile(membershipId);
  return { profile: result.profile };
}
