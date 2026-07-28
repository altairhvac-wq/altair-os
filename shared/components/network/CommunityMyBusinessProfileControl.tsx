"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Building2, ChevronDown, Pencil } from "lucide-react";
import type { NetworkProfile } from "@/shared/types/network-referral";
import type { CommunityProfileReadiness } from "@/shared/lib/network/community-profile-readiness";
import { st } from "./north-star-m11/network-north-star-styles";

type CommunityMyBusinessProfileControlProps = {
  ownProfile: NetworkProfile | null;
  profileReadiness: CommunityProfileReadiness | null;
  onEditProfile: () => void;
};

export function CommunityMyBusinessProfileControl({
  ownProfile,
  profileReadiness,
  onEditProfile,
}: CommunityMyBusinessProfileControlProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const needsAttention = Boolean(profileReadiness);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleEdit() {
    setOpen(false);
    onEditProfile();
  }

  const locationLine = ownProfile
    ? [ownProfile.city, ownProfile.state, ownProfile.postalCode]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <div ref={panelRef} className="relative shrink-0">
      <button
        type="button"
        className={st.secondaryAction}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <Building2 className="h-4 w-4" aria-hidden="true" />
        <span className="hidden min-[420px]:inline">My Business Profile</span>
        <span className="min-[420px]:hidden">My Profile</span>
        {needsAttention ? (
          <span
            className="inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-[#B88A2E] ring-2 ring-[#FBF7EF]"
            aria-label="Profile needs attention"
          />
        ) : null}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="My Business Profile"
          className="absolute right-0 z-30 mt-1.5 w-[min(18.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[rgba(138,99,36,0.14)] bg-[#FBF7EF] shadow-[0_12px_32px_-12px_rgba(23,19,14,0.28)]"
        >
          <div className="border-b border-[rgba(138,99,36,0.10)] px-3.5 py-3">
            {ownProfile ? (
              <>
                <p className="truncate text-sm font-semibold text-[#17130E]">
                  {ownProfile.displayName}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[#4F4638]">
                  {[ownProfile.tradeType, locationLine].filter(Boolean).join(" · ")}
                </p>
                <p className="mt-2">
                  <span
                    className={
                      ownProfile.isVisible
                        ? st.profileVisibilityPill
                        : st.profileVisibilityPillHidden
                    }
                  >
                    {ownProfile.isVisible
                      ? "Visible in directory"
                      : "Hidden from directory"}
                  </span>
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-[#17130E]">
                  Set up your business profile
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[#4F4638]">
                  Present your business so nearby owners can confidently refer
                  customers to you.
                </p>
              </>
            )}
            {profileReadiness ? (
              <p className="mt-2 text-[11px] leading-snug text-[#8A6324]">
                {profileReadiness.title}
              </p>
            ) : null}
          </div>

          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={handleEdit}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-[#4F4638] transition-colors hover:bg-[#F3EBDD] hover:text-[#17130E]"
            >
              <Pencil className="h-3.5 w-3.5 text-[#8A6324]" aria-hidden="true" />
              {ownProfile
                ? profileReadiness?.ctaLabel ?? "Edit profile"
                : "Set up profile"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
