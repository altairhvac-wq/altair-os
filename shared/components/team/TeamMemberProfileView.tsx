"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft } from "lucide-react";
import {
  updateMemberAvailabilityAction,
  updateMemberCertificationsAction,
  updateMemberNotesAction,
} from "@/app/actions/team-member-profile";
import { updateMemberSpecialtiesAction } from "@/app/actions/memberships";
import {
  shouldShowMemberSpecialties,
  TeamMemberSpecialtiesField,
} from "@/shared/components/settings/TeamMemberSpecialtiesField";
import { ProfileMembershipStatusBadge } from "./ProfileMembershipStatusBadge";
import { TeamMemberActivityCard } from "./TeamMemberActivityCard";
import { TeamMemberProfitabilityCard } from "./TeamMemberProfitabilityCard";
import { TeamMemberSummaryCard } from "./TeamMemberSummaryCard";
import {
  adminCardSectionClass,
  adminEmptyWrapClass,
  adminFormActionsClass,
  adminFormInputClass,
  adminFormLabelClass,
  adminMetaLabelClass,
  adminMetaRowClass,
  adminPageStackClass,
} from "@/shared/lib/admin-density";
import { formatDate } from "@/shared/types/customer";
import {
  formatTeamMemberRole,
  getTeamMemberInitials,
} from "@/shared/types/team-member";
import type {
  TeamMemberActivityItem,
  TeamMemberProfile,
  TeamMemberWorkSummary,
} from "@/shared/types/team-member-profile";
import type { TechnicianSpecialty } from "@/shared/types/technician-specialties";

type TeamMemberProfileViewProps = {
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

export function TeamMemberProfileView({
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
}: TeamMemberProfileViewProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [notesInput, setNotesInput] = useState(profile.memberNotes ?? "");
  const [certificationInput, setCertificationInput] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showSpecialties = shouldShowMemberSpecialties(profile.role);
  const startDate = profile.joinedAt ?? profile.createdAt;

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

  return (
    <div className={`mx-auto max-w-5xl ${adminPageStackClass}`}>
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      {feedback ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {profile.status === "invited" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This member has a pending invite. Some profile details will appear
          after they accept.
        </div>
      ) : null}

      {profile.status === "suspended" ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          This member is inactive. Profile edits are disabled until access is
          restored.
        </div>
      ) : null}

      <section className={adminCardSectionClass}>
        <div className="flex flex-wrap items-start gap-3">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-base font-bold text-white">
              {getTeamMemberInitials(profile.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-slate-900">{profile.name}</h1>
            <p className="text-sm font-medium text-slate-600">
              {formatTeamMemberRole(profile.role)}
            </p>
            <div className="mt-2">
              <ProfileMembershipStatusBadge status={profile.status} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-2.5 lg:grid-cols-2">
        <div className="space-y-2.5">
          <section className={adminCardSectionClass}>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              Company Information
            </h2>
            <dl className="space-y-2">
              <InfoRow label="Full Name" value={profile.name} />
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Phone" value={profile.phone ?? "—"} />
              <InfoRow
                label="Role"
                value={formatTeamMemberRole(profile.role)}
              />
              <InfoRow label="Start Date" value={formatDate(startDate)} />
              <InfoRow
                label="Status"
                value={
                  <ProfileMembershipStatusBadge status={profile.status} />
                }
              />
            </dl>

            {canViewNotes ? (
              <div className="mt-3 border-t border-slate-100 pt-3">
                <label htmlFor="member-notes" className={adminFormLabelClass}>
                  Notes
                </label>
                {canEdit ? (
                  <>
                    <textarea
                      id="member-notes"
                      value={notesInput}
                      onChange={(event) => setNotesInput(event.target.value)}
                      rows={3}
                      maxLength={2000}
                      disabled={isPending}
                      placeholder="Optional internal notes"
                      className={`${adminFormInputClass} min-h-[88px] resize-y`}
                    />
                    <div className={`${adminFormActionsClass} mt-2`}>
                      <button
                        type="button"
                        onClick={handleNotesSave}
                        disabled={isPending}
                        className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Save notes
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-slate-700">
                    {profile.memberNotes?.trim() || "—"}
                  </p>
                )}
              </div>
            ) : null}
          </section>

          {showSpecialties ? (
            <section className={adminCardSectionClass}>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">
                Technician Information
              </h2>
              <p className="mb-2 text-xs text-slate-500">Specialties</p>
              <TeamMemberSpecialtiesField
                specialties={profile.technicianSpecialties}
                canEdit={canEditSpecialties}
                disabled={isPending}
                onChange={handleSpecialtiesChange}
              />
            </section>
          ) : null}

          <section className={adminCardSectionClass}>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              Certifications
            </h2>
            {profile.certifications.length === 0 ? (
              <div className={adminEmptyWrapClass}>
                <p className="text-sm text-slate-500">Add certifications.</p>
              </div>
            ) : (
              <ul className="mb-2 flex flex-wrap gap-2">
                {profile.certifications.map((certification) => (
                  <li
                    key={certification}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm text-slate-700"
                  >
                    {certification}
                    {canEdit ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRemoveCertification(certification)}
                        className="ml-1 text-slate-400 hover:text-rose-600 disabled:opacity-60"
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
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={certificationInput}
                  onChange={(event) => setCertificationInput(event.target.value)}
                  placeholder="EPA 608"
                  maxLength={100}
                  disabled={isPending}
                  className={`${adminFormInputClass} min-w-0 flex-1`}
                />
                <button
                  type="button"
                  onClick={handleAddCertification}
                  disabled={isPending || !certificationInput.trim()}
                  className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Add
                </button>
              </div>
            ) : null}
          </section>
        </div>

        <div className="space-y-2.5">
          {canViewProfitability ? (
            <TeamMemberProfitabilityCard
              membershipId={membershipId}
              profile={profile}
              canEdit={canEditProfitability}
              onProfileUpdated={setProfile}
              onError={(message) => showMessage("error", message)}
              onSuccess={(message) => showMessage("success", message)}
            />
          ) : null}

          {canViewWorkSummary ? (
            <TeamMemberSummaryCard
              summary={workSummary}
              isPendingInvite={profile.status === "invited" && !profile.userId}
            />
          ) : null}

          <TeamMemberActivityCard activity={activity} />

          <section className={adminCardSectionClass}>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              Availability
            </h2>
            <div className="space-y-3">
              <ToggleRow
                label="Available for dispatch"
                checked={profile.availableForDispatch}
                disabled={!canEdit || isPending}
                onChange={(value) =>
                  handleAvailabilityChange("availableForDispatch", value)
                }
              />
              <ToggleRow
                label="Emergency On-Call"
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
    </div>
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
    <div className={adminMetaRowClass}>
      <dt className={adminMetaLabelClass}>{label}</dt>
      <dd className="text-sm text-slate-800">{value}</dd>
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
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
          checked ? "bg-cyan-600" : "bg-slate-200"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}
