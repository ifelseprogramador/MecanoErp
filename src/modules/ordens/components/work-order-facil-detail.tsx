import {
  Banknote,
  Car,
  ClipboardList,
  Gauge,
  ListChecks,
  MessageSquareText,
  Pencil,
  Printer,
  Stethoscope,
  UserRound,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareDocumentButton } from "@/components/share-document-button";
import { CreatedBanner } from "@/components/created-banner";
import { HistoryCard } from "@/components/history-card";
import { FacilInfo } from "@/components/facil/facil-info";
import { FacilPage } from "@/components/facil/facil-page";
import { FacilList } from "@/components/facil/facil-list";
import { FacilActions, FacilTile } from "@/components/facil/facil-tile";
import { formatPlate } from "@/core/format";
import { formatCents } from "@/core/money";
import type { ActionResult } from "@/core/action-result";
import {
  addWorkOrderItem,
  removeWorkOrderItem,
  transitionWorkOrderStatus,
  updateWorkOrderHeader,
} from "../actions";
import { areItemsEditable, isHeaderEditable, isTerminalStatus } from "../domain";
import type { WorkOrder, WorkOrderItem } from "../schema.types";
import { WorkOrderForm } from "./work-order-form";
import { WorkOrderItemsEditor } from "./work-order-items-editor";
import { WorkOrderStatusActions } from "./work-order-status-actions";
import { WORK_ORDER_STATUS_LABELS, WorkOrderStatusBadge } from "./work-order-status-badge";

type OrderWithNames = WorkOrder & { customerName: string; vehiclePlate: string };

/**
 * Ficha da OS no modo Fácil: situação com o botão grande do PRÓXIMO PASSO
 * (o mesmo `WorkOrderStatusActions` da tela formal), dados em linhas simples,
 * itens em cards e cards de ação. Itens e dados só se abrem sob demanda
 * (`?acao=itens` / `?acao=editar`), reaproveitando os editores formais — a
 * janela mostra só o necessário. Composição entre módulos (clientes, veículos,
 * catálogo, envio) chega pronta da página.
 */
export function WorkOrderFacilDetail({
  order,
  items,
  customers,
  vehicles,
  catalogItems,
  shareAction,
  created,
  acao,
}: {
  order: OrderWithNames;
  items: WorkOrderItem[];
  customers: { id: string; name: string }[];
  vehicles: {
    id: string;
    plate: string;
    brand: string | null;
    model: string | null;
    customerId: string;
  }[];
  catalogItems: {
    id: string;
    type: "servico" | "peca";
    name: string;
    unit: string;
    defaultPriceCents: number;
  }[];
  shareAction: () => Promise<ActionResult>;
  created: boolean;
  acao?: string;
}) {
  const headerEditable = isHeaderEditable(order.status);
  const itemsEditable = areItemsEditable(order.status);
  const editingItems = acao === "itens";
  const editingHeader = acao === "editar" && headerEditable;
  const here = `/ordens/${order.id}`;

  return (
    <FacilPage
      title={`OS nº ${order.number}`}
      subtitle={`${order.customerName} · ${formatPlate(order.vehiclePlate)}`}
      icon={ClipboardList}
      backHref="/ordens"
      backLabel="Ordens de serviço"
    >
      {created && (
        <CreatedBanner
          message="Ordem de serviço criada com sucesso."
          createAnotherHref="/ordens/novo"
          createAnotherLabel="Criar outra"
        />
      )}

      <div className="bg-card flex flex-col items-center gap-4 rounded-2xl p-5 text-center ring-1 ring-black/5 dark:ring-white/10">
        <WorkOrderStatusBadge status={order.status} />
        <p className="text-muted-foreground text-sm">
          {isTerminalStatus(order.status)
            ? order.status === "cancelada"
              ? "Esta ordem de serviço foi cancelada."
              : "Esta ordem de serviço já foi entregue."
            : "Quando terminar esta etapa, avance a ordem:"}
        </p>
        <WorkOrderStatusActions
          orderId={order.id}
          status={order.status}
          transitionAction={transitionWorkOrderStatus}
        />
      </div>

      <FacilInfo
        rows={[
          {
            icon: UserRound,
            label: "Cliente",
            value: order.customerName,
            href: `/clientes/${order.customerId}`,
          },
          {
            icon: Car,
            label: "Veículo",
            value: formatPlate(order.vehiclePlate),
            href: `/veiculos/${order.vehicleId}`,
          },
          { icon: Gauge, label: "Km de entrada", value: order.kmEntrada },
          { icon: MessageSquareText, label: "Relato", value: order.relatoCliente },
          { icon: Stethoscope, label: "Diagnóstico", value: order.diagnostico },
          {
            icon: Banknote,
            label: "Desconto",
            value: order.discountCents > 0 ? `-${formatCents(order.discountCents)}` : null,
          },
          { icon: Banknote, label: "Total", value: formatCents(order.totalCents) },
        ]}
      />

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Wrench className="text-primary h-6 w-6" />
          Itens da OS
        </h2>
        <FacilList
          items={items.map((item) => ({
            id: item.id,
            title: item.description,
            subtitle: `${Number(item.quantity)} × ${formatCents(item.unitPriceCents)}`,
            badge: formatCents(item.totalCents ?? 0),
            icon: Wrench,
          }))}
          emptyTitle="Nenhum item ainda"
          emptyHint="Adicione os serviços e as peças desta ordem."
        />
      </section>

      <FacilActions>
        {itemsEditable && (
          <FacilTile
            href={editingItems ? here : `${here}?acao=itens`}
            label={editingItems ? "Fechar itens" : "Adicionar ou tirar itens"}
            icon={ListChecks}
            size="lg"
            index={0}
          />
        )}
        {headerEditable && (
          <FacilTile
            href={editingHeader ? here : `${here}?acao=editar`}
            label={editingHeader ? "Fechar edição" : "Editar dados"}
            icon={Pencil}
            size="lg"
            index={1}
          />
        )}
        <FacilTile href={`${here}/imprimir`} label="Imprimir" icon={Printer} size="lg" index={2} />
      </FacilActions>

      <div className="flex justify-center">
        <ShareDocumentButton
          action={shareAction}
          label={order.status === "orcamento" ? "Enviar orçamento" : "Enviar ao cliente"}
        />
      </div>

      {editingItems && itemsEditable && (
        <Card>
          <CardHeader>
            <CardTitle>Itens</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkOrderItemsEditor
              orderId={order.id}
              items={items}
              catalogItems={catalogItems}
              addAction={addWorkOrderItem.bind(null, order.id)}
              removeAction={removeWorkOrderItem}
              disabled={!itemsEditable}
            />
          </CardContent>
        </Card>
      )}

      {editingHeader && (
        <Card>
          <CardHeader>
            <CardTitle>Dados da ordem de serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <WorkOrderForm
              order={order}
              customers={customers}
              vehicles={vehicles}
              action={updateWorkOrderHeader.bind(null, order.id)}
            />
          </CardContent>
        </Card>
      )}

      <HistoryCard
        entityTable="work_orders"
        entityId={order.id}
        labels={WORK_ORDER_STATUS_LABELS}
        createdBy={order.createdBy}
        createdAt={order.createdAt}
        updatedBy={order.updatedBy}
        updatedAt={order.updatedAt}
      />
    </FacilPage>
  );
}
