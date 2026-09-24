import Link from "next/link";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Link do nome/número numa linha de lista que abre a edição do registro.
 * No hover, em vez do sublinhado, ganha um fundo suave na cor primária e
 * um lápis que desliza pra dentro — deixa claro que clicar ali é editar.
 * O `-mx-1.5 px-1.5` mantém o texto alinhado com o resto da coluna
 * (o "pill" do hover transborda pra fora, não empurra o conteúdo).
 */
export function EditLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group/edit -mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors",
        "hover:bg-primary/10 hover:text-primary focus-visible:bg-primary/10 focus-visible:text-primary",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-2",
        className,
      )}
    >
      <span className="truncate">{children}</span>
      <Pencil
        aria-hidden
        className="h-3.5 w-3.5 shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover/edit:translate-x-0 group-hover/edit:opacity-100 group-focus-visible/edit:translate-x-0 group-focus-visible/edit:opacity-100"
      />
    </Link>
  );
}
