
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
  const [showLayoutElements, setShowLayoutElements] = useState(true);
  
  // We need to use a state that is managed in the client to avoid hydration errors.
  useEffect(() => {
    const isSimuladoPage = /^\/simulados\/[^/]+(\/)?$/.test(pathname) && !pathname.endsWith('/resultado');
    setShowLayoutElements(!isSimuladoPage);
  }, [pathname]);

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
