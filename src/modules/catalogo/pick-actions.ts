"use server";

import { and, asc, eq, ilike } from "drizzle-orm";
import { requireModule } from "@/core/auth";
import { formatCents } from "@/core/money";
import type { FacilOption, MiniResult } from "@/components/facil/facil-search";
import { createCatalogItemRecord } from "./actions";
import { catalogItems } from "./schema";
import { parseCatalogItemFormData } from "./validation";

const SEARCH_LIMIT = 20;
const RECENT_LIMIT = 8;

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

function toOption(item: {
  id: string;
  type: "servico" | "peca";
  name: string;
  unit: string;
  defaultPriceCents: number;
}): FacilOption {
  return {
    value: item.id,
    label: item.name,
    subtitle: `${item.type === "servico" ? "Serviço" : "Peça"} · ${formatCents(item.defaultPriceCents)} por ${item.unit}`,
    priceCents: item.defaultPriceCents,
    extras: { type: item.type, unit: item.unit },
  };
}

/**
 * Peças e serviços para a lista de itens do modo Fácil: busca por nome direto
 * no banco, com limite. Sem texto devolve os primeiros em ordem alfabética.
 */
export async function searchCatalogForPick(term: string): Promise<FacilOption[]> {
  const { withDb, organizationId } = await requireModule("catalogo");
  const text = String(term ?? "")
    .trim()
    .slice(0, 80);

  const rows = await withDb((tx) =>
    tx
      .select({
        id: catalogItems.id,
        type: catalogItems.type,
        name: catalogItems.name,
        unit: catalogItems.unit,
        defaultPriceCents: catalogItems.defaultPriceCents,
      })
      .from(catalogItems)
      .where(
        and(
          eq(catalogItems.organizationId, organizationId),
          text ? ilike(catalogItems.name, `%${escapeLike(text)}%`) : undefined,
        ),
      )
      .orderBy(asc(catalogItems.name))
      .limit(text ? SEARCH_LIMIT : RECENT_LIMIT),
  );
  return rows.map(toOption);
}

/**
 * Cadastro rápido de peça/serviço (tipo, nome, preço) de dentro de outro
 * fluxo. MESMA validação (`parseCatalogItemFormData`) e MESMA gravação
 * (`createCatalogItemRecord`) do cadastro completo.
 */
export async function quickCreateCatalogItem(values: Record<string, string>): Promise<MiniResult> {
  await requireModule("catalogo");
  const formData = new FormData();
  formData.set("type", values.type === "servico" ? "servico" : "peca");
  formData.set("name", String(values.name ?? ""));
  formData.set("defaultPrice", String(values.price ?? ""));
  // Opcional ("Mais dados"): vazio = unidade padrão ("un").
  formData.set("unit", String(values.unit ?? ""));

  const parsed = parseCatalogItemFormData(formData);
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    // O campo do mini-formulário chama-se `price`; a validação, `defaultPriceCents`.
    const { defaultPriceCents, ...rest } = fields;
    return {
      ok: false,
      errors: { ...rest, ...(defaultPriceCents ? { price: defaultPriceCents } : {}) },
    };
  }
  const result = await createCatalogItemRecord(parsed.data);
  if (!result.ok || !result.id) {
    return { ok: false, message: result.message ?? "Não foi possível cadastrar o item." };
  }
  return {
    ok: true,
    option: toOption({
      id: result.id,
      type: parsed.data.type,
      name: parsed.data.name,
      unit: parsed.data.unit,
      defaultPriceCents: parsed.data.defaultPriceCents,
    }),
  };
}
