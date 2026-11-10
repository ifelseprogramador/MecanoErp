import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FilterX,
  List,
  Plus,
  Wallet,
  Wrench,
} from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { FacilFilters } from "@/components/facil/facil-filters";
import { hasActiveFilter } from "@/core/list-filters";
import { FacilKpi } from "@/components/facil/facil-kpi";
import { FacilModuleHome } from "@/components/facil/facil-page";
import { FacilList } from "@/components/facil/facil-list";
import { FacilTile } from "@/components/facil/facil-tile";
import { formatPlate } from "@/core/format";
import { formatCents } from "@/core/money";
import { getWorkOrderDashboardSummary, listWorkOrders } from "../queries";
import { PendingWorkOrders } from "./pending-work-orders";
import { WORK_ORDER_STATUS_LABELS } from "./work-order-status-badge";
import {
  WORK_ORDER_DEFAULT_SORT,
  WORK_ORDER_FILTERS,
  WORK_ORDER_SORT_CHOICES,
  type WorkOrderListOptions,
} from "../list-config";

const INITIAL_LIMIT = 12;

/**
 * Janela inicial das Ordens de serviço no modo Fácil: métricas (as mesmas do
 * painel), cards de ação que já filtram por situação, busca grande e as OS em
 * cards. Mesmas queries da tela formal.
 */
export async function OrdensFacilHome({
  options,
  showAll,
}: {
  options: WorkOrderListOptions;
  showAll: boolean;
}) {
  const { status } = options;
  const filtered = hasActiveFilter(options);
  const [orders, summary] = await Promise.all([
    listWorkOrders(options),
    getWorkOrderDashboardSummary(),
  ]);
  const everything = showAll || filtered;

  return (
    <FacilModuleHome
      title="Ordens de serviço"
      subtitle={
        status
          ? `Mostrando: ${WORK_ORDER_STATUS_LABELS[status]}`
          : "Orçamentos e serviços da oficina"
      }
      icon={ClipboardList}
      kpis={
        <>
          <FacilKpi
            icon={ClipboardList}
            label="OS abertas"
            value={summary.openCount}
            hint={`${summary.awaitingApprovalCount} aguardando aprovação`}
            index={0}
          />
          <FacilKpi
            icon={Wrench}
            label="Em andamento"
            value={summary.inProgressCount}
            href="/ordens?status=em_andamento"
            index={1}
          />
          <FacilKpi
            icon={Wallet}
            label="Faturamento do mês"
            value={formatCents(summary.monthRevenueCents)}
            hint={`${summary.monthCompletedCount} OS concluídas`}
            index={2}
          />
        </>
      }
      actions={
        <>
          <FacilTile href="/ordens/novo" label="Novo orçamento" icon={Plus} size="lg" index={0} />
          <FacilTile
            href="/ordens?status=orcamento"
            label="Aguardando aprovação"
            icon={Clock}
            size="lg"
            index={1}
          />
          <FacilTile
            href="/ordens?status=em_andamento"
            label="Em andamento"
            icon={Wrench}
            size="lg"
            index={2}
          />
          <FacilTile
            href="/ordens?status=concluida"
            label="Concluídas"
            icon={CheckCircle2}
            size="lg"
            index={3}
          />
          {filtered ? (
            <FacilTile href="/ordens" label="Limpar filtro" icon={FilterX} size="lg" index={4} />
          ) : (
            !showAll && (
              <FacilTile
                href="/ordens?ver=todos"
                label="Ver todas"
                icon={List}
                size="lg"
                index={4}
              />
            )
          )}
          <FacilTile
            href="/ordens/exportar"
            label="Baixar planilha"
            icon={Download}
            size="lg"
            index={5}
            download
          />
        </>
      }
    >
      <SearchBox large placeholder="Buscar por cliente, placa ou número" />
      <FacilFilters
        filters={WORK_ORDER_FILTERS}
        sortOptions={WORK_ORDER_SORT_CHOICES}
        defaultSort={WORK_ORDER_DEFAULT_SORT}
      />
      <PendingWorkOrders />
      <FacilList
        items={orders.map((order) => ({
          id: order.id,
          href: `/ordens/${order.id}`,
          title: `OS nº ${order.number}`,
          subtitle: `${order.customerName} · ${formatPlate(order.vehiclePlate)} · ${formatCents(order.totalCents)}`,
          badge: WORK_ORDER_STATUS_LABELS[order.status],
          icon: ClipboardList,
        }))}
        limit={everything ? Number.POSITIVE_INFINITY : INITIAL_LIMIT}
        moreHref="/ordens?ver=todos"
        emptyTitle={filtered ? "Nenhuma OS encontrada" : "Nenhuma ordem de serviço ainda"}
        emptyHint={
          filtered ? "Tente outro filtro ou limpe a busca." : "Comece criando o primeiro orçamento."
        }
        emptyAction={
          filtered ? undefined : (
            <FacilTile href="/ordens/novo" label="Novo orçamento" icon={Plus} size="lg" />
          )
        }
      />
    </FacilModuleHome>
  );
}
