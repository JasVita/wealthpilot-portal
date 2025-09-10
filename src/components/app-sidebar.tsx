"use client";

import * as React from "react";
import {
  Bot,
  GaugeCircle,
  Settings,
  HandCoins,
  BarChart3,
  ArrowRightLeft,
  RefreshCw,
  Info,
  Users,
  Files,
  ShieldCheck,
  UserCog,
  LineChart,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import Image from "next/image";

const data = {
  user: {
    name: "admin",
    email: "admin@gmail.com",
    avatar: "",
  },
  team: {
    name: "Wealth Pilot",
    logo: () => <Image src="/WP_logo.svg" alt="Logo" width={80} height={80} />,
    plan: "Enterprise",
  },
  navMain: [
    {
      title: "Clients Dashboard",
      url: "/clients-dashboard",
      icon: UserCog,
    },
    {
      title: "Clients",
      // url: "/",
      url: "/clients",
      icon: Users,
      // items: [
      //   {
      //     title: "Overview",
      //     url: "/clients/overview",
      //   },
      //   {
      //     title: "Insights and Trends",
      //     url: "/clients/insights-trends",
      //   },
      //   {
      //     title: "Transaction History",
      //     url: "/clients/transaction-history",
      //   },
      //   {
      //     title: "Structured Products",
      //     url: "/clients/sp",
      //   },
      //   {
      //     title: "CRM",
      //     url: "/clients/crm",
      //   },
      //   {
      //     title: "Documents",
      //     url: "/clients/documents",
      //   },
      //   {
      //     title: "Fee & Billing",
      //     url: "/clients/fee-bill",
      //   },
      //   {
      //     title: "Settings",
      //     url: "/clients/settings",
      //   },
      // ],
    },
    // {
    //   title: "Trades (Draft)",
    //   url: "/trades",        // optional parent anchor
    //   icon: BarChart3,
    //   items: [
    //     // ✔ no client id here; the entry page will redirect using currClient
    //     { title: "Daily Transactions", url: "/trades/daily-transactions" },
    //   ],
    // },
    {
      title: "Trades (Draft)",
      url: "/trades",           // optional; can be "#" or omitted if you don’t want parent clickable
      icon: BarChart3,
      items: [
        { title: "Daily Transactions", url: "/trades/daily-transactions" },
        { title: "Daily Holdings",     url: "/trades/daily-holdings" },
      ],
    },
    {
      title: "Insights",
      url: "/insights",
      icon: LineChart,
    },
    {
      title: "Trade Retrocession",
      url: "/trade-retrocession",
      icon: BarChart3,
    },
    {
      title: "Compliance",
      url: "/compliance",
      icon: ShieldCheck,
    },
    {
      title: "AI Assistant",
      url: "/ai-assistant",
      icon: Bot,
    },
    {
      title: "About Us",
      url: "/about-us",
      icon: Info,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher team={data.team} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
