"use client";

import { unstable_rethrow } from "next/navigation";
import type { ActionResult } from "@/core/action-result";
import { enqueuePendingAction } from "./queue";

interface ParsedOk<T> {
  success: true;
  data: T;
}
interface ParsedFail {
  success: false;
  errors: Record<string, string[]>;
}

/** Uma requisição que nunca chegou ao servidor (offline de verdade, DNS
 * fora do ar, etc.) sempre aparece pro `fetch` como um `TypeError` — é a
 * única forma confiável de diferenciar "sem rede" de um erro de
 * validação/negócio que o próprio servidor respondeu normalmente. */
function isLikelyNetworkError(err: unknown): boolean {
  return err instanceof TypeError && /fetch|network|load failed/i.test(err.message);
}

/**
 * Envolve uma Server Action de CRIAR (`(prevState, formData) =>
 * ActionResult`, o formato que `CustomerForm`/etc. já esperam) com um
 * plano B offline — sem mudar a assinatura, então o form que já existe
 * não precisa saber que isso existe. Se `navigator.onLine` já disser que
 * não tem rede, ou se a chamada de verdade falhar por erro de rede
 * (nunca por erro de validação/negócio — esses sempre voltam como
 * `ActionResult`, nunca lançam), grava a intenção na fila local
 * (`core/offline/`) e navega pra ficha "pendente" do registro — a pessoa
 * nem percebe que ficou offline, só que vai ver um aviso na tela.
 *
 * Só serve pra CRIAR (ver record em `db.ts` — escopo de propósito).
 */
export function useOfflineCreateAction<T>(
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>,
  options: {
    module: string;
    entity: string;
    actionName: string;
    parse: (formData: FormData) => ParsedOk<T> | ParsedFail;
    label: (data: T) => string;
    pendingPath: (id: string) => string;
  },
): (prevState: ActionResult, formData: FormData) => Promise<ActionResult> {
  return async (prevState, formData) => {
    async function goOffline(): Promise<ActionResult> {
      const parsed = options.parse(formData);
      if (!parsed.success) {
        return { ok: false, errors: parsed.errors };
      }
      const id = crypto.randomUUID();
      await enqueuePendingAction({
        id,
        module: options.module,
        entity: options.entity,
        actionName: options.actionName,
        label: options.label(parsed.data),
        record: parsed.data as Record<string, unknown>,
      });
      // Navegação de verdade (`window.location`), não `router.push()`:
      // o router do Next tenta buscar o payload RSC da rota de destino
      // antes de trocar de tela — falha offline mesmo sendo uma rota
      // 100% client, e cai no fallback de "página nunca visitada" do
      // service worker. Uma navegação de página inteira passa pelo
      // handler de "navigate" do service worker (public/sw.js), que
      // serve do precache — funciona mesmo no primeiro uso offline.
      window.location.href = options.pendingPath(id);
      return { ok: true };
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return goOffline();
    }
    try {
      return await action(prevState, formData);
    } catch (err) {
      // Redireciona/notFound/etc. do Next são sinalizados lançando um
      // erro especial — `unstable_rethrow` reconhece e relança ELES,
      // sem fazer nada pros demais (é o próprio jeito documentado do
      // Next de diferenciar isso de um erro de verdade).
      unstable_rethrow(err);
      if (isLikelyNetworkError(err)) {
        return goOffline();
      }
      throw err;
    }
  };
}
