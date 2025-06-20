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
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";

const data = {
  user: {
    name: "admin",
    email: "admin@gmail.com",
    avatar: "",
  },
  team: {
    name: "Wealth Pilot",
    logo: HandCoins,
    plan: "Enterprise",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: GaugeCircle,
      // items: [
      //   {
      //     title: "Overview (Coming soon...)",
      //     url: "/dashboard/overview",
      //   },
      //   {
      //     title: "Client Overview",
      //     url: "/dashboard/client-overview",
      //   },
      //   {
      //     title: "Insights and Trends",
      //     url: "/dashboard/insights-trends",
      //   },
      //   {
      //     title: "Financial Overview",
      //     url: "/dashboard/financial-overview",
      //   },
      //   {
      //     title: "Summary (Coming soon...)",
      //     url: "/dashboard/summary",
      //   },
      // ],
    },
    {
      title: "Clients",
      url: "/clients",
      icon: Users,
      items: [
        {
          title: "Overview",
          url: "/dashboard/client-overview",
        },
        {
          title: "Insights and Trends",
          url: "/dashboard/insights-trends",
        },
        {
          title: "Orders",
          url: "/order-management",
        },
        {
          title: "Structured Products",
          url: "/sp-lifecycle",
          icon: RefreshCw,
        },
        {
          title: "CRM",
          url: "/crm",
          icon: RefreshCw,
        },
        {
          title: "Documents",
          url: "/documents",
          icon: RefreshCw,
        },
        {
          title: "Fee & Billing",
          url: "/fee-bill",
          icon: RefreshCw,
        },
        {
          title: "Settings",
          url: "/client-settings",
          icon: RefreshCw,
        },
      ],
    },
    {
      title: "Documents",
      url: "/documents",
      icon: Files,
    },
    {
      title: "Trade Retrocession",
      url: "/trade-retrocession",
      icon: BarChart3,
    },
    {
      title: "Complience",
      url: "/compliance",
      icon: ShieldCheck,
    },
    // {
    //   title: "SP LifeCycle",
    //   url: "/sp-lifecycle",
    //   icon: RefreshCw,
    // },
    // {
    //   title: "Order Management",
    //   url: "/order-management",
    //   icon: ArrowRightLeft,
    // },
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
