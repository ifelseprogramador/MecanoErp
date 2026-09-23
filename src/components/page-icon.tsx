import type { LucideIcon } from "lucide-react";

/** Selo colorido com o ícone do módulo, ao lado do título de página —
 * mesmo tratamento visual dos ícones dos cards de KPI do painel
 * (`bg-accent`/`text-accent-foreground`, já "oficina"-temático). Repete
 * o ícone que já aparece pro módulo no menu lateral
 * (`module.ts#iconName`), não um novo. */
export function PageIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="bg-accent text-accent-foreground rounded-lg p-2">
      <Icon className="h-5 w-5" />
    </div>
  );
}
