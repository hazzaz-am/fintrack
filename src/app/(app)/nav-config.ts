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
  Repeat,
  HandCoins,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  /** Modules without a screen yet (per PRD §27) render disabled instead of 404ing. */
  enabled: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, enabled: true },
  { label: "Accounts", href: "/accounts", icon: Wallet, enabled: true },
  { label: "Transactions", href: "/transactions", icon: ArrowLeftRight, enabled: true },
  { label: "Income", href: "/income", icon: TrendingUp, enabled: true },
  { label: "Expenses", href: "/expenses", icon: TrendingDown, enabled: true },
  { label: "Savings Goals", href: "/savings-goals", icon: PiggyBank, enabled: true },
  { label: "Investments", href: "/investments", icon: LineChart, enabled: true },
  { label: "Borrowers", href: "/borrowers", icon: HandCoins, enabled: true },
  { label: "Recurring", href: "/recurring-transactions", icon: Repeat, enabled: true },
  { label: "Reports", href: "/reports", icon: ChartColumn, enabled: true },
  { label: "Settings", href: "/settings", icon: Settings, enabled: true },
];
