"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import type { ActionResult } from "@/core/action-result";
import { customers } from "./schema";
import { parseCustomerFormData, type CustomerInput } from "./validation";

interface InsertResult extends ActionResult {
  id?: string;
}

/**
 * Faz o INSERT em si, sem `redirect()` — separado de `createCustomer`
 * pra poder ser chamado direto do motor de sincronização offline
 * (core/offline/replay-handlers.ts), que roda fora de uma submissão de
 * formulário e não pode depender do sinal especial que `redirect()`
 * lança. Aceita um `id` opcional: quando o registro foi criado offline,
 * o id já foi gerado no navegador (`crypto.randomUUID()`) — insere com
 * ESSE id em vez de deixar o Postgres gerar um novo, pra a página do
 * registro pendente e a sincronizada apontarem pro mesmo lugar.
 */
export async function createCustomerRecord(
  data: CustomerInput,
  id?: string,
): Promise<InsertResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("clientes.criar", { offline: Boolean(id) });

  try {
    const [customer] = await db
      .insert(customers)
      .values({ ...data, organizationId, ...(id && { id }) })
      .returning({ id: customers.id });
    log.info("clientes.criar.sucesso", { customerId: customer.id });
    revalidatePath("/clientes");
    return { ok: true, id: customer.id };
  } catch (err) {
    log.error("clientes.criar.falhou", { err });
    return { ok: false, message: "Não foi possível salvar o cliente. Tente novamente." };
  }
}

export async function createCustomer(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  // `withOrg()` aqui de propósito, antes até de validar o form: mantém a
  // checagem de sessão como a primeira coisa que acontece (não deixa uma
  // chamada sem sessão sondar erro de validação antes de ser barrada).
  // `createCustomerRecord` chama de novo por conta própria — é chamável
  // direto como Server Action pelo motor de sync offline, então precisa
  // do próprio gate de auth independente de quem chamou.
  const { log } = await withOrg();
  const parsed = parseCustomerFormData(formData);
  if (!parsed.success) {
    log.warn("clientes.criar.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const result = await createCustomerRecord(parsed.data);
  if (!result.ok) return result;

  // `redirect()` funciona lançando um erro especial que o Next.js
  // reconhece — precisa ficar FORA de qualquer try/catch, senão um catch
  // genérico o trataria como uma falha de verdade.
  redirect(`/clientes/${result.id}?criado=1`);
}

export async function updateCustomer(
  customerId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("clientes.atualizar", { customerId });

  const parsed = parseCustomerFormData(formData);
  if (!parsed.success) {
    log.warn("clientes.atualizar.validacao_falhou", {
      customerId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await db
      .update(customers)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
      .returning({ id: customers.id });

    if (result.length === 0) {
      log.warn("clientes.atualizar.nao_encontrado", { customerId });
      return { ok: false, message: "Cliente não encontrado." };
    }

    log.info("clientes.atualizar.sucesso", { customerId });
    revalidatePath("/clientes");
    revalidatePath(`/clientes/${customerId}`);
    return { ok: true };
  } catch (err) {
    log.error("clientes.atualizar.falhou", { customerId, err });
    return { ok: false, message: "Não foi possível salvar as alterações. Tente novamente." };
  }
}

export async function deleteCustomer(customerId: string): Promise<ActionResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("clientes.remover", { customerId });

  try {
    const result = await db
      .delete(customers)
      .where(and(eq(customers.id, customerId), eq(customers.organizationId, organizationId)))
      .returning({ id: customers.id });

    if (result.length === 0) {
      log.warn("clientes.remover.nao_encontrado", { customerId });
      return { ok: false, message: "Cliente não encontrado." };
    }

    log.info("clientes.remover.sucesso", { customerId });
    revalidatePath("/clientes");
    return { ok: true };
  } catch (err) {
    // Violação de FK (23503): cliente tem veículos/OS vinculados.
    const isForeignKeyViolation =
      typeof err === "object" && err !== null && "code" in err && err.code === "23503";

    if (isForeignKeyViolation) {
      log.warn("clientes.remover.bloqueado_por_vinculo", { customerId });
      return {
        ok: false,
        message:
          "Este cliente tem veículos ou ordens de serviço vinculados e não pode ser removido.",
      };
    }

    log.error("clientes.remover.falhou", { customerId, err });
    return { ok: false, message: "Não foi possível remover o cliente. Tente novamente." };
  }
}
