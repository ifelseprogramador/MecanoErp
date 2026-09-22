"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Replayer } from "rrweb";
// A classe crua `Replayer` (diferente do pacote `rrweb-player`) não injeta
// seu próprio CSS. Sem isso, o cursor do rrweb (`.replayer-mouse`) e o
// canvas do rastro do mouse (`.replayer-mouse-tail`) ficam sem
// `position: absolute` e empilham em fluxo normal ACIMA do iframe — cada
// um do tamanho da tela gravada (ex.: 720px) — empurrando o conteúdo real
// para fora da janela visível. Era a causa do "só aparece fundo cinza".
import "rrweb/dist/style.css";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/core/logger";
import { getRealtimeChannel, liveSessionChannelName } from "../realtime";
import { endLiveSession } from "../actions";

/**
 * Player ao vivo do lado do admin: espelha a tela do app do usuário
 * (rrweb) e, quando `controlGranted`, envia os movimentos/cliques/teclas
 * do admin de volta como eventos de controle remoto (ver
 * apply-control-event.ts do lado de quem recebe). O admin nunca controla
 * sem o usuário ter concedido explicitamente — esse estado só chega aqui
 * via broadcast, nunca é decidido neste componente.
 */
export function LiveSessionViewer({
  sessionId,
  initialStatus,
  initialControlGranted,
  onEnded,
}: {
  sessionId: string;
  initialStatus: "pending" | "active";
  initialControlGranted: boolean;
  onEnded: () => void;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [controlGranted, setControlGranted] = useState(initialControlGranted);
  const [connectionError, setConnectionError] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const replayerRef = useRef<Replayer | null>(null);
  const channelRef = useRef<ReturnType<typeof getRealtimeChannel> | null>(null);
  const controlGrantedRef = useRef(controlGranted);
  const hoveringRef = useRef(false);

  useEffect(() => {
    controlGrantedRef.current = controlGranted;
  }, [controlGranted]);

  useEffect(() => {
    const channel = getRealtimeChannel(liveSessionChannelName(sessionId));
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "status" }, ({ payload }) => {
        const next = payload.status as string;
        if (next === "ended" || next === "declined") {
          onEnded();
        } else if (next === "active") {
          setStatus("active");
        }
      })
      .on("broadcast", { event: "control" }, ({ payload }) => {
        setControlGranted(Boolean(payload.granted));
      })
      .on("broadcast", { event: "rrweb" }, ({ payload }) => {
        if (!replayerRef.current && containerRef.current) {
          replayerRef.current = new Replayer([], {
            root: containerRef.current,
            liveMode: true,
            UNSAFE_replayCanvas: true,
          });
          replayerRef.current.startLive();
        }
        replayerRef.current?.addEvent(payload);
        setHasFrame(true);
      })
      .subscribe((subscribeStatus, err) => {
        // Avisa "estou pronto" só depois que o canal confirma inscrito —
        // sem isso, o instantâneo completo que o usuário manda ao
        // iniciar a gravação pode ter sido enviado ANTES do admin estar
        // de fato escutando (o Broadcast não guarda histórico pra quem
        // chega depois) e o espelho nunca aparece, mesmo com a sessão
        // ativa. Pedir um instantâneo novo aqui cobre esse caso.
        if (subscribeStatus === "SUBSCRIBED") {
          setConnectionError(false);
          void channel.send({ type: "broadcast", event: "viewer-ready", payload: {} });
        } else if (subscribeStatus === "CHANNEL_ERROR" || subscribeStatus === "TIMED_OUT") {
          logger.error("live_support.canal_falhou", { sessionId, subscribeStatus, err });
          setConnectionError(true);
        }
      });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      replayerRef.current?.destroy();
      replayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnded é estável o bastante aqui (não recriamos o canal por causa dela)
  }, [sessionId]);

  // Reaproveita o MESMO canal já inscrito (não cria um novo a cada envio —
  // um canal novo por evento, em sequência rápida como digitação, se
  // perde: o REST do Realtime não segura fila/ordem entre canais
  // efêmeros distintos).
  function sendControl(payload: object) {
    if (!controlGrantedRef.current || !channelRef.current) return;
    void channelRef.current.send({ type: "broadcast", event: "control-input", payload });
  }

  /**
   * O `Replayer` (a classe crua, sem o `rrweb-player`) NÃO escala o
   * iframe para caber no container — ele renderiza no tamanho real da
   * tela gravada. Por isso a fração de clique tem que ser calculada em
   * cima do próprio `<iframe>` (que corresponde 1:1 à página do
   * usuário), nunca do nosso `containerRef` (que só recorta/mostra uma
   * janela por cima dele via `overflow-hidden`).
   */
  function getIframeRect(): DOMRect | null {
    return containerRef.current?.querySelector("iframe")?.getBoundingClientRect() ?? null;
  }

  const lastMoveSentAtRef = useRef(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    // Throttle: mousemove dispara a cada pixel — sem isso, cada
    // movimento vira uma rajada de chamadas REST ao Realtime.
    const now = Date.now();
    if (now - lastMoveSentAtRef.current < 50) return;
    lastMoveSentAtRef.current = now;

    const rect = getIframeRect();
    if (!rect) return;
    sendControl({
      type: "move",
      xFrac: (e.clientX - rect.left) / rect.width,
      yFrac: (e.clientY - rect.top) / rect.height,
    });
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = getIframeRect();
    if (!rect) return;
    sendControl({
      type: "click",
      xFrac: (e.clientX - rect.left) / rect.width,
      yFrac: (e.clientY - rect.top) / rect.height,
    });
  }

  // O rrweb, ao repetir o evento de foco que ele mesmo gravou no usuário,
  // foca o iframe de replay por baixo dos panos — um iframe é outro
  // contexto de navegação, então o teclado dali NUNCA borbulha até o
  // `window` desta página (e o foco entrando num iframe nem sempre
  // dispara um evento `focus` capturável no documento pai, então um
  // listener de evento não é confiável aqui — só um polling curto é).
  // Sem isso, nenhum keydown chegaria no listener abaixo depois da
  // primeira vez que algo for focado do lado do usuário.
  useEffect(() => {
    if (status !== "active") return;

    const interval = setInterval(() => {
      if (document.activeElement instanceof HTMLIFrameElement) {
        document.activeElement.blur();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [status]);

  // Captura o teclado em `window`, não no foco do container — pelo mesmo
  // motivo acima, nunca dá pra depender de um elemento específico ter
  // foco. Só encaminha teclas enquanto o mouse do admin está sobre o
  // espelho (`hoveringRef`).
  useEffect(() => {
    if (status !== "active") return;

    function handleWindowKeyDown(e: KeyboardEvent) {
      if (!hoveringRef.current || !controlGrantedRef.current) return;
      if (e.key.length === 1 || e.key === "Backspace" || e.key === "Enter") {
        e.preventDefault();
        sendControl({ type: "key", key: e.key });
      }
    }

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [status, sessionId]);

  function handleEnd() {
    startTransition(async () => {
      await endLiveSession(sessionId);
      onEnded();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Badge variant={status === "active" ? "secondary" : "outline"}>
          {status === "active" ? "Ao vivo" : "Aguardando aprovação da oficina..."}
        </Badge>
        {controlGranted && <Badge>Controle remoto concedido</Badge>}
        {connectionError && (
          <Badge variant="destructive">Erro de conexão em tempo real — recarregue a página</Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={handleEnd}
          disabled={isPending}
        >
          <X className="h-4 w-4" />
          Encerrar sessão
        </Button>
      </div>

      {/* pointer-events-none no iframe: um iframe é um contexto de
          navegação à parte — sem isso, o mouse "aterrissa" nele e os
          handlers deste div nunca disparam. O iframe continua 100%
          visível, só para de roubar o clique/mousemove.
          overflow-auto (em vez de recortar numa janela fixa): o
          `Replayer` cru não escala a página pra caber, renderiza no
          tamanho real gravado — um container com scroll em vez de
          `aspect-video` deixa tudo alcançável, só rolando, igual a
          olhar a página de verdade. */}
      {status === "active" && (
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => {
            hoveringRef.current = true;
          }}
          onMouseLeave={() => {
            hoveringRef.current = false;
          }}
          onClick={handleClick}
          className="bg-muted relative h-[480px] w-full overflow-auto rounded-lg border [&_iframe]:pointer-events-none"
        >
          {!hasFrame && !connectionError && (
            <p className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
              Aguardando o primeiro quadro da tela da oficina...
            </p>
          )}
        </div>
      )}
      {controlGranted && (
        <p className="text-muted-foreground text-xs">
          Passe o mouse sobre o espelho para usar o controle remoto (mouse e teclado).
        </p>
      )}
    </div>
  );
}
