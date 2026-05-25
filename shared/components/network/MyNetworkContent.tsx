import type { PartnerCompany } from "@/shared/types/network";
import { NetworkEmptyState } from "./NetworkEmptyState";
import { PartnerCompanyCard } from "./PartnerCompanyCard";
import { PartnerInviteQrCard } from "./PartnerInviteQrCard";

type MyNetworkContentProps = {
  partners: PartnerCompany[];
  selectedPartnerId: string | null;
  hasNoData: boolean;
  hasNoResults: boolean;
  onSelectPartner: (partnerId: string) => void;
  onAddPartner?: () => void;
};

export function MyNetworkContent({
  partners,
  selectedPartnerId,
  hasNoData,
  hasNoResults,
  onSelectPartner,
  onAddPartner,
}: MyNetworkContentProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4 p-4">
      <PartnerInviteQrCard />

      {hasNoData ? (
        <NetworkEmptyState variant="no-partners" onAddPartner={onAddPartner} />
      ) : hasNoResults ? (
        <NetworkEmptyState variant="no-results" />
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 @xl:grid-cols-2">
          {partners.map((partner) => (
            <PartnerCompanyCard
              key={partner.id}
              partner={partner}
              selected={partner.id === selectedPartnerId}
              onSelect={() => onSelectPartner(partner.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
