import "server-only";
import { and, desc, eq, ilike } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { customers } from "@/modules/clientes/schema";
import { vehicles } from "./schema";

export async function listVehicles(search?: string) {
  const { db, organizationId } = await withOrg();

  const term = search?.trim();
  const conditions = [eq(vehicles.organizationId, organizationId)];
  if (term) {
    conditions.push(ilike(vehicles.plate, `%${term.toUpperCase().replace(/[^A-Z0-9]/g, "")}%`));
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
    .orderBy(desc(vehicles.createdAt));
}

export async function listVehiclesByCustomer(customerId: string) {
  const { db, organizationId } = await withOrg();

  return db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.customerId, customerId), eq(vehicles.organizationId, organizationId)))
    .orderBy(desc(vehicles.createdAt));
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
