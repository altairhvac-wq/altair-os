"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ArrowLeft,
  Calendar,
  Mail,
  Phone,
  Shield,
} from "lucide-react";
import {
  updateMemberAvailabilityAction,
  updateMemberCertificationsAction,
  updateMemberLaborCostRateAction,
  updateMemberNotesAction,
} from "@/app/actions/team-member-profile";
import { updateMemberSpecialtiesAction } from "@/app/actions/memberships";
import {
  shouldShowMemberSpecialties,
  TeamMemberSpecialtiesField,
} from "@/shared/components/settings/TeamMemberSpecialtiesField";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterShellPage,
} from "@/shared/design-system/shell";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import { formatPercent } from "@/shared/types/analytics";
import {
  formatTeamMemberRole,
  getTeamMemberInitials,
} from "@/shared/types/team-member";
import type {
  TeamMemberActivityItem,
  TeamMemberProfile,
  TeamMemberWorkSummary,
} from "@/shared/types/team-member-profile";
import {
  formatLaborCostRate,
  formatProfileMembershipStatus,
} from "@/shared/types/team-member-profile";
import type { MembershipStatus } from "@/lib/database/types/enums";
import type { TechnicianSpecialty } from "@/shared/types/technician-specialties";
import { tm } from "./team-member-north-star-styles";

type TeamMemberProfileNorthStarViewProps = {
  membershipId: string;
  initialProfile: TeamMemberProfile;
  workSummary: TeamMemberWorkSummary | null;
  activity: TeamMemberActivityItem[];
  canEdit: boolean;
  canEditSpecialties: boolean;
  canViewNotes: boolean;
  canViewProfitability: boolean;
  canEditProfitability: boolean;
  canViewWorkSummary: boolean;
  backHref?: string;
  backLabel?: string;
};

const ACTIVITY_TYPE_LABELS: Record<TeamMemberActivityItem["type"], string> = {
  assigned_job: "Assigned",
  completed_job: "Completed",
  estimate: "Estimate",
  time_entry: "Time",
};

function formatLaborHours(hours: number): string {
  if (hours <= 0) {
    return "0 hrs";
  }

  return `${hours} hrs`;
}

function statusBadgeClass(status: MembershipStatus): string {
  switch (status) {
    case "active":
      return tm.statusActive;
    case "invited":
      return tm.statusInvited;
    case "suspended":
      return tm.statusSuspended;
    default:
      return tm.statusSuspended;
  }
}

