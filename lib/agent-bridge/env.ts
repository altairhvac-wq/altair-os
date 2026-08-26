import "server-only";

import { isAuthorizedBearerRequest } from "@/lib/operations/bearer-auth";

/**
 * Configuration for the Agent Platform bridge.
 *
 * THE PLATFORM PUSHES; THIS DEPLOYMENT NEVER CALLS OUT. The Agent Platform
 * runs on the founder's machine behind NAT, so every message is
 * platform-initiated. All this side needs is a shared bearer secret and the
 * identity mapping described below.
 *
 * TWO ID SPACES, MAPPED EXPLICITLY. The Agent Platform identifies a company
 * by a configured slug (`ALTAIR_COMPANY_ID`, e.g. "altair"). This database
 * identifies one by a uuid in `public.companies`. They are not the same
 * value and must never be conflated, so the mapping is configuration:
 *
 *   AGENT_PLATFORM_COMPANY_ID  the slug the platform will send
 *   AGENT_INGEST_COMPANY_ID    the companies.id uuid it maps to here
 *
 * The route binds the company SERVER-SIDE from these values and merely
 * checks the payload agrees. A payload can never choose which company it is
 * written to.
 *
 * THE SECRET NEVER REACHES A BROWSER. This module is `server-only`, the
 * value is read from the environment, and no Server Component, Server
 * Action, or API response returns it.
 */

const INGEST_SECRET_ENV = "AGENT_INGEST_SECRET";
const PLATFORM_COMPANY_ENV = "AGENT_PLATFORM_COMPANY_ID";
const INGEST_COMPANY_ENV = "AGENT_INGEST_COMPANY_ID";

export function getAgentIngestSecret(): string | null {
  const raw = process.env[INGEST_SECRET_ENV]?.trim();
  return raw || null;
}

export function getAgentPlatformCompanyId(): string | null {
  const raw = process.env[PLATFORM_COMPANY_ENV]?.trim();
  return raw || null;
}

export function getAgentIngestCompanyId(): string | null {
  const raw = process.env[INGEST_COMPANY_ENV]?.trim();
  return raw || null;
}

export function isAgentBridgeConfigured(): boolean {
  return Boolean(
    getAgentIngestSecret() &&
      getAgentPlatformCompanyId() &&
      getAgentIngestCompanyId(),
  );
}

export function getMissingAgentBridgeEnvVars(): string[] {
  const missing: string[] = [];
  if (!getAgentIngestSecret()) missing.push(INGEST_SECRET_ENV);
  if (!getAgentPlatformCompanyId()) missing.push(PLATFORM_COMPANY_ENV);
  if (!getAgentIngestCompanyId()) missing.push(INGEST_COMPANY_ENV);
  return missing;
}

/**
 * Agent bridge authorization.
 *
 * The constant-time comparison this used to carry privately now lives in
 * lib/operations/bearer-auth.ts and is shared with the cron routes, so there
 * is one bearer check to review rather than two. The shared version is also
 * strictly stronger: it hashes both values to a fixed 32 bytes before
 * comparing, so it does not leak the configured secret's length the way the
 * previous early length check did.
 */
export function isAuthorizedAgentRequest(request: Request): boolean {
  return isAuthorizedBearerRequest(request, getAgentIngestSecret());
}
