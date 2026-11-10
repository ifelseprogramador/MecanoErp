"use server";

import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { requireModule } from "@/core/auth";
import { formatDocument } from "@/core/document";
import { CUSTOMER_QUICK_KEYS } from "@/components/facil/mini-fields";
import type { FacilOption, MiniResult } from "@/components/facil/facil-search";
import { createCustomerRecord } from "./actions";
import { customers } from "./schema";
import { parseCustomerFormData } from "./validation";

/** Quantos resultados uma busca devolve; sem texto, só os mais recentes. */
const SEARCH_LIMIT = 20;
const RECENT_LIMIT = 8;

/** `%` e `_` digitados pela pessoa não podem virar curinga do ILIKE. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

/**
 * Busca de clientes para o modo Fácil (campo de escolha com busca): por nome,
 * telefone ou CPF/CNPJ, direto no banco e com limite — aguenta cadastros
 * enormes. Sem texto devolve os últimos cadastrados.
 */
export async function searchCustomersForPick(term: string): Promise<FacilOption[]> {
  const { withDb, organizationId } = await requireModule("clientes");
  const text = String(term ?? "")
    .trim()
    .slice(0, 80);
  const digits = text.replace(/\D/g, "");
  const like = `%${escapeLike(text)}%`;

  const rows = await withDb((tx) =>
    tx
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        document: customers.document,
      })
      .from(customers)
      .where(
        and(
          eq(customers.organizationId, organizationId),
          text
            ? or(
                ilike(customers.name, like),
                ilike(customers.phone, like),
                digits ? ilike(customers.document, `%${digits}%`) : undefined,
              )
            : undefined,
        ),
      )
      .orderBy(text ? asc(customers.name) : desc(customers.createdAt))
      .limit(text ? SEARCH_LIMIT : RECENT_LIMIT),
  );

  return rows.map((row) => ({
    value: row.id,
    label: row.name,
    subtitle: row.phone ?? (row.document ? formatDocument(row.document) : undefined),
  }));
}

/**
 * Cadastro rápido (nome + telefone e, se a pessoa quiser, tipo, CPF/CNPJ e
 * e-mail) de dentro de outro fluxo, ex.: novo
 * orçamento. MESMA validação (`parseCustomerFormData`) e MESMA gravação
 * (`createCustomerRecord`) do cadastro completo — só não redireciona.
 */
export async function quickCreateCustomer(values: Record<string, string>): Promise<MiniResult> {
  await requireModule("clientes");
  const formData = new FormData();
  // Todos os campos do cadastro completo; os de "Mais dados" vazios = não informado.
  for (const key of CUSTOMER_QUICK_KEYS) formData.set(key, String(values[key] ?? ""));
  formData.set("type", values.type === "pj" ? "pj" : "pf");

  const parsed = parseCustomerFormData(formData);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const result = await createCustomerRecord(parsed.data);
  if (!result.ok || !result.id) {
    return { ok: false, message: result.message ?? "Não foi possível cadastrar o cliente." };
  }
  return {
    ok: true,
    option: { value: result.id, label: parsed.data.name, subtitle: parsed.data.phone },
  };
}
