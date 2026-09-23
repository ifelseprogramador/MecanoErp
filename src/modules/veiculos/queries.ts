import "server-only";
import { and, asc, desc, eq, ilike, isNotNull, sql } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { customers } from "@/modules/clientes/schema";
import { vehicles } from "./schema";

export const VEHICLE_SORT_OPTIONS = {
  created_desc: "Mais recentes primeiro",
  created_asc: "Mais antigos primeiro",
  plate_asc: "Placa (A→Z)",
  plate_desc: "Placa (Z→A)",
  year_desc: "Ano (mais novo primeiro)",
  year_asc: "Ano (mais antigo primeiro)",
} as const;
export type VehicleSort = keyof typeof VEHICLE_SORT_OPTIONS;

const VEHICLE_ORDER_BY = {
  created_desc: desc(vehicles.createdAt),
  created_asc: asc(vehicles.createdAt),
  plate_asc: asc(vehicles.plate),
  plate_desc: desc(vehicles.plate),
  year_desc: desc(vehicles.year),
  year_asc: asc(vehicles.year),
} as const;

export async function listVehicles(options?: {
  search?: string;
  year?: number;
  sort?: VehicleSort;
}) {
  const { db, organizationId } = await withOrg();

  const term = options?.search?.trim();
  const conditions = [eq(vehicles.organizationId, organizationId)];
  if (term) {
    conditions.push(ilike(vehicles.plate, `%${term.toUpperCase().replace(/[^A-Z0-9]/g, "")}%`));
  }
  if (options?.year) {
    conditions.push(eq(vehicles.year, options.year));
  }

  return db
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
    .where(and(...conditions))
    .orderBy(VEHICLE_ORDER_BY[options?.sort ?? "created_desc"]);
}

/** Anos distintos entre os veículos da oficina, pro filtro "Ano" da
 * listagem — construído dos dados reais em vez de uma faixa fixa de
 * anos que não bateria com a frota de verdade. */
export async function listVehicleYears() {
  const { db, organizationId } = await withOrg();

  const rows = await db
    .selectDistinct({ year: vehicles.year })
    .from(vehicles)
    .where(and(eq(vehicles.organizationId, organizationId), isNotNull(vehicles.year)))
    .orderBy(desc(vehicles.year));

  return rows.map((r) => r.year as number);
}

/** Lista enxuta com o dono de cada veículo — pro select dependente
 * (cliente -> veículo) do formulário de OS filtrar no cliente sem outra
 * viagem ao servidor a cada troca de cliente. */
export async function listVehiclesForSelect() {
  const { db, organizationId } = await withOrg();

  return db
    .select({
      id: vehicles.id,
      plate: vehicles.plate,
      brand: vehicles.brand,
      model: vehicles.model,
      customerId: vehicles.customerId,
    })
    .from(vehicles)
    .where(eq(vehicles.organizationId, organizationId))
    .orderBy(vehicles.plate);
}

export async function listVehiclesByCustomer(customerId: string) {
  const { db, organizationId } = await withOrg();

  return db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.customerId, customerId), eq(vehicles.organizationId, organizationId)))
    .orderBy(desc(vehicles.createdAt));
}

/** Total de veículos — pro card "Veículos" do painel (`(app)/page.tsx`). */
export async function getVehicleDashboardSummary() {
  const { db, organizationId } = await withOrg();

  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(vehicles)
    .where(eq(vehicles.organizationId, organizationId));

  return row;
}

export async function getVehicleById(id: string) {
  const { db, organizationId } = await withOrg();

  const [vehicle] = await db
    .select({
      id: vehicles.id,
      organizationId: vehicles.organizationId,
      customerId: vehicles.customerId,
      plate: vehicles.plate,
      brand: vehicles.brand,
      model: vehicles.model,
      year: vehicles.year,
      color: vehicles.color,
      fuel: vehicles.fuel,
      chassis: vehicles.chassis,
      currentKm: vehicles.currentKm,
      createdAt: vehicles.createdAt,
      updatedAt: vehicles.updatedAt,
      customerName: customers.name,
    })
    .from(vehicles)
    .innerJoin(customers, eq(customers.id, vehicles.customerId))
    .where(and(eq(vehicles.id, id), eq(vehicles.organizationId, organizationId)))
    .limit(1);

  return vehicle ?? null;
}
