
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  PlusCircle,
  Upload,
  LogOut
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/providers/auth-provider";

export function Header() {
  const isMobile = useIsMobile();
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-2 xs:gap-4 border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
      </div>
      
      <div className="flex w-full items-center justify-end gap-1 xs:gap-2 md:ml-auto">
        <Button variant="outline" size="sm" asChild className="w-auto sm:w-auto p-0 px-2 sm:px-3">
          <Link href="/questoes?import=true">
            <Upload className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Importar</span>
          </Link>
        </Button>
        <Button size="sm" asChild className="w-auto sm:w-auto p-0 px-2 sm:px-3">
          <Link href="/simulados/novo">
            <PlusCircle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Criar Simulado</span>
          </Link>
        </Button>
         <Button variant="ghost" size="icon" onClick={logout} title="Sair">
            <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
