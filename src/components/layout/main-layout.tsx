
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

function SimuladoLayoutManager({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { setOpen, setOpenMobile, isMobile } = useSidebar();
    const [showLayoutElements, setShowLayoutElements] = useState(true);

    useEffect(() => {
        const isSimuladoPage = /^\/simulados\/[^/]+(\/)?$/.test(pathname) && !pathname.endsWith('/resultado');
        setShowLayoutElements(!isSimuladoPage);

        if (isSimuladoPage) {
            if (!isMobile) {
                setOpen(false); // Collapse on desktop
            }
            setOpenMobile(false); // Ensure it's closed on mobile
        }
    }, [pathname, isMobile, setOpen, setOpenMobile]);


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

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <Sidebar collapsible="icon">
        <SidebarNav />
      </Sidebar>
      <SimuladoLayoutManager>{children}</SimuladoLayoutManager>
      <MobileNav />
    </SidebarProvider>
  )
}
