"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  COMMAND_STRIP_PANEL_LABELS,
  type CommandStripPanelId,
} from "@/shared/lib/dashboard-command-strip";
import {
  MobileSheet,
  MobileSheetBody,
  MobileSheetHeader,
  MobileSheetHeaderIcon,
  MobileSheetPanel,
} from "@/shared/components/ui/mobile-sheet";
import { LayoutDashboard } from "lucide-react";

type DashboardDrilldownContextValue = {
  openDashboardPanel: (panelId: CommandStripPanelId) => void;
  closeDashboardPanel: () => void;
  hasPanel: (panelId: CommandStripPanelId) => boolean;
};

const DashboardDrilldownContext =
  createContext<DashboardDrilldownContextValue | null>(null);

export function useDashboardDrilldown(): DashboardDrilldownContextValue {
  const context = useContext(DashboardDrilldownContext);
  if (!context) {
    throw new Error(
      "useDashboardDrilldown must be used within DashboardDrilldownProvider",
    );
  }
  return context;
}

function DashboardDrilldownSheet({
  openPanel,
  onClose,
  panels,
}: {
  openPanel: CommandStripPanelId | null;
  onClose: () => void;
  panels: Partial<Record<CommandStripPanelId, ReactNode>>;
}) {
  const panelContent = openPanel ? panels[openPanel] : null;
  if (!openPanel || !panelContent) {
    return null;
  }

  const panelTitle = COMMAND_STRIP_PANEL_LABELS[openPanel];
  const titleId = `dashboard-command-panel-${openPanel}`;

  return (
    <MobileSheet
      onClose={onClose}
      ariaLabelledBy={titleId}
      variant="responsive"
      zIndex={60}
    >
      <MobileSheetPanel
        maxWidth="2xl"
        maxHeight="90"
        responsiveRounded
        className="pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <MobileSheetHeader
          titleId={titleId}
          title={panelTitle}
          subtitle="Full breakdown from live dashboard data"
          onClose={onClose}
          safeAreaTop
          icon={
            <MobileSheetHeaderIcon className="bg-cyan-100 text-cyan-700">
              <LayoutDashboard className="h-4 w-4" />
            </MobileSheetHeaderIcon>
          }
        />
        <MobileSheetBody unstyled className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:gap-4">{panelContent}</div>
        </MobileSheetBody>
      </MobileSheetPanel>
    </MobileSheet>
  );
}

export function DashboardDrilldownProvider({
  panels,
  children,
}: {
  panels: Partial<Record<CommandStripPanelId, ReactNode>>;
  children: ReactNode;
}) {
  const [openPanel, setOpenPanel] = useState<CommandStripPanelId | null>(null);

  const hasPanel = useCallback(
    (panelId: CommandStripPanelId) => Boolean(panels[panelId]),
    [panels],
  );

  const openDashboardPanel = useCallback(
    (panelId: CommandStripPanelId) => {
      if (panels[panelId]) {
        setOpenPanel(panelId);
      }
    },
    [panels],
  );

  const closeDashboardPanel = useCallback(() => {
    setOpenPanel(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      openDashboardPanel,
      closeDashboardPanel,
      hasPanel,
    }),
    [openDashboardPanel, closeDashboardPanel, hasPanel],
  );

  return (
    <DashboardDrilldownContext.Provider value={contextValue}>
      {children}
      <DashboardDrilldownSheet
        openPanel={openPanel}
        onClose={closeDashboardPanel}
        panels={panels}
      />
    </DashboardDrilldownContext.Provider>
  );
}
