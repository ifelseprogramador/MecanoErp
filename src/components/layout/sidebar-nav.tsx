"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModuleDefinition } from "@/core/registry";

/**
 * Lê só de `modules`, passado pelo layout a partir de `getEnabledModules()`
 * — nenhum link de módulo é hardcoded aqui. Remover um módulo do registry
 * some com o item do menu automaticamente.
 */
export function SidebarNav({
  modules,
  onNavigate,
}: {
  modules: ModuleDefinition[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const items = [
    { slug: "dashboard", label: "Painel", href: "/", icon: LayoutDashboard },
    ...modules.map((m) => ({ slug: m.slug, label: m.label, href: m.href, icon: m.icon })),
  ];

  return (
    <nav className="flex flex-col gap-1 p-2">
      {items.map((item) => {
        const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.slug}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
