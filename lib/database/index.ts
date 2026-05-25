export {
  bootstrapCompanyForNewUser,
  ensureOwnerMembershipExists,
  ensureProfileExists,
  getCompanyNameFromUserMetadata,
  getCurrentProfile,
  getCurrentUser,
} from "./auth";
export type { BootstrapCompanyResult } from "./auth";
export {
  getActiveCompanyContext,
  getUserCompanies,
  listUserCompanies,
} from "./company-context";
export { mapAuthError, mapDatabaseError } from "./errors";
