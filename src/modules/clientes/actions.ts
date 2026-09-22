"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import type { ActionResult } from "@/core/action-result";
import { customers } from "./schema";
import { parseCustomerFormData } from "./validation";

export async function createCustomer(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("clientes.criar");

  const parsed = parseCustomerFormData(formData);
  if (!parsed.success) {
    log.warn("clientes.criar.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const [customer] = await db
      .insert(customers)
      .values({ ...parsed.data, organizationId })
      .returning({ id: customers.id });

    log.info("clientes.criar.sucesso", { customerId: customer.id });
    revalidatePath("/clientes");
    return { ok: true };
  } catch (err) {
    log.error("clientes.criar.falhou", { err });
    return { ok: false, message: "Não foi possível salvar o cliente. Tente novamente." };
  }
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
