type ServiceItemsNorthStarCatalogHeadingProps = {
  className?: string;
};

export function ServiceItemsNorthStarCatalogHeading({
  className = "",
}: ServiceItemsNorthStarCatalogHeadingProps) {
  return (
    <div
      className={`shrink-0 border-b border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-3 py-2.5 sm:px-4 lg:px-5 ${className}`}
    >
      <h2 className="text-sm font-bold text-[#17130E]">Service catalog</h2>
      <p className="mt-0.5 text-[11px] leading-snug text-[#6B6255]">
        Reusable services and parts for estimates, invoices, and job materials.
      </p>
    </div>
  );
}
