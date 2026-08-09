"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(
    null,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const needsAttention = Boolean(profileReadiness);

  // The dropdown is rendered in a portal (see below) specifically to escape
  // the page header's `overflow: hidden` rounded-corner clipping
  // (.north-star-page-header, app/globals.css) — without this, the menu was
  // invisible/cut off at the header's bottom edge. Position is computed from
  // the trigger button's viewport rect and kept in sync on scroll/resize
  // while open.
  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      setMenuPosition({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
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

  // `open` can only become true from a click handler, so we're guaranteed
  // to be on the client (document.body is safe) whenever this renders.
  const menu =
    open && menuPosition
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="My Business Profile"
            style={{
              position: "fixed",
              top: menuPosition.top,
              right: menuPosition.right,
              zIndex: 9999,
            }}
            className="w-[min(18.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[rgba(138,99,36,0.14)] bg-[#FBF7EF] shadow-[0_12px_32px_-12px_rgba(23,19,14,0.28)]"
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
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
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

      {menu}
    </div>
  );
}
