import { useEffect, useRef, useState } from "react";
import {
  createEmptyNetworkPartnerMutations,
  mergeMyNetworkPartnersFromServer,
  reconcileNetworkPartnerMutations,
  registerNetworkPartnerAdd,
  registerNetworkPartnerRemove,
  removeNetworkPartnerByLinkedCompanyId,
  upsertActiveNetworkPartner,
  type NetworkPartner,
  type NetworkPartnerMutations,
} from "@/shared/types/network-partner";

export function useMyNetworkPartnersState(
  initialMyNetworkPartners: NetworkPartner[],
  companyId: string,
) {
  const mutationsRef = useRef<NetworkPartnerMutations>(
    createEmptyNetworkPartnerMutations(),
  );
  const [myNetworkPartners, setMyNetworkPartners] = useState(
    initialMyNetworkPartners,
  );

  useEffect(() => {
    mutationsRef.current = createEmptyNetworkPartnerMutations();
    setMyNetworkPartners(initialMyNetworkPartners);
  }, [companyId]);

  useEffect(() => {
    mutationsRef.current = reconcileNetworkPartnerMutations(
      mutationsRef.current,
      initialMyNetworkPartners,
    );
    setMyNetworkPartners(
      mergeMyNetworkPartnersFromServer(
        initialMyNetworkPartners,
        mutationsRef.current,
      ),
    );
  }, [initialMyNetworkPartners]);

  function applyAddPartner(partner: NetworkPartner) {
    mutationsRef.current = registerNetworkPartnerAdd(
      mutationsRef.current,
      partner,
    );
    setMyNetworkPartners((current) =>
      upsertActiveNetworkPartner(current, partner),
    );
  }

  function applyRemovePartner(linkedCompanyId: string) {
    mutationsRef.current = registerNetworkPartnerRemove(
      mutationsRef.current,
      linkedCompanyId,
    );
    setMyNetworkPartners((current) =>
      removeNetworkPartnerByLinkedCompanyId(current, linkedCompanyId),
    );
  }

  return { myNetworkPartners, applyAddPartner, applyRemovePartner };
}
