
"use client";

import React from "react";
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { SidebarNav } from "./sidebar-nav";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { useIsMobile } from "@/hooks/use-mobile";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/providers/auth-provider";
import { Skeleton } from "../ui/skeleton";

function LoadingSkeleton() {
  return (
    <div className="flex h-screen w-full">
      <div className="hidden md:flex flex-col gap-4 border-r bg-muted/40 p-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="flex-1">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <div className="flex-1" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-32" />
        </header>
        <main className="p-6">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-48 w-full" />
        </main>
      </div>
    </div>
  );
}


export function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!user) {
    return <>{children}</>;
  }

  return <LayoutContent>{children}</LayoutContent>;
}


function LayoutContent({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <Sidebar collapsible="icon">
        <SidebarNav />
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
            {children}
        </main>
        {isMobile && <div className="h-16" />} 
      </SidebarInset>
      <MobileNav />
      <Toaster />
    </SidebarProvider>
  )
}
