"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import type { ActionResult } from "@/core/action-result";
import { vehicles } from "./schema";
import { parseVehicleFormData } from "./validation";

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23503";
}

export async function createVehicle(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { db, organizationId, log } = await withOrg();
  log.info("veiculos.criar");

  const parsed = parseVehicleFormData(formData);
  if (!parsed.success) {
    log.warn("veiculos.criar.validacao_falhou", {
      fields: Object.keys(parsed.error.flatten().fieldErrors),
    });
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  let vehicleId: string;
  try {
    const [vehicle] = await db
      .insert(vehicles)
      .values({ ...parsed.data, organizationId })
      .returning({ id: vehicles.id });
    vehicleId = vehicle.id;
    log.info("veiculos.criar.sucesso", { vehicleId });
  } catch (err) {
    if (isUniqueViolation(err)) {
      log.warn("veiculos.criar.placa_duplicada", { plate: parsed.data.plate });
      return { ok: false, errors: { plate: ["Já existe um veículo com essa placa."] } };
    }
    log.error("veiculos.criar.falhou", { err });
    return { ok: false, message: "Não foi possível salvar o veículo. Tente novamente." };
  }

  // `redirect()` fica fora do try/catch pelo mesmo motivo documentado em
  // modules/clientes/actions.ts#createCustomer.
  revalidatePath("/veiculos");
  revalidatePath(`/clientes/${parsed.data.customerId}`);
  redirect(`/veiculos/${vehicleId}`);
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
