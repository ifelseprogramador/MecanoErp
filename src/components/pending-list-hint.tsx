import { Hint } from "@/components/hint";

/** Cabeçalho com dica, reaproveitado pelos 4 `pending-*.tsx` (clientes,
 * veiculos, catalogo, ordens) — explica o que "pendente" significa pra
 * quem nunca ficou offline no app antes. */
export function PendingListHint() {
  return (
    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <span>Criados offline, ainda sincronizando</span>
      <Hint>
        Salvos neste navegador enquanto estava sem internet. Assim que a conexão voltar, sincronizam
        sozinhos e somem desta lista.
      </Hint>
    </div>
  );
}
