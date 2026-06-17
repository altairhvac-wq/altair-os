import {
  BarChart3,
  BookOpen,
  Briefcase,
  Clock,
  DollarSign,
  FileText,
  LayoutDashboard,
  Network,
  Receipt,
  Settings,
  Shield,
  Target,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type ColorLabNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type ColorLabNavGroup = {
  id: string;
  label: string;
  items: ColorLabNavItem[];
};

export const colorLabNavGroups: ColorLabNavGroup[] = [
  {
    id: "command",
    label: "Overview",
    items: [
      { label: "Operating Center", href: "/altair-shell-color-lab-v1", icon: LayoutDashboard },
      { label: "Reports", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    id: "work",
    label: "Work",
    items: [
      { label: "Jobs", href: "/jobs", icon: Briefcase },
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
      { label: "Expenses", href: "/expenses", icon: DollarSign },
      { label: "Labor & payroll", href: "/time", icon: Clock },
    ],
  },
  {
    id: "relationships",
    label: "Relationships",
    items: [
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Leads", href: "/leads", icon: Target },
      { label: "Network", href: "/network", icon: Network },
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

export const colorLabConceptRoute = "/altair-shell-color-lab-v1";
