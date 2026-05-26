export function listDetailPanelClass(isActive: boolean): string {
  return isActive ? "order-1 flex lg:order-2" : "hidden lg:flex";
}

export const listDetailListSectionClassName = "order-2 lg:order-1";
