import {
  BarChart3,
  BookOpen,
  Briefcase,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  LayoutDashboard,
  Network,
  Receipt,
  Settings,
  Shield,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type MissionNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type MissionNavGroup = {
  id: string;
  label: string;
  items: MissionNavItem[];
};

export const missionNavGroups: MissionNavGroup[] = [
  {
    id: "command",
    label: "Command",
    items: [
      { label: "Mission Control", href: "/altair-shell-north-star-v2", icon: LayoutDashboard },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    id: "work",
    label: "Work",
    items: [
      { label: "Work", href: "/work", icon: Briefcase },
      { label: "Dispatch", href: "/dispatch", icon: Truck },
      { label: "Estimates", href: "/estimates", icon: FileText },
      { label: "Price Book", href: "/price-book", icon: BookOpen },
    ],
  },
  {
    id: "money",
    label: "Money",
    items: [
      { label: "Invoices", href: "/invoices", icon: Receipt },
      { label: "Payments", href: "/payments", icon: CreditCard },
      { label: "Expenses", href: "/expenses", icon: DollarSign },
      { label: "Labor & payroll", href: "/time", icon: Clock },
    ],
  },
  {
    id: "relationships",
    label: "Relationships",
    items: [
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Community", href: "/network", icon: Network },
    ],
  },
  {
    id: "company",
    label: "Company",
    items: [
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Platform", href: "/platform", icon: Shield },
    ],
  },
];

export const missionConceptRoute = "/altair-shell-north-star-v2";