export function TeamMemberProfileNorthStarView({
  membershipId,
  initialProfile,
  workSummary,
  activity,
  canEdit,
  canEditSpecialties,
  canViewNotes,
  canViewProfitability,
  canEditProfitability,
  canViewWorkSummary,
  backHref = "/settings#team-members",
  backLabel = "Team",
}: TeamMemberProfileNorthStarViewProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [notesInput, setNotesInput] = useState(profile.memberNotes ?? "");
  const [certificationInput, setCertificationInput] = useState("");
  const [rateInput, setRateInput] = useState(
    formatLaborCostRate(profile.laborCostRateCents),
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showSpecialties = shouldShowMemberSpecialties(profile.role);
  const startDate = profile.joinedAt ?? profile.createdAt;
  const hasLaborRate =
    profile.laborCostRateCents != null && profile.laborCostRateCents >= 0;

  function showMessage(type: "success" | "error", message: string) {
    setFeedback({ type, message });
  }

  function handleNotesSave() {
    startTransition(async () => {
      const result = await updateMemberNotesAction(membershipId, notesInput);
      if (result.error) {
        showMessage("error", result.error);
        return;
      }
      if (result.profile) {
        setProfile(result.profile);
        setNotesInput(result.profile.memberNotes ?? "");
        showMessage("success", "Notes saved.");
      }
    });
  }

  function handleAvailabilityChange(
    field: "availableForDispatch" | "emergencyOnCall",
    value: boolean,
  ) {
    const next = {
      availableForDispatch:
        field === "availableForDispatch"
          ? value
          : profile.availableForDispatch,
      emergencyOnCall:
        field === "emergencyOnCall" ? value : profile.emergencyOnCall,
    };

    startTransition(async () => {
      const result = await updateMemberAvailabilityAction(
        membershipId,
        next.availableForDispatch,
        next.emergencyOnCall,
      );
      if (result.error) {
        showMessage("error", result.error);
        return;
      }
      if (result.profile) {
        setProfile(result.profile);
        showMessage("success", "Availability updated.");
      }
    });
  }

  function handleAddCertification() {
    const trimmed = certificationInput.trim();
    if (!trimmed) {
      return;
    }

    if (trimmed.length > 100) {
      showMessage("error", "Each certification must be 100 characters or fewer.");
      return;
    }

    if (profile.certifications.length >= 50) {
      showMessage("error", "A member can have at most 50 certifications.");
      return;
    }

    const next = [...profile.certifications, trimmed];

    startTransition(async () => {
      const result = await updateMemberCertificationsAction(
        membershipId,
        next,
      );
      if (result.error) {
        showMessage("error", result.error);
        return;
      }
      if (result.profile) {
        setProfile(result.profile);
        setCertificationInput("");
        showMessage("success", "Certification added.");
      }
    });
  }

  function handleRemoveCertification(certification: string) {
    const next = profile.certifications.filter(
      (item) => item !== certification,
    );

    startTransition(async () => {
      const result = await updateMemberCertificationsAction(
        membershipId,
        next,
      );
      if (result.error) {
        showMessage("error", result.error);
        return;
      }
      if (result.profile) {
        setProfile(result.profile);
        showMessage("success", "Certification removed.");
      }
    });
  }

  function handleSpecialtiesChange(specialties: TechnicianSpecialty[]) {
    startTransition(async () => {
      const result = await updateMemberSpecialtiesAction(
        membershipId,
        specialties,
      );
      if (result.error) {
        showMessage("error", result.error);
        return;
      }
      if (result.member) {
        setProfile((current) => ({
          ...current,
          technicianSpecialties: result.member!.technicianSpecialties,
        }));
        showMessage("success", "Specialties updated.");
      }
    });
  }

  function handleLaborRateSave() {
    startTransition(async () => {
      const result = await updateMemberLaborCostRateAction(
        membershipId,
        rateInput,
      );

      if (result.error) {
        showMessage("error", result.error);
        return;
      }

      if (result.profile) {
        setProfile(result.profile);
        setRateInput(formatLaborCostRate(result.profile.laborCostRateCents));
        showMessage("success", "Labor cost rate saved.");
      }
    });
  }

  return (
    <MasterShellPage density="default" className={tm.pageCanvas}>
      <MasterPageCanvas width="detailWide">
        <MasterContentStack density="default">
          <Link href={backHref} className={tm.backLink}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>

          {feedback ? (
            <div
              className={
                feedback.type === "success"
                  ? tm.feedbackSuccess
                  : tm.feedbackError
              }
            >
              {feedback.message}
            </div>
          ) : null}

          {profile.status === "invited" ? (
            <div className={tm.bannerInvited}>
              This member has a pending invite. Some profile details will appear
              after they accept.
            </div>
          ) : null}

          {profile.status === "suspended" ? (
            <div className={tm.bannerSuspended}>
              This member is inactive. Profile edits are disabled until access is
              restored.
            </div>
          ) : null}

          <div className={tm.heroShell}>
            <div aria-hidden="true" className={tm.heroAccentRail} />

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-[rgba(201,164,77,0.35)]"
                  />
                ) : (
                  <div className={tm.heroAvatar}>
                    {getTeamMemberInitials(profile.name)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className={tm.heroEyebrow}>Personnel profile</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <h1 className={tm.heroTitle}>{profile.name}</h1>
                    <span className={statusBadgeClass(profile.status)}>
                      {formatProfileMembershipStatus(profile.status)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-[#C8D0DA]">
                    {formatTeamMemberRole(profile.role)}
                  </p>

                  <div className="mt-3 space-y-1.5">
                    <div className={`flex items-center gap-2 ${tm.heroMeta}`}>
                      <Mail className={tm.heroMetaIcon} />
                      <span className="truncate">{profile.email}</span>
                    </div>
                    {profile.phone ? (
                      <div className={`flex items-center gap-2 ${tm.heroMeta}`}>
                        <Phone className={tm.heroMetaIcon} />
                        <span>{profile.phone}</span>
                      </div>
                    ) : null}
                    <div className={`flex items-center gap-2 ${tm.heroMeta}`}>
                      <Calendar className={tm.heroMetaIcon} />
                      <span>Started {formatDate(startDate)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 rounded-lg border border-[rgba(201,164,77,0.14)] bg-[rgba(15,23,42,0.28)] px-3 py-2">
                <Shield className="h-4 w-4 shrink-0 text-[#8A6324]" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#C8D0DA]">
                    Access
                  </p>
                  <p className="text-sm font-semibold text-[#FFF9EA]">
                    {formatTeamMemberRole(profile.role)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={tm.workspaceGrid}>
            <div className={tm.workspaceMain}>
              <section className={tm.sectionSurface}>
                <h2 className={tm.sectionTitle}>Identity & contact</h2>
                <p className={tm.sectionSubtitle}>
                  Company record and internal notes
                </p>
                <dl className="mt-3">
                  <InfoRow label="Full name" value={profile.name} />
                  <InfoRow label="Email" value={profile.email} />
                  <InfoRow label="Phone" value={profile.phone ?? "—"} />
                  <InfoRow
                    label="Role"
                    value={formatTeamMemberRole(profile.role)}
                  />
                  <InfoRow label="Start date" value={formatDate(startDate)} />
                  <InfoRow
                    label="Status"
                    value={
                      <span className={statusBadgeClass(profile.status)}>
                        {formatProfileMembershipStatus(profile.status)}
                      </span>
                    }
                  />
                </dl>

                {canViewNotes ? (
                  <div className="mt-4 border-t border-[rgba(138,99,36,0.12)] pt-4">
                    <label htmlFor="member-notes-ns" className={tm.formLabel}>
                      Notes
                    </label>
                    {canEdit ? (
                      <>
                        <textarea
                          id="member-notes-ns"
                          value={notesInput}
                          onChange={(event) => setNotesInput(event.target.value)}
                          rows={3}
                          maxLength={2000}
                          disabled={isPending}
                          placeholder="Optional internal notes"
                          className={`${tm.formTextarea} min-h-[88px]`}
                        />
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={handleNotesSave}
                            disabled={isPending}
                            className={tm.secondaryButton}
                          >
                            Save notes
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-[#4F4638]">
                        {profile.memberNotes?.trim() || "—"}
                      </p>
                    )}
                  </div>
                ) : null}
              </section>

              {showSpecialties ? (
                <section className={tm.sectionSurface}>
                  <h2 className={tm.sectionTitle}>Technician profile</h2>
                  <p className={tm.sectionSubtitle}>
                    Field specialties used for job matching
                  </p>
                  <div className="mt-3">
                    <TeamMemberSpecialtiesField
                      specialties={profile.technicianSpecialties}
                      canEdit={canEditSpecialties}
                      disabled={isPending}
                      variant="northStar"
                      onChange={handleSpecialtiesChange}
                    />
                  </div>
                </section>
              ) : null}

              <section className={tm.sectionSurface}>
                <h2 className={tm.sectionTitle}>Certifications</h2>
                <p className={tm.sectionSubtitle}>
                  Licenses and credentials on file
                </p>

                {profile.certifications.length === 0 ? (
                  <div className={`${tm.emptyState} mt-3`}>
                    <p className="text-sm font-medium text-[#6B6255]">
                      Add certifications.
                    </p>
                  </div>
                ) : (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {profile.certifications.map((certification) => (
                      <li key={certification} className={tm.certChip}>
                        {certification}
                        {canEdit ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handleRemoveCertification(certification)
                            }
                            className={tm.certRemove}
                            aria-label={`Remove ${certification}`}
                          >
                            ×
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                {canEdit ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={certificationInput}
                      onChange={(event) =>
                        setCertificationInput(event.target.value)
                      }
                      placeholder="EPA 608"
                      maxLength={100}
                      disabled={isPending}
                      className={`${tm.formInput} min-w-0 flex-1`}
                    />
                    <button
                      type="button"
                      onClick={handleAddCertification}
                      disabled={isPending || !certificationInput.trim()}
                      className={tm.secondaryButton}
                    >
                      Add
                    </button>
                  </div>
                ) : null}
              </section>
            </div>

            <div className={tm.workspaceSide}>
              {canViewProfitability ? (
                <section className={tm.sectionSurface}>
                  <h2 className={tm.sectionTitle}>Profitability settings</h2>
                  <p className={tm.sectionSubtitle}>
                    Used for technician profitability calculations. Not visible
                    to technicians.
                  </p>

                  {!hasLaborRate && !canEditProfitability ? (
                    <div className={`${tm.emptyState} mt-3`}>
                      <p className="text-sm font-medium text-[#6B6255]">
                        Add a labor cost rate to unlock profitability reporting.
                      </p>
                    </div>
                  ) : canEditProfitability ? (
                    <div className="mt-3 space-y-2">
                      <div>
                        <label
                          htmlFor="labor-cost-rate-ns"
                          className={tm.formLabel}
                        >
                          Labor cost rate
                        </label>
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-[#6B6255]">
                            $
                          </span>
                          <input
                            id="labor-cost-rate-ns"
                            type="text"
                            inputMode="decimal"
                            value={rateInput}
                            onChange={(event) =>
                              setRateInput(event.target.value)
                            }
                            placeholder="35.00"
                            disabled={isPending}
                            className={`${tm.formInput} min-w-0 flex-1`}
                          />
                          <span className="shrink-0 text-sm font-medium text-[#6B6255]">
                            /hr
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleLaborRateSave}
                        disabled={isPending}
                        className={tm.saveButton}
                      >
                        {isPending ? "Saving..." : "Save rate"}
                      </button>
                    </div>
                  ) : hasLaborRate ? (
                    <p className="mt-3 text-sm font-semibold text-[#17130E]">
                      ${formatLaborCostRate(profile.laborCostRateCents)}/hr
                    </p>
                  ) : (
                    <div className={`${tm.emptyState} mt-3`}>
                      <p className="text-sm font-medium text-[#6B6255]">
                        Add a labor cost rate to unlock profitability reporting.
                      </p>
                    </div>
                  )}
                </section>
              ) : null}

              {canViewWorkSummary ? (
                <WorkSummarySection
                  summary={workSummary}
                  isPendingInvite={
                    profile.status === "invited" && !profile.userId
                  }
                />
              ) : null}

              <ActivitySection activity={activity} />

              <section className={tm.sectionSurface}>
                <h2 className={tm.sectionTitle}>Availability</h2>
                <p className={tm.sectionSubtitle}>
                  Dispatch and on-call readiness
                </p>
                <div className="mt-3 space-y-3">
                  <ToggleRow
                    label="Available for dispatch"
                    checked={profile.availableForDispatch}
                    disabled={!canEdit || isPending}
                    onChange={(value) =>
                      handleAvailabilityChange("availableForDispatch", value)
                    }
                  />
                  <ToggleRow
                    label="Emergency on-call"
                    checked={profile.emergencyOnCall}
                    disabled={!canEdit || isPending}
                    onChange={(value) =>
                      handleAvailabilityChange("emergencyOnCall", value)
                    }
                  />
                </div>
              </section>
            </div>
          </div>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className={tm.metaRow}>
      <dt className={tm.metaLabel}>{label}</dt>
      <dd className={tm.metaValue}>{value}</dd>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3">
      <span className="text-sm font-medium text-[#4F4638]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? tm.toggleTrackOn : tm.toggleTrackOff
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-[#FFF9EA] shadow transition-transform ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function WorkSummarySection({
  summary,
  isPendingInvite,
}: {
  summary: TeamMemberWorkSummary | null;
  isPendingInvite: boolean;
}) {
  if (!summary) {
    return null;
  }

  const hasData =
    summary.jobsCompleted > 0 ||
    summary.revenue > 0 ||
    summary.laborHours > 0;

  return (
    <section className={tm.sectionSurface}>
      <div className="flex items-center justify-between gap-2">
        <h2 className={tm.sectionTitle}>Work summary</h2>
        <span className="text-[11px] font-medium text-[#6B6255]">
          {summary.periodLabel}
        </span>
      </div>

      {isPendingInvite ? (
        <div className={`${tm.emptyState} mt-3`}>
          <p className="text-sm font-medium text-[#6B6255]">
            Work summary will be available after this member accepts their
            invite.
          </p>
        </div>
      ) : !hasData ? (
        <div className={`${tm.emptyState} mt-3`}>
          <p className="text-sm font-medium text-[#6B6255]">
            Work summary will appear once this member has completed jobs.
          </p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Metric label="Jobs completed" value={String(summary.jobsCompleted)} />
          <Metric
            label="Revenue generated"
            value={formatCurrency(summary.revenue)}
          />
          <Metric
            label="Labor hours"
            value={formatLaborHours(summary.laborHours)}
          />
          {summary.profitAvailable ? (
            <>
              <Metric
                label="Gross profit"
                value={formatCurrency(summary.grossProfit ?? 0)}
                accent
              />
              <Metric
                label="Margin"
                value={
                  summary.margin != null
                    ? formatPercent(summary.margin, 0)
                    : "—"
                }
              />
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={tm.metricCard}>
      <p className={tm.metricLabel}>{label}</p>
      <p className={accent ? tm.metricValueAccent : tm.metricValue}>{value}</p>
    </div>
  );
}

function ActivitySection({
  activity,
}: {
  activity: TeamMemberActivityItem[];
}) {
  return (
    <section className={tm.sectionSurface}>
      <h2 className={tm.sectionTitle}>Recent activity</h2>
      <p className={tm.sectionSubtitle}>Jobs, estimates, and time entries</p>

      {activity.length === 0 ? (
        <div className={`${tm.emptyState} mt-3`}>
          <p className="text-sm font-medium text-[#6B6255]">
            Recent activity will appear here.
          </p>
        </div>
      ) : (
        <ul className={`mt-3 divide-y ${tm.listDivider}`}>
          {activity.map((item) => (
            <li key={item.id}>
              {item.href ? (
                <Link href={item.href} className={tm.listRow}>
                  <ActivityContent item={item} />
                </Link>
              ) : (
                <div className={tm.listRow}>
                  <ActivityContent item={item} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityContent({ item }: { item: TeamMemberActivityItem }) {
  return (
    <div className="min-w-0 flex-1 py-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className={tm.activityType}>
          {ACTIVITY_TYPE_LABELS[item.type]}
        </span>
        <span className={tm.activityLabel}>{item.label}</span>
      </div>
      {item.detail ? (
        <p className={tm.activityDetail}>{item.detail}</p>
      ) : null}
      <p className={tm.activityTime}>{formatDate(item.occurredAt)}</p>
    </div>
  );
}
