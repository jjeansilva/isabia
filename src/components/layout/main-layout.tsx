
"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { SidebarNav } from "./sidebar-nav";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";

function SimuladoLayoutManager({ children, showLayoutElements }: { children: React.ReactNode, showLayoutElements: boolean }) {
    const { isMobile } = useSidebar();

    return (
        <SidebarInset className="flex flex-col">
            {showLayoutElements && <Header />}
            <main className="flex-1 p-4 md:p-6 lg:p-8">
                {children}
            </main>
            {isMobile && <div className="h-16" />} 
        </SidebarInset>
    )
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  
  // Directly calculate layout visibility based on the current path.
  // This avoids state updates during render that can cause lifecycle errors.
  const isSimuladoExecutionPage = /^\/simulados\/[^/]+(\/)?$/.test(pathname) && !pathname.endsWith('/resultado');
  const showLayoutElements = !isSimuladoExecutionPage;

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <Sidebar collapsible="icon">
        <SidebarNav />
      </Sidebar>
      <SimuladoLayoutManager showLayoutElements={showLayoutElements}>
        {children}
      </SimuladoLayoutManager>
      <MobileNav />
    </SidebarProvider>
  )
}
