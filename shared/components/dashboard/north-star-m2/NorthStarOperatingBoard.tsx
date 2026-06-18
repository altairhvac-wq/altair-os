"use client";

import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { northStarTokens as t } from "@/shared/design-system/north-star/tokens";
import { buildNorthStarBoardContent } from "@/shared/lib/dashboard-north-star-board";
import type { DashboardData } from "@/shared/types/dashboard";
import { NorthStarActionColumn } from "./NorthStarActionColumn";
import { NorthStarMoneyColumn } from "./NorthStarMoneyColumn";
import { NorthStarWorkColumn } from "./NorthStarWorkColumn";

type NorthStarOperatingBoardProps = {
  data: DashboardData;
};

export function NorthStarOperatingBoard({ data }: NorthStarOperatingBoardProps) {
  const board = useMemo(() => buildNorthStarBoardContent(data), [data]);

  return (
    <section aria-label="Operating board" className={t.operatingBoard}>
      <div aria-hidden="true" className={t.boardTopAccent} />

      <div className={t.boardHeader}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className={t.eyebrowAccent}>Operating board</p>
            <h2 className={`mt-1 ${t.boardTitle}`}>Action · Work · Money</h2>
            <p className={`mt-1 max-w-2xl ${t.darkSurfaceMuted}`}>
              Live operating loop from today&apos;s dispatch, office queues, and billing
              rollups.
            </p>
          </div>
          {board.connections.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {board.connections.map((link) => (
                <div key={link.id} className={t.connectionChip}>
                  <span>{link.from}</span>
                  <ArrowRight className={t.connectionArrow} aria-hidden="true" />
                  <span>{link.to}</span>
                  <span className={`hidden ${t.lightCardMeta} sm:inline`}>
                    · {link.note}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid lg:grid-cols-3">
        <NorthStarActionColumn content={board.action} data={data} />
        <NorthStarWorkColumn content={board.work} data={data} />
        <NorthStarMoneyColumn content={board.money} data={data} />
      </div>
    </section>
  );
}
