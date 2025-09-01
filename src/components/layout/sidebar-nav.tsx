"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  BookCopy, 
  FileText, 
  Target, 
  History, 
  Settings 
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Logo } from "../logo";
import { useSidebar } from "@/components/ui/sidebar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/taxonomia", label: "Taxonomia", icon: BookCopy },
  { href: "/questoes", label: "Questões", icon: FileText },
  { href: "/simulados", label: "Simulados", icon: Target },
  { href: "/revisao", label: "Revisão", icon: History },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { state } = useSidebar();
  
  const isCollapsed = state === "collapsed";

  return (
    <div className={cn("flex h-full flex-col", isCollapsed ? "items-center" : "items-start")}>
      <SidebarHeader className={cn("p-4", isCollapsed ? "p-2" : "p-4")}>
        <Logo className={isCollapsed ? "hidden" : "flex"}/>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={{ children: item.label, side: "right", align: "center"}}
                >
                  <a>
                    <item.icon className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 mt-auto">
        {/* Can add user profile here later */}
      </SidebarFooter>
    </div>
  );
}
