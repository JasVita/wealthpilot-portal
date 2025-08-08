"use client";
import { ChevronRight, Lock, type LucideIcon } from "lucide-react";
import Link from "next/link";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./ui/collapsible";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const lockedTitles = ["CRM", "Fee & Billing", "Settings", "Trade Retrocession", "Compliance"] as const;
  return (
    <SidebarGroup>
      <SidebarMenu className="gap-2">
        {items.map((item) =>
          item.items && item.items.length > 0 ? (
            <Collapsible key={item.title} asChild defaultOpen={item.isActive} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.url}>
                        <Link href={subItem.url} className="w-full">
                          <SidebarMenuSubButton asChild>
                            <span className="flex items-center gap-1">
                              {subItem.title}
                              {lockedTitles.includes(subItem.title as any) && <Lock className="h-4 w-4 opacity-60" />}
                            </span>
                          </SidebarMenuSubButton>
                        </Link>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          ) : (
            <SidebarMenuItem key={item.url}>
              <Link href={item.url} className="w-full">
                <SidebarMenuButton tooltip={item.title} className="w-full justify-start">
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  {lockedTitles.includes(item.title as any) && <Lock className="h-4 w-4 opacity-60" />}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
