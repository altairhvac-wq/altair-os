export type DesignLabTheme = {
  id: string;
  companyId: string;
  name: string;
  /**
   * CSS custom property name → value string.
   * Solid colors use the base var (`--north-star-gold`).
   * Optional shine companions use `--north-star-gold--shine` = `linear-gradient(...)`.
   */
  tokens: Record<string, string>;
  /** Design Lab active-draft bookmark (Stage 2). Does not apply chrome live. */
  isActive: boolean;
  /** Promoted to live admin chrome for this company (Stage 3). */
  isLive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
};
