"use server";

import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { requireModule } from "@/core/auth";
import { formatPlate } from "@/core/format";
import { customers } from "@/modules/clientes/schema";
import type { FacilOption, MiniResult } from "@/components/facil/facil-search";
import { createVehicleRecord } from "./actions";
import { vehicles } from "./schema";
import { parseVehicleFormData } from "./validation";

const SEARCH_LIMIT = 20;

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

function describeVehicle(vehicle: {
  brand: string | null;
  model: string | null;
  year: number | null;
}) {
  return [vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ") || undefined;
}

/**
 * Veículos DE UM CLIENTE para o campo de escolha com busca do modo Fácil.
 * Um cliente costuma ter poucos, então sem texto devolve todos (até o limite),
 * os mais recentes primeiro; com texto filtra por placa, marca ou modelo.
 */
export async function searchVehiclesForPick(
  customerId: string,
  term: string,
): Promise<FacilOption[]> {
  const { withDb, organizationId } = await requireModule("veiculos");
  if (!z.uuid().safeParse(customerId).success) return [];

  const text = String(term ?? "")
    .trim()
    .slice(0, 40);
  const plate = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const like = `%${escapeLike(text)}%`;

  const rows = await withDb((tx) =>
    tx
      .select({
        id: vehicles.id,
        plate: vehicles.plate,
        brand: vehicles.brand,
        model: vehicles.model,
        year: vehicles.year,
      })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.organizationId, organizationId),
          eq(vehicles.customerId, customerId),
          text
            ? or(
                plate ? ilike(vehicles.plate, `%${escapeLike(plate)}%`) : undefined,
                ilike(vehicles.brand, like),
                ilike(vehicles.model, like),
              )
            : undefined,
        ),
      )
      .orderBy(text ? asc(vehicles.plate) : desc(vehicles.createdAt))
      .limit(SEARCH_LIMIT),
  );

  return rows.map((row) => ({
    value: row.id,
    label: formatPlate(row.plate),
    subtitle: describeVehicle(row),
  }));
}

/** Veículo da oficina com esta placa (já normalizada), com o nome do dono. */
async function findVehicleByPlate(plate: string) {
  const { withDb, organizationId } = await requireModule("veiculos");
  const [row] = await withDb((tx) =>
    tx
      .select({
        id: vehicles.id,
        plate: vehicles.plate,
        brand: vehicles.brand,
        model: vehicles.model,
        year: vehicles.year,
        customerId: vehicles.customerId,
        customerName: customers.name,
      })
      .from(vehicles)
      .innerJoin(customers, eq(customers.id, vehicles.customerId))
      .where(and(eq(vehicles.organizationId, organizationId), eq(vehicles.plate, plate)))
      .limit(1),
  );
  return row;
}

/**
 * Cadastro rápido de veículo (placa, marca, modelo e, se a pessoa quiser, ano,
 * cor e combustível — todos opcionais) para um cliente já
 * escolhido, de dentro de outro fluxo. MESMA validação (`parseVehicleFormData`)
 * e MESMA gravação (`createVehicleRecord`) do cadastro completo.
 */
export async function quickCreateVehicle(values: Record<string, string>): Promise<MiniResult> {
  await requireModule("veiculos");
  const formData = new FormData();
  for (const key of [
    "customerId",
    "plate",
    "brand",
    "model",
    "year",
    "color",
    "fuel",
    "currentKm",
    "chassis",
  ]) {
    formData.set(key, String(values[key] ?? ""));
  }

  const parsed = parseVehicleFormData(formData);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const result = await createVehicleRecord(parsed.data);
  if (!result.ok && result.errors?.plate) {
    // Placa já cadastrada nesta oficina (única por oficina). Se é deste mesmo
    // cliente, é o veículo que a pessoa quer: usa o existente em vez de travar.
    const existing = await findVehicleByPlate(parsed.data.plate);
    if (existing && existing.customerId === parsed.data.customerId) {
      return {
        ok: true,
        option: {
          value: existing.id,
          label: formatPlate(existing.plate),
          subtitle: describeVehicle(existing) ?? "Já estava cadastrado para este cliente",
        },
      };
    }
    if (existing) {
      return {
        ok: false,
        errors: {
          plate: [`Esta placa já está cadastrada para ${existing.customerName}. Confira a placa.`],
        },
      };
    }
  }
  if (!result.ok || !result.id) {
    return { ok: false, message: result.message ?? "Não foi possível cadastrar o veículo." };
  }
  return {
    ok: true,
    option: {
      value: result.id,
      label: formatPlate(parsed.data.plate),
      subtitle: describeVehicle({
        brand: parsed.data.brand ?? null,
        model: parsed.data.model ?? null,
        year: parsed.data.year ?? null,
      }),
    },
  };
}
