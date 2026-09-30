"use server";

/**
 * Orquestração ordens/clientes → documento compartilhável (`core/share`).
 * Monta o snapshot (orçamento quando a OS ainda está em `orcamento`, ordem
 * de serviço nos demais estados) e devolve o link público para o
 * `ShareDocumentButton`. Vive em `app/` porque cruza módulos.
 */
import { eq } from "drizzle-orm";
import { withOrg } from "@/core/auth";
import { formatCents } from "@/core/money";
import { formatDate, formatPlate } from "@/core/format";
import { formatAddressLine } from "@/core/fiscal-fields";
import { formatDocument } from "@/core/document";
import { organizations } from "@/db/schema";
import { createSharedDocument, type ShareLinkResult } from "@/core/share/create";
import type { ShareDocumentInput } from "@/core/share/document";
import { getWorkOrderById, listWorkOrderItems } from "@/modules/ordens/queries";
import { WORK_ORDER_STATUS_LABELS } from "@/modules/ordens";
import { getCustomerById } from "@/modules/clientes/queries";

export async function compartilharOrdem(orderId: string): Promise<ShareLinkResult> {
  const { organizationId, withDb } = await withOrg();
  const [order, items, [org]] = await Promise.all([
    getWorkOrderById(orderId),
    listWorkOrderItems(orderId),
    withDb((db) =>
      db
        .select({
          name: organizations.name,
          document: organizations.document,
          phone: organizations.phone,
          address: organizations.address,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1),
    ),
  ]);
  if (!order || !org) return { ok: false, message: "Ordem de serviço não encontrada." };
  const customer = await getCustomerById(order.customerId);
  if (!customer) return { ok: false, message: "Cliente da ordem não encontrado." };

  const isOrcamento = order.status === "orcamento";
  const veiculo = [formatPlate(order.vehiclePlate), order.vehicleBrand, order.vehicleModel]
    .filter(Boolean)
    .join(" ");

  const doc: ShareDocumentInput = {
    kind: isOrcamento ? "orcamento" : "ordem_servico",
    title: isOrcamento
      ? "Orçamento de serviço"
      : `Ordem de serviço — ${WORK_ORDER_STATUS_LABELS[order.status]}`,
    number: String(order.number),
    issuerName: org.name,
    issuerLines: [
      org.document ? formatDocument(org.document) : "",
      org.phone ?? "",
      org.address ?? "",
    ].filter(Boolean),
    customerName: customer.name,
    customerLines: [
      customer.document ? formatDocument(customer.document) : "",
      customer.phone ?? "",
      formatAddressLine(customer.endereco) || customer.address || "",
    ].filter(Boolean),
    sections: [
      {
        heading: "Veículo e atendimento",
        rows: [
          { label: "Veículo", value: veiculo },
          ...(order.kmEntrada != null
            ? [{ label: "Km de entrada", value: String(order.kmEntrada) }]
            : []),
          { label: "Emitida em", value: formatDate(order.createdAt) },
          ...(order.relatoCliente ? [{ label: "Relato", value: order.relatoCliente }] : []),
          ...(order.diagnostico ? [{ label: "Diagnóstico", value: order.diagnostico }] : []),
        ],
      },
    ],
    table: {
      columns: [
        { label: "Descrição" },
        { label: "Qtd", align: "right" },
        { label: "Unitário", align: "right" },
        { label: "Total", align: "right" },
      ],
      rows: items.map((i) => [
        i.description,
        String(Number(i.quantity)),
        formatCents(i.unitPriceCents),
        formatCents(i.totalCents ?? 0),
      ]),
    },
    totals: [
      ...(order.discountCents > 0
        ? [{ label: "Desconto", value: `-${formatCents(order.discountCents)}` }]
        : []),
      { label: "Total", value: formatCents(order.totalCents), strong: true },
    ],
  };

  return createSharedDocument(doc, {
    recipient: { name: customer.name, phone: customer.phone, email: customer.email },
    source: { type: "work_order", id: order.id },
  });
}
