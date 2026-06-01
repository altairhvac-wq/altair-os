"use client";

import { GitBranch } from "lucide-react";
import { DispatchSectionSheet } from "@/shared/components/dispatch/DispatchSectionSheet";
import type { TeamMember } from "@/shared/types/team-member";
import { CompanyOrgTree } from "./CompanyOrgTree";

type CompanyOrgTreeSheetProps = {
  open: boolean;
  onClose: () => void;
  members: readonly TeamMember[];
};

export function CompanyOrgTreeSheet({
  open,
  onClose,
  members,
}: CompanyOrgTreeSheetProps) {
  return (
    <DispatchSectionSheet
      open={open}
      onClose={onClose}
      title="Company organization tree"
      titleId="company-org-tree-title"
      subtitle="Reporting relationships within your workspace"
      icon={<GitBranch className="h-5 w-5" aria-hidden="true" />}
      iconClassName="bg-cyan-100 text-cyan-700"
      maxWidth="2xl"
    >
      <CompanyOrgTree members={members} />
    </DispatchSectionSheet>
  );
}
