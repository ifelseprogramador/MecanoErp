"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logger } from "@/core/logger";

/**
 * Boundary de erro global. `error.digest` é o identificador que o Next.js
 * já grava junto do log do servidor para erros de Server Component —
 * mostrar esse código na tela é o que permite ao usuário "ler o código
 * pelo telefone" e você achar o log exato (ver README > Observabilidade).
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Log do lado do cliente é só um fallback: o servidor já registrou
    // este erro com o mesmo `digest` via core/logger.
    logger.error("boundary.erro_capturado", { err: error, digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        Não foi possível concluir a ação. Tente novamente — se o problema continuar, informe o
        código abaixo.
      </p>
      {error.digest && (
        <code className="bg-muted rounded px-2 py-1 font-mono text-xs">{error.digest}</code>
      )}
      <Button onClick={() => retry()}>Tentar novamente</Button>
    </div>
  );
}
