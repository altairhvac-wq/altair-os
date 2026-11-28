import { createElement } from "react";
import {
  AirVent,
  Bug,
  Building2,
  ClipboardCheck,
  Droplet,
  DoorClosed,
  Fence,
  Flame,
  Hammer,
  HardHat,
  KeyRound,
  Layers,
  LayoutGrid,
  Leaf,
  PaintRoller,
  Shield,
  Shovel,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
  Trash2,
  Truck,
  WashingMachine,
  Waves,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { TradeType } from "@/shared/types/network";

/**
 * One small line icon per trade, drawn in the directory's brass. It gives a
 * business without a logo a mark that says what it does, and the trade chips
 * a little character, without adding colors to the page (owner, 2026-11-23:
 * "more character", but the multi-color version was too much).
 */
const TRADE_ICONS: Partial<Record<TradeType, LucideIcon>> = {
  HVAC: AirVent,
  Plumbing: Droplet,
  Electrical: Zap,
  "General Contracting": HardHat,
  "Cleaning Services": Sparkles,
  "Janitorial Services": Sparkles,
  "Carpet Cleaning": Sparkles,
  "Window Cleaning": Sparkles,
  "Pressure Washing": Waves,
  Landscaping: Leaf,
  "Lawn Care": Sprout,
  Roofing: HardHat,
  Painting: PaintRoller,
  Flooring: LayoutGrid,
  "Handyman Services": Hammer,
  "Pest Control": Bug,
  Restoration: Building2,
  "Water Damage Restoration": Waves,
  "Fire and Smoke Restoration": Flame,
  "Property Management": Building2,
  "Real Estate": Building2,
  "Appliance Repair": WashingMachine,
  "Garage Door Services": DoorClosed,
  Locksmith: KeyRound,
  "Pool and Spa Services": Waves,
  "Moving Services": Truck,
  "Junk Removal": Trash2,
  "Home Inspection": ClipboardCheck,
  "Concrete and Masonry": Layers,
  Excavation: Shovel,
  Fencing: Fence,
  Drywall: Layers,
  Insulation: Thermometer,
  Solar: Sun,
  "Security Systems": Shield,
};

export function tradeIcon(trade: string | null | undefined): LucideIcon {
  return (trade && TRADE_ICONS[trade as TradeType]) || Wrench;
}

/** The trade's icon as an element (a lookup, not a component made during render). */
export function TradeIcon({ trade, className, strokeWidth }: { readonly trade: string | null | undefined; readonly className?: string; readonly strokeWidth?: number }) {
  return createElement(tradeIcon(trade), { "aria-hidden": true, className, strokeWidth });
}
