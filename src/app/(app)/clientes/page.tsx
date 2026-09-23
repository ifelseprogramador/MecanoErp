import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  CUSTOMER_SORT_OPTIONS,
  type CustomerSort,
  listCustomers,
} from "@/modules/clientes/queries";
import { CustomerTable } from "@/modules/clientes/components/customer-table";
import { PendingCustomers } from "@/modules/clientes/components/pending-customers";
import { SearchBox } from "@/components/search-box";
import { ListFilterBar } from "@/components/list-filter-bar";

export default async function CustomersPage({ searchParams }: PageProps<"/clientes">) {
  const { q, type, sort } = await searchParams;
  const search = typeof q === "string" ? q : undefined;
  const customerType = type === "pf" || type === "pj" ? type : undefined;
  const customerSort =
    typeof sort === "string" && sort in CUSTOMER_SORT_OPTIONS ? (sort as CustomerSort) : undefined;
  const customers = await listCustomers({ search, type: customerType, sort: customerSort });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <Button nativeButton={false} render={<Link href="/clientes/novo" />}>
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchBox placeholder="Buscar por nome ou CPF/CNPJ..." />
        <ListFilterBar
          filters={[
            {
              param: "type",
              allLabel: "Todos os tipos",
              options: [
                { value: "pf", label: "Pessoa física" },
                { value: "pj", label: "Pessoa jurídica" },
              ],
            },
          ]}
          sortOptions={Object.entries(CUSTOMER_SORT_OPTIONS).map(([value, label]) => ({
            value,
            label,
          }))}
          defaultSort="created_desc"
        />
      </div>
      <PendingCustomers />
      <CustomerTable customers={customers} />
    </div>
  );
}
