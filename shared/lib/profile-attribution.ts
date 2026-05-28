export type ProfileSummary = {
  full_name: string | null;
  email: string;
};

export const TEAM_MEMBER_ATTRIBUTION_LABEL = "Team member";

export type ActivityAttributionMetadata = {
  actor_name?: string;
  technician_name?: string;
  technician_id?: string;
  target_name?: string;
};

function trimOptional(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function formatProfileDisplayName(
  profile: ProfileSummary | null | undefined,
): string | undefined {
  if (!profile) {
    return undefined;
  }

  return trimOptional(profile.full_name) ?? trimOptional(profile.email);
}

export function resolveSubjectAttributionName(input: {
  profile?: ProfileSummary | null;
  subjectUserId?: string | null;
  metadataName?: string | null;
  fallbackLabel?: string;
}): string {
  const fromProfile = formatProfileDisplayName(input.profile);
  if (fromProfile) {
    return fromProfile;
  }

  const metadataName = trimOptional(input.metadataName);
  if (metadataName) {
    return metadataName;
  }

  if (input.subjectUserId) {
    return input.fallbackLabel ?? TEAM_MEMBER_ATTRIBUTION_LABEL;
  }

  return input.fallbackLabel ?? TEAM_MEMBER_ATTRIBUTION_LABEL;
}

export function resolveOptionalSubjectAttributionName(input: {
  profile?: ProfileSummary | null;
  subjectUserId?: string | null;
  metadataName?: string | null;
}): string | undefined {
  const fromProfile = formatProfileDisplayName(input.profile);
  if (fromProfile) {
    return fromProfile;
  }

  const metadataName = trimOptional(input.metadataName);
  if (metadataName) {
    return metadataName;
  }

  if (input.subjectUserId) {
    return TEAM_MEMBER_ATTRIBUTION_LABEL;
  }

  return undefined;
}

function normalizeActivityAttributionMetadata(
  value: unknown,
): ActivityAttributionMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;

  return {
    actor_name:
      typeof record.actor_name === "string" ? record.actor_name : undefined,
    technician_name:
      typeof record.technician_name === "string"
        ? record.technician_name
        : undefined,
    technician_id:
      typeof record.technician_id === "string"
        ? record.technician_id
        : undefined,
    target_name:
      typeof record.target_name === "string" ? record.target_name : undefined,
  };
}

export function resolveActivityActorName(input: {
  profile?: ProfileSummary | null;
  actorId?: string | null;
  metadata?: unknown;
}): string | undefined {
  const fromProfile = formatProfileDisplayName(input.profile);
  if (fromProfile) {
    return fromProfile;
  }

  const metadata = normalizeActivityAttributionMetadata(input.metadata);
  const actorName = trimOptional(metadata?.actor_name);
  if (actorName) {
    return actorName;
  }

  const actorId = trimOptional(input.actorId ?? undefined);
  if (!actorId) {
    return undefined;
  }

  if (
    metadata?.technician_id === actorId &&
    trimOptional(metadata.technician_name)
  ) {
    return trimOptional(metadata.technician_name);
  }

  const targetName = trimOptional(metadata?.target_name);
  if (targetName) {
    return targetName;
  }

  return TEAM_MEMBER_ATTRIBUTION_LABEL;
}

export function resolveAttributionDisplayLabel(input: {
  name?: string | null;
  subjectUserId?: string | null;
  emptyLabel?: string;
}): string {
  const name = trimOptional(input.name ?? undefined);
  if (name) {
    return name;
  }

  if (input.subjectUserId) {
    return TEAM_MEMBER_ATTRIBUTION_LABEL;
  }

  return input.emptyLabel ?? "—";
}
