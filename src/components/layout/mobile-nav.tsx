"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Target,
  History,
  Menu,
  Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

const navItems = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/repositorio", label: "Repositório", icon: Archive },
  { href: "/simulados", label: "Simulados", icon: Target },
  { href: "/revisao", label: "Revisão", icon: History },
];

export function MobileNav() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/80 backdrop-blur-sm md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground",
              pathname.startsWith(item.href) && "text-primary"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={() => setOpenMobile(true)}
          className="flex flex-col items-center gap-1 rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
          <span className="text-xs font-medium">Mais</span>
        </button>
      </div>
    </div>
  );
}
