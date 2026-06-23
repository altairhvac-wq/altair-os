"use client";

import { useState } from "react";
import {
  DESIGN_LAB_CANVAS_DEMO_PAGES,
  DesignLabCanvasDemoContent,
  type DesignLabCanvasDemoPageId,
} from "@/shared/components/platform-admin/design-lab/DesignLabCanvasDemoContent";
import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import { designLabPreviewVars } from "@/shared/components/platform-admin/design-lab/design-lab-preview-vars";

type DesignLabFullPageCanvasProps = {
  colors: DesignLabColors;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
};

export function DesignLabFullPageCanvas({
  colors,
  selectedTargetId,
  onSelectTarget,
}: DesignLabFullPageCanvasProps) {
  const [activeDemoPage, setActiveDemoPage] =
    useState<DesignLabCanvasDemoPageId>("dashboard");

  function handleNavClick(pageId: DesignLabCanvasDemoPageId) {
    setActiveDemoPage(pageId);
  }

  return (
    <div
      className="design-lab-preview min-h-full"
      style={designLabPreviewVars(colors)}
    >
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <aside
          className="hidden w-52 shrink-0 flex-col border-r sm:flex lg:w-56"
          style={{
            backgroundColor: "var(--dl-card-bg)",
            borderColor: "var(--dl-card-border)",
          }}
          aria-label="Demo workspace navigation"
        >
          <div
            className="border-b px-4 py-4"
            style={{ borderColor: "var(--dl-card-border)" }}
          >
            <p
              className="text-sm font-bold"
              style={{ color: "var(--dl-heading-text)" }}
            >
              Altair HVAC
            </p>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--dl-muted-text)" }}>
              Demo workspace
            </p>
          </div>
          <nav className="flex-1 px-2 py-3">
            <ul className="space-y-0.5" role="tablist" aria-label="Demo pages">
              {DESIGN_LAB_CANVAS_DEMO_PAGES.map((page) => {
                const isActive = activeDemoPage === page.id;

                return (
                  <li key={page.id}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleNavClick(page.id);
                      }}
                      className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: isActive ? "var(--dl-page-bg)" : "transparent",
                        color: "var(--dl-body-text)",
                      }}
                    >
                      {page.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6"
            style={{
              backgroundColor: "var(--dl-card-bg)",
              borderColor: "var(--dl-card-border)",
            }}
          >
            <div className="min-w-0">
              <p
                className="truncate text-sm font-semibold"
                style={{ color: "var(--dl-body-text)" }}
              >
                Workspace
              </p>
              <p className="truncate text-[11px]" style={{ color: "var(--dl-muted-text)" }}>
                Tuesday · Design Lab canvas
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                className="hidden rounded-lg border px-2.5 py-1.5 text-xs sm:inline"
                style={{
                  backgroundColor: "var(--dl-page-bg)",
                  borderColor: "var(--dl-card-border)",
                  color: "var(--dl-muted-text)",
                }}
              >
                Search jobs…
              </span>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{
                  backgroundColor: "var(--dl-warning-bg)",
                  color: "var(--dl-body-text)",
                }}
              >
                3 alerts
              </span>
            </div>
          </header>

          <DesignLabEditableTarget
            targetId="page-background"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectTarget}
            className="flex-1 px-4 py-6 pb-[min(45vh,18rem)] sm:px-6 sm:pb-6 sm:pr-[min(22rem,calc(100%-1rem))] lg:px-8 lg:py-8"
            style={{ backgroundColor: "var(--dl-page-bg)" }}
          >
            <DesignLabCanvasDemoContent
              pageId={activeDemoPage}
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
            />
          </DesignLabEditableTarget>
        </div>
      </div>
    </div>
  );
}
