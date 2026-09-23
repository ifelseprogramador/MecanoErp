"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import type { ActionResult } from "@/core/action-result";
import { vehicles } from "./schema";
import { parseVehicleFormData, type VehicleInput } from "./validation";

interface InsertResult extends ActionResult {
  id?: string;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23503";
}

/**
 * Faz o INSERT em si, sem `redirect()` — mesma extração e mesmo motivo
 * de `modules/clientes/actions.ts#createCustomerRecord`: chamável direto
 * pelo motor de sincronização offline (`core/offline/replay-handlers.ts`).
 * Se o veículo foi criado offline referenciando um CLIENTE também criado
 * offline (ainda não sincronizado), o insert falha por violação de FK —
 * o motor de sync já para no primeiro erro e tenta de novo depois, então
 * a ordem cronológica da fila (cliente antes do veículo) resolve isso
 * sozinha assim que o cliente sincronizar primeiro.
 */
export async function createVehicleRecord(data: VehicleInput, id?: string): Promise<InsertResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("veiculos.criar", { offline: Boolean(id) });

  try {
    const [vehicle] = await db
      .insert(vehicles)
      .values({ ...data, organizationId, ...(id && { id }) })
      .returning({ id: vehicles.id });
    log.info("veiculos.criar.sucesso", { vehicleId: vehicle.id });
    revalidatePath("/veiculos");
    revalidatePath(`/clientes/${data.customerId}`);
    return { ok: true, id: vehicle.id };
  } catch (err) {
    if (isUniqueViolation(err)) {
      log.warn("veiculos.criar.placa_duplicada", { plate: data.plate });
      return { ok: false, errors: { plate: ["Já existe um veículo com essa placa."] } };
    }
    log.error("veiculos.criar.falhou", { err });
    return { ok: false, message: "Não foi possível salvar o veículo. Tente novamente." };
  }
}

export async function createVehicle(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  // `withOrg()` aqui de propósito, antes até de validar o form — mesmo
  // motivo documentado em modules/clientes/actions.ts#createCustomer.
  const { log } = await withOrg();
  const parsed = parseVehicleFormData(formData);
  if (!parsed.success) {
    log.warn("veiculos.criar.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const result = await createVehicleRecord(parsed.data);
  if (!result.ok) return result;

  // `redirect()` fica fora do try/catch pelo mesmo motivo documentado em
  // modules/clientes/actions.ts#createCustomer.
  redirect(`/veiculos/${result.id}?criado=1`);
}

export async function updateVehicle(
  vehicleId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("veiculos.atualizar", { vehicleId });

  const parsed = parseVehicleFormData(formData);
  if (!parsed.success) {
    log.warn("veiculos.atualizar.validacao_falhou", {
      vehicleId,
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    const result = await db
      .update(vehicles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.organizationId, organizationId)))
      .returning({ id: vehicles.id });

    if (result.length === 0) {
      log.warn("veiculos.atualizar.nao_encontrado", { vehicleId });
      return { ok: false, message: "Veículo não encontrado." };
    }

    log.info("veiculos.atualizar.sucesso", { vehicleId });
    revalidatePath("/veiculos");
    revalidatePath(`/veiculos/${vehicleId}`);
    revalidatePath(`/clientes/${parsed.data.customerId}`);
    return { ok: true };
  } catch (err) {
    if (isUniqueViolation(err)) {
      log.warn("veiculos.atualizar.placa_duplicada", { vehicleId, plate: parsed.data.plate });
      return { ok: false, errors: { plate: ["Já existe um veículo com essa placa."] } };
    }
    log.error("veiculos.atualizar.falhou", { vehicleId, err });
    return { ok: false, message: "Não foi possível salvar as alterações. Tente novamente." };
  }
}

export async function deleteVehicle(vehicleId: string): Promise<ActionResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("veiculos.remover", { vehicleId });

  try {
    const result = await db
      .delete(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.organizationId, organizationId)))
      .returning({ id: vehicles.id });

    if (result.length === 0) {
      log.warn("veiculos.remover.nao_encontrado", { vehicleId });
      return { ok: false, message: "Veículo não encontrado." };
    }

    log.info("veiculos.remover.sucesso", { vehicleId });
    revalidatePath("/veiculos");
    return { ok: true };
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      log.warn("veiculos.remover.bloqueado_por_vinculo", { vehicleId });
      return {
        ok: false,
        message: "Este veículo tem ordens de serviço vinculadas e não pode ser removido.",
      };
    }
    log.error("veiculos.remover.falhou", { vehicleId, err });
    return { ok: false, message: "Não foi possível remover o veículo. Tente novamente." };
  }
}
