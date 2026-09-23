"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Seta pra voltar pra onde a pessoa veio (`router.back()` — histórico de
 * navegação de verdade, não um link fixo pra lista) — usado no topo de
 * toda página de criar/editar registro. Não confundir com o botão
 * "Cancelar" de um dialog: aqui é navegação de página inteira.
 */
export function BackButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => router.back()}
      title="Voltar"
      aria-label="Voltar"
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
