import { Car, ClipboardList, LayoutDashboard, Users, Wallet, Wrench } from "lucide-react";
import { getActiveOrg } from "@/core/auth";
import { formatCents } from "@/core/money";
import type { ModuleDefinition } from "@/core/registry";
import { formatPlate } from "@/core/format";
import { WORK_ORDER_STATUS_LABELS, type WorkOrderStatusFilter } from "@/modules/ordens";
import { FacilList } from "@/components/facil/facil-list";
import { loadPainelData } from "./painel-data";
import { FacilGrid } from "@/components/layout/facil-grid";
import { FacilKpi, FacilKpis } from "@/components/facil/facil-kpi";
import { FacilPage } from "@/components/facil/facil-page";

/**
 * Início do modo Fácil: as métricas que mais importam para a oficina (as
 * mesmas do painel formal, sem gráfico nem tabela) e, logo abaixo, os cards
 * dos módulos. Cada bloco só aparece e só é consultado se a pessoa tem
 * acesso ao módulo — `requireModule()` nas queries lançaria erro.
 */
export async function InicioFacil({
  org,
  modules,
}: {
  org: Awaited<ReturnType<typeof getActiveOrg>>;
  modules: ModuleDefinition[];
}) {
  const { customerSummary, vehicleSummary, orderSummary } = await loadPainelData(org);

  const kpis: React.ReactNode[] = [];
  if (orderSummary) {
    kpis.push(
      <FacilKpi
        key="abertas"
        icon={ClipboardList}
        label="OS abertas"
        value={orderSummary.openCount}
        hint={`${orderSummary.awaitingApprovalCount} aguardando aprovação`}
        href="/ordens"
        index={kpis.length}
      />,
      <FacilKpi
        key="andamento"
        icon={Wrench}
        label="Em andamento"
        value={orderSummary.inProgressCount}
        href="/ordens?status=em_andamento"
        index={kpis.length + 1}
      />,
      <FacilKpi
        key="faturamento"
        icon={Wallet}
        label="Faturamento do mês"
        value={formatCents(orderSummary.monthRevenueCents)}
        hint={`${orderSummary.monthCompletedCount} OS concluídas`}
        index={kpis.length + 2}
      />,
    );
  }
  if (customerSummary) {
    kpis.push(
      <FacilKpi
        key="clientes"
        icon={Users}
        label="Clientes"
        value={customerSummary.total}
        hint={`+${customerSummary.newLast30Days} nos últimos 30 dias`}
        href="/clientes"
        index={kpis.length}
      />,
    );
  }
  if (vehicleSummary) {
    kpis.push(
      <FacilKpi
        key="veiculos"
        icon={Car}
        label="Veículos"
        value={vehicleSummary.total}
        hint={vehicleSummary.total === 1 ? "1 veículo cadastrado" : undefined}
        href="/veiculos"
        index={kpis.length}
      />,
    );
  }

  return (
    <FacilPage
      title="O que você quer fazer?"
      subtitle={org.organizationName}
      icon={LayoutDashboard}
    >
      {kpis.length > 0 && <FacilKpis>{kpis}</FacilKpis>}

      {orderSummary && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Ordens por status</h2>
          <FacilKpis>
            {(Object.keys(WORK_ORDER_STATUS_LABELS) as WorkOrderStatusFilter[]).map((status, i) => (
              <FacilKpi
                key={status}
                icon={ClipboardList}
                label={WORK_ORDER_STATUS_LABELS[status]}
                value={orderSummary.byStatus[status]}
                href={`/ordens?status=${status}`}
                index={i}
              />
            ))}
          </FacilKpis>
        </section>
      )}

      {orderSummary && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Ordens de serviço recentes</h2>
          <FacilList
            items={orderSummary.recent.map((order) => ({
              id: order.id,
              href: `/ordens/${order.id}`,
              title: `#${order.number} — ${order.customerName}`,
              subtitle: `${formatPlate(order.vehiclePlate)} · ${formatCents(order.totalCents)}`,
              badge: WORK_ORDER_STATUS_LABELS[order.status],
              icon: Wrench,
            }))}
            emptyTitle="Nenhuma ordem de serviço ainda"
            moreHref="/ordens"
          />
        </section>
      )}

      <FacilGrid
        modules={modules}
        isOwner={org.role === "owner"}
        size="painel"
        includePainel={false}
      />
    </FacilPage>
  );
}
