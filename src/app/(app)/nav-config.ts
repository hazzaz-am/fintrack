import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  LineChart,
  ChartColumn,
  Settings,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  /** Modules without a screen yet (per PRD §27) render disabled instead of 404ing. */
  enabled: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, enabled: false },
  { label: "Accounts", href: "/accounts", icon: Wallet, enabled: true },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight, enabled: false },
  { label: "Income", href: "/income", icon: TrendingUp, enabled: false },
  { label: "Expenses", href: "/expenses", icon: TrendingDown, enabled: false },
  { label: "Savings Goals", href: "/savings-goals", icon: PiggyBank, enabled: false },
  { label: "Investments", href: "/investments", icon: LineChart, enabled: false },
  { label: "Reports", href: "/reports", icon: ChartColumn, enabled: false },
  { label: "Settings", href: "/settings", icon: Settings, enabled: false },
];
