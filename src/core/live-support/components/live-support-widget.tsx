"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { record } from "rrweb";
import type { eventWithTime } from "@rrweb/types";
import { toast } from "sonner";
import { Headset, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logger } from "@/core/logger";
import { getRealtimeChannel, liveSessionChannelName, orgSupportChannelName } from "../realtime";
import { applyControlEvent } from "../apply-control-event";
import type { ControlEvent } from "../control-events";
import {
  approveSupportSession,
  callForSupport,
  declineSupportSession,
  endLiveSession,
  setControlGranted,
} from "../actions";

export interface LiveSessionState {
  id: string;
  status: "pending" | "active";
  initiatedBy: "admin" | "user";
  controlGranted: boolean;
}

/**
 * Widget do lado do usuário da oficina: espera pedido do admin (modal de
 * consentimento), deixa chamar o suporte, grava e transmite a tela
 * (rrweb) enquanto a sessão está `active`, e aplica os eventos de
 * controle remoto quando `controlGranted` é true. Montado uma vez em
 * `(app)/layout.tsx` — sobrevive à navegação entre páginas (é o mesmo
 * componente da árvore do layout), então a gravação não reinicia a cada
 * clique em um link.
 */
export function LiveSupportWidget({
  organizationId,
  initialSession,
}: {
  organizationId: string;
  initialSession: LiveSessionState | null;
}) {
  const [session, setSession] = useState<LiveSessionState | null>(initialSession);
  const [isPending, startTransition] = useTransition();
  const sessionRef = useRef(session);
  const stopRecordingRef = useRef<(() => void) | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Escuta pedidos que o admin abrir para esta oficina, mesmo sem sessão aberta.
  useEffect(() => {
    const channel = getRealtimeChannel(orgSupportChannelName(organizationId));
    channel
      .on("broadcast", { event: "request" }, ({ payload }) => {
        if (sessionRef.current) return;
        setSession({
          id: payload.sessionId as string,
          status: "pending",
          initiatedBy: "admin",
          controlGranted: false,
        });
      })
      .subscribe((subscribeStatus, err) => {
        if (subscribeStatus === "CHANNEL_ERROR" || subscribeStatus === "TIMED_OUT") {
          logger.error("live_support.canal_org_falhou", { organizationId, subscribeStatus, err });
        }
      });
    return () => {
      channel.unsubscribe();
    };
  }, [organizationId]);

  // Canal da sessão atual (status, controle, e o transporte do rrweb quando ativa).
  useEffect(() => {
    if (!session) return;

    const channel = getRealtimeChannel(liveSessionChannelName(session.id));
    channel
      .on("broadcast", { event: "status" }, ({ payload }) => {
        const status = payload.status as string;
        if (status === "ended" || status === "declined") {
          setSession(null);
        } else {
          setSession((prev) => (prev ? { ...prev, status: status as "active" } : prev));
        }
      })
      .on("broadcast", { event: "control" }, ({ payload }) => {
        setSession((prev) => (prev ? { ...prev, controlGranted: Boolean(payload.granted) } : prev));
      })
      .on("broadcast", { event: "control-input" }, ({ payload }) => {
        if (sessionRef.current?.controlGranted) {
          applyControlEvent(payload as ControlEvent, cursorRef.current);
        }
      })
      .on("broadcast", { event: "viewer-ready" }, () => {
        // Admin acabou de se inscrever (ou reconectou) e avisou que está
        // pronto — o Broadcast não guarda histórico pra quem chega
        // depois, então o instantâneo completo original pode ter se
        // perdido. Manda um novo agora que sabemos que alguém escuta.
        if (stopRecordingRef.current) {
          record.takeFullSnapshot();
        }
      })
      .subscribe((subscribeStatus, err) => {
        if (subscribeStatus === "CHANNEL_ERROR" || subscribeStatus === "TIMED_OUT") {
          logger.error("live_support.canal_sessao_falhou", {
            sessionId: session.id,
            subscribeStatus,
            err,
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- de propósito: só quer resubscrever quando o id da sessão muda, não a cada status/controlGranted que este mesmo efeito produz (senão reconecta o canal em loop)
  }, [session?.id]);

  // Liga/desliga a gravação junto do status virar/deixar de ser "active".
  useEffect(() => {
    if (session && session.status === "active" && !stopRecordingRef.current) {
      const channel = getRealtimeChannel(liveSessionChannelName(session.id));
      const stop = record({
        emit(event: eventWithTime) {
          void channel.send({ type: "broadcast", event: "rrweb", payload: event });
        },
      });
      stopRecordingRef.current = stop ?? null;
    }
    if (session?.status !== "active" && stopRecordingRef.current) {
      stopRecordingRef.current();
      stopRecordingRef.current = null;
    }
  }, [session]);

  useEffect(() => {
    return () => {
      stopRecordingRef.current?.();
    };
  }, []);

  function handleApprove() {
    if (!session) return;
    startTransition(async () => {
      await approveSupportSession(session.id);
      setSession((prev) => (prev ? { ...prev, status: "active" } : prev));
    });
  }

  function handleDecline() {
    if (!session) return;
    const id = session.id;
    setSession(null);
    startTransition(async () => {
      await declineSupportSession(id);
    });
  }

  function handleCallForSupport() {
    startTransition(async () => {
      const result = await callForSupport();
      if (result.ok && result.sessionId) {
        setSession({
          id: result.sessionId,
          status: "pending",
          initiatedBy: "user",
          controlGranted: false,
        });
      } else {
        toast.error(result.message ?? "Não foi possível chamar o suporte.");
      }
    });
  }

  function handleEnd() {
    if (!session) return;
    const id = session.id;
    setSession(null);
    startTransition(async () => {
      await endLiveSession(id);
    });
  }

  function handleToggleControl(granted: boolean) {
    if (!session) return;
    setSession((prev) => (prev ? { ...prev, controlGranted: granted } : prev));
    startTransition(async () => {
      await setControlGranted(session.id, granted);
    });
  }

  return (
    <>
      {!session && (
        <Button
          variant="outline"
          size="icon"
          title="Chamar suporte"
          className="fixed right-4 bottom-4 z-50 rounded-full shadow-lg"
          onClick={handleCallForSupport}
          disabled={isPending}
        >
          <Headset className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={session?.status === "pending" && session.initiatedBy === "admin"}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Suporte MecanoErp quer ver sua tela</DialogTitle>
            <DialogDescription>
              Alguém do suporte quer acompanhar o que você está fazendo no sistema, ao vivo, para te
              ajudar. Você pode encerrar quando quiser, e controle remoto só acontece se você
              permitir depois, separadamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDecline} disabled={isPending}>
              Recusar
            </Button>
            <Button onClick={handleApprove} disabled={isPending}>
              Permitir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {session?.status === "pending" && session.initiatedBy === "user" && (
        <div className="bg-card fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-lg border p-3 text-sm shadow-lg">
          <span>Aguardando atendimento do suporte...</span>
          <Button variant="ghost" size="sm" onClick={handleEnd}>
            Cancelar
          </Button>
        </div>
      )}

      {session?.status === "active" && (
        <div className="flex items-center justify-between bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          <span className="flex items-center gap-2">
            <Headset className="h-4 w-4" />
            Sessão de suporte ativa — sua tela está sendo acompanhada ao vivo
          </span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <span>Permitir controle remoto</span>
              <Switch
                checked={session.controlGranted}
                onCheckedChange={handleToggleControl}
                disabled={isPending}
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              className="bg-white"
              onClick={handleEnd}
              disabled={isPending}
            >
              <X className="h-4 w-4" />
              Encerrar
            </Button>
          </div>
        </div>
      )}

      {session?.status === "active" && session.controlGranted && (
        <div
          ref={cursorRef}
          className="pointer-events-none fixed top-0 left-0 z-[60] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-500 bg-red-500/30"
        />
      )}
    </>
  );
}
