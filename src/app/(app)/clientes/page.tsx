import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { PageIcon } from "@/components/page-icon";
import { listCustomers } from "@/modules/clientes/queries";
import {
  CUSTOMER_DEFAULT_SORT,
  CUSTOMER_FILTERS,
  CUSTOMER_SORT_CHOICES,
  parseCustomerListParams,
} from "@/modules/clientes/list-config";
import { CustomerTable } from "@/modules/clientes/components/customer-table";
import { PendingCustomers } from "@/modules/clientes/components/pending-customers";
import { SearchBox } from "@/components/search-box";
import { ListFilterBar } from "@/components/list-filter-bar";
import { SpreadsheetMenu } from "@/components/spreadsheet-menu";
import { getCurrentUiMode } from "@/core/profile/current-ui-mode";
import { ClientesFacilHome } from "@/modules/clientes/components/clientes-facil";

export default async function CustomersPage({ searchParams }: PageProps<"/clientes">) {
  const sp = await searchParams;
  const options = parseCustomerListParams(sp);
  if ((await getCurrentUiMode()) === "facil") {
    return <ClientesFacilHome options={options} showAll={sp.ver === "todos"} />;
  }

  const customers = await listCustomers(options);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <PageIcon icon={Users} />
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        </div>
        <div className="flex items-center gap-2">
          <SpreadsheetMenu importHref="/clientes/importar" exportHref="/clientes/exportar" />
          <Button nativeButton={false} render={<Link href="/clientes/novo" />}>
            <Plus className="h-4 w-4" />
            Novo cliente
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Buscar por nome ou CPF/CNPJ..." />
        <ListFilterBar
          filters={CUSTOMER_FILTERS}
          sortOptions={CUSTOMER_SORT_CHOICES}
          defaultSort={CUSTOMER_DEFAULT_SORT}
        />
      </div>
      <PendingCustomers />
      <CustomerTable customers={customers} />
    </div>
  );
}
