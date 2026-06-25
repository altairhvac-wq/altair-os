export {
  bootstrapCompanyForNewUser,
  ensureOwnerMembershipExists,
  ensureProfileExists,
  getCompanyNameFromUserMetadata,
  getTradeFromUserMetadata,
  getCurrentProfile,
  getCurrentUser,
} from "./auth";
export type { BootstrapCompanyResult } from "./auth";
export {
  getActiveCompanyContext,
  getUserCompanies,
  listUserCompanies,
} from "./company-context";
export {
  createCustomer,
  getCustomerById,
  listCustomers,
  mapCustomerFormDataToInsert,
  mapCustomerRowToCustomer,
} from "./queries/customers";
export { mapAuthError, mapDatabaseError } from "./errors";
