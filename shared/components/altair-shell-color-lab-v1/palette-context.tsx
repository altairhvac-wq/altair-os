"use client";

import { createContext, useContext, type ReactNode } from "react";
import { missionControlRefined, type PaletteTokens } from "./palette-tokens";

const PaletteContext = createContext<PaletteTokens>(missionControlRefined);

type PaletteProviderProps = {
  palette: PaletteTokens;
  children: ReactNode;
};

export function PaletteProvider({ palette, children }: PaletteProviderProps) {
  return <PaletteContext.Provider value={palette}>{children}</PaletteContext.Provider>;
}

export function usePaletteTokens(): PaletteTokens {
  return useContext(PaletteContext);
}
