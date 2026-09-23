import { WifiOff } from "lucide-react";

/**
 * Fallback do service worker (public/sw.js) quando a navegação falha
 * offline e a rota pedida nunca tinha sido visitada antes (por isso não
 * tem nada no cache pra mostrar). Página estática, sem dado nenhum —
 * precisa funcionar sem rede.
 */
export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <WifiOff className="text-muted-foreground h-10 w-10" />
      <h1 className="text-lg font-semibold">Sem conexão</h1>
      <p className="text-muted-foreground max-w-sm text-sm">
        Esta página ainda não tinha sido aberta antes, então não dá pra mostrar offline. Páginas que
        você já visitou continuam disponíveis — e o que você criar agora fica guardado e sincroniza
        sozinho quando a internet voltar.
      </p>
    </div>
  );
}
