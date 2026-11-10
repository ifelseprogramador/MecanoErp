import { FileDown, FileUp, List, UserPlus, Users } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { FacilFilters } from "@/components/facil/facil-filters";
import { hasActiveFilter } from "@/core/list-filters";
import { FacilKpi } from "@/components/facil/facil-kpi";
import { FacilModuleHome } from "@/components/facil/facil-page";
import { FacilList } from "@/components/facil/facil-list";
import { FacilTile } from "@/components/facil/facil-tile";
import { formatDocument } from "@/core/document";
import { getCustomerDashboardSummary, listCustomers } from "../queries";
import { PendingCustomers } from "./pending-customers";
import {
  CUSTOMER_DEFAULT_SORT,
  CUSTOMER_FILTERS,
  CUSTOMER_SORT_CHOICES,
  type CustomerListOptions,
} from "../list-config";

/** Quantos clientes aparecem de início; o resto fica em "Ver todos". */
const INITIAL_LIMIT = 12;

/**
 * Janela inicial de Clientes no modo Fácil: métricas, cards de ação, busca
 * grande e os clientes mais recentes em cards. Usa as mesmas queries da tela
 * formal. Com busca ou "Ver todos" (`?ver=todos`) mostra a lista inteira.
 */
export async function ClientesFacilHome({
  options,
  showAll,
}: {
  options: CustomerListOptions;
  showAll: boolean;
}) {
  const filtered = hasActiveFilter(options);
  const [customers, summary] = await Promise.all([
    listCustomers(options),
    getCustomerDashboardSummary(),
  ]);

  const everything = showAll || filtered;

  return (
    <FacilModuleHome
      title="Clientes"
      subtitle="Quem compra de você"
      icon={Users}
      kpis={
        <>
          <FacilKpi icon={Users} label="Clientes cadastrados" value={summary.total} index={0} />
          <FacilKpi
            icon={UserPlus}
            label="Novos nos últimos 30 dias"
            value={summary.newLast30Days}
            index={1}
          />
        </>
      }
      actions={
        <>
          <FacilTile
            href="/clientes/novo"
            label="Novo cliente"
            icon={UserPlus}
            size="lg"
            index={0}
          />
          {!everything && (
            <FacilTile
              href="/clientes?ver=todos"
              label="Ver todos"
              icon={List}
              size="lg"
              index={1}
            />
          )}
          <FacilTile
            href="/clientes/importar"
            label="Importar planilha"
            icon={FileUp}
            size="lg"
            index={2}
          />
          <FacilTile
            href="/clientes/exportar"
            label="Baixar planilha"
            icon={FileDown}
            size="lg"
            index={3}
            download
          />
        </>
      }
    >
      <SearchBox large placeholder="Buscar cliente pelo nome ou CPF/CNPJ" />
      <FacilFilters
        filters={CUSTOMER_FILTERS}
        sortOptions={CUSTOMER_SORT_CHOICES}
        defaultSort={CUSTOMER_DEFAULT_SORT}
      />
      <PendingCustomers />
      <FacilList
        items={customers.map((customer) => ({
          id: customer.id,
          href: `/clientes/${customer.id}`,
          title: customer.name,
          subtitle:
            customer.phone ?? (customer.document ? formatDocument(customer.document) : undefined),
          badge: customer.type === "pj" ? "Empresa" : undefined,
        }))}
        limit={everything ? Number.POSITIVE_INFINITY : INITIAL_LIMIT}
        moreHref="/clientes?ver=todos"
        emptyTitle={filtered ? "Nenhum cliente encontrado" : "Você ainda não tem clientes"}
        emptyHint={
          filtered ? "Tente outro filtro ou limpe a busca." : "Que tal cadastrar o primeiro agora?"
        }
        emptyAction={
          filtered ? undefined : (
            <FacilTile href="/clientes/novo" label="Novo cliente" icon={UserPlus} size="lg" />
          )
        }
      />
    </FacilModuleHome>
  );
}
