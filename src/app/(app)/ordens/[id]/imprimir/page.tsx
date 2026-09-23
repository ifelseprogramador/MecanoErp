import { notFound } from "next/navigation";
import { formatCents } from "@/core/money";
import { formatDate, formatPlate } from "@/core/format";
import { getWorkOrderById, listWorkOrderItems } from "@/modules/ordens/queries";
import { getActiveOrg } from "@/core/auth";
import { WorkOrderStatusBadge } from "@/modules/ordens/components/work-order-status-badge";
import { AutoPrint } from "@/components/auto-print";

/**
 * Impressão/PDF sem dependência nenhuma: CSS puro (`print:`, ver
 * `(app)/layout.tsx` escondendo a barra lateral/topo) + o diálogo nativo
 * de impressão do navegador (Ctrl+P, que também serve pra "salvar como
 * PDF"), aberto sozinho por `<AutoPrint />` assim que a página carrega —
 * a pessoa não precisa apertar Ctrl+P na mão depois de clicar em
 * "Imprimir". Zero lib de geração de PDF no servidor.
 */
export default async function PrintWorkOrderPage({ params }: PageProps<"/ordens/[id]/imprimir">) {
  const { id } = await params;
  const [order, items, org] = await Promise.all([
    getWorkOrderById(id),
    listWorkOrderItems(id),
    getActiveOrg(),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 text-sm">
      <AutoPrint />
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold">{org.organizationName}</h1>
          <p className="text-muted-foreground">Ordem de serviço nº {order.number}</p>
        </div>
        <div className="text-right">
          <WorkOrderStatusBadge status={order.status} />
          <p className="text-muted-foreground mt-1">Emitida em {formatDate(order.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold">Cliente</h2>
          <p>{order.customerName}</p>
          {order.customerPhone && <p className="text-muted-foreground">{order.customerPhone}</p>}
        </div>
        <div>
          <h2 className="font-semibold">Veículo</h2>
          <p>{formatPlate(order.vehiclePlate)}</p>
          {(order.vehicleBrand || order.vehicleModel) && (
            <p className="text-muted-foreground">
              {order.vehicleBrand} {order.vehicleModel}
            </p>
          )}
          {order.kmEntrada != null && (
            <p className="text-muted-foreground">Km de entrada: {order.kmEntrada}</p>
          )}
        </div>
      </div>

      {order.relatoCliente && (
        <div>
          <h2 className="font-semibold">Relato do cliente</h2>
          <p>{order.relatoCliente}</p>
        </div>
      )}

      {order.diagnostico && (
        <div>
          <h2 className="font-semibold">Diagnóstico</h2>
          <p>{order.diagnostico}</p>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-semibold">Itens</h2>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b">
              <th className="py-1">Descrição</th>
              <th className="py-1">Qtd.</th>
              <th className="py-1">Valor unit.</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-1">{item.description}</td>
                <td className="py-1">{item.quantity}</td>
                <td className="py-1">{formatCents(item.unitPriceCents)}</td>
                <td className="py-1 text-right">{formatCents(item.totalCents ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 flex flex-col items-end gap-1">
          {order.discountCents > 0 && (
            <p className="text-muted-foreground">Desconto: -{formatCents(order.discountCents)}</p>
          )}
          <p className="text-base font-semibold">Total: {formatCents(order.totalCents)}</p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-8 pt-12 text-center">
        <div className="border-t pt-1">Assinatura da oficina</div>
        <div className="border-t pt-1">Assinatura do cliente</div>
      </div>
    </div>
  );
}
