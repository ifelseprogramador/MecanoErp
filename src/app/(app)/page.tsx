import Link from "next/link";
import { ClipboardList, Clock, FileClock, Plus, TrendingUp, Users, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hint } from "@/components/hint";
import { formatCents } from "@/core/money";
import { formatPlate } from "@/core/format";
import { getActiveOrg } from "@/core/auth";
import { getCustomerDashboardSummary } from "@/modules/clientes";
import { getVehicleDashboardSummary } from "@/modules/veiculos";
import {
  WORK_ORDER_STATUS_LABELS,
  WorkOrderStatusBadge,
  getWorkOrderDashboardSummary,
  type WorkOrderStatusFilter,
} from "@/modules/ordens";

const STATUS_BAR_COLORS: Record<WorkOrderStatusFilter, string> = {
  orcamento: "bg-muted-foreground/40",
  aprovada: "bg-blue-500",
  em_andamento: "bg-primary",
  concluida: "bg-emerald-500",
  entregue: "bg-violet-500",
  cancelada: "bg-destructive/60",
};

export default async function DashboardPage() {
  const [org, customerSummary, vehicleSummary, orderSummary] = await Promise.all([
    getActiveOrg(),
    getCustomerDashboardSummary(),
    getVehicleDashboardSummary(),
    getWorkOrderDashboardSummary(),
  ]);

  const maxStatusCount = Math.max(1, ...Object.values(orderSummary.byStatus));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
          <p className="text-muted-foreground text-sm">{org.organizationName}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/clientes/novo" />}
          >
            <Plus className="h-4 w-4" />
            Cliente
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/veiculos/novo" />}
          >
            <Plus className="h-4 w-4" />
            Veículo
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href="/ordens/novo" />}>
            <Plus className="h-4 w-4" />
            Orçamento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wrench}
          label="OS abertas"
          value={String(orderSummary.openCount)}
          hint={`${orderSummary.awaitingApprovalCount} aguardando aprovação`}
        />
        <KpiCard
          icon={Clock}
          label="Em andamento"
          value={String(orderSummary.inProgressCount)}
          hint="Serviços em execução agora"
        />
        <KpiCard
          icon={TrendingUp}
          label="Faturamento do mês"
          value={formatCents(orderSummary.monthRevenueCents)}
          hint={
            orderSummary.monthCompletedCount === 1
              ? "1 OS concluída"
              : `${orderSummary.monthCompletedCount} OS concluídas`
          }
          tooltip="Soma do total das ordens de serviço concluídas neste mês. Ainda não existe um módulo financeiro separado — este é o valor de serviço já finalizado."
        />
        <KpiCard
          icon={Users}
          label="Clientes"
          value={String(customerSummary.total)}
          hint={`+${customerSummary.newLast30Days} nos últimos 30 dias`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="text-primary h-4 w-4" />
              Ordens por status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(Object.keys(WORK_ORDER_STATUS_LABELS) as WorkOrderStatusFilter[]).map((status) => {
              const count = orderSummary.byStatus[status];
              return (
                <div key={status} className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-28 shrink-0">
                    {WORK_ORDER_STATUS_LABELS[status]}
                  </span>
                  <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full ${STATUS_BAR_COLORS[status]}`}
                      style={{ width: `${(count / maxStatusCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right font-medium">{count}</span>
                </div>
              );
            })}
            <p className="text-muted-foreground pt-2 text-xs">
              {vehicleSummary.total === 1
                ? "1 veículo cadastrado ao todo."
                : `${vehicleSummary.total} veículos cadastrados ao todo.`}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileClock className="text-primary h-4 w-4" />
              Ordens de serviço recentes
            </CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/ordens" />}>
              Ver todas
            </Button>
          </CardHeader>
          <CardContent>
            {orderSummary.recent.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Nenhuma ordem de serviço ainda —{" "}
                <Link href="/ordens/novo" className="underline">
                  criar a primeira
                </Link>
                .
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {orderSummary.recent.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link
                      href={`/ordens/${order.id}`}
                      className="flex min-w-0 flex-col hover:underline"
                    >
                      <span className="truncate text-sm font-medium">
                        #{order.number} — {order.customerName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatPlate(order.vehiclePlate)}
                      </span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-3">
                      <WorkOrderStatusBadge status={order.status} />
                      <span className="w-20 text-right text-sm font-medium">
                        {formatCents(order.totalCents)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tooltip,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  tooltip?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2 pt-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <p className="text-muted-foreground text-sm">{label}</p>
            {tooltip && <Hint>{tooltip}</Hint>}
          </div>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="text-muted-foreground text-xs">{hint}</p>
        </div>
        <div className="bg-accent text-accent-foreground rounded-lg p-2">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
