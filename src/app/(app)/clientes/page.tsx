import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { listCustomers } from "@/modules/clientes/queries";
import { CustomerTable } from "@/modules/clientes/components/customer-table";
import { CustomerSearch } from "@/modules/clientes/components/customer-search";

export default async function CustomersPage({ searchParams }: PageProps<"/clientes">) {
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : undefined;
  const customers = await listCustomers(search);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <Button render={<Link href="/clientes/novo" />}>
          <Plus className="h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      <CustomerSearch />
      <CustomerTable customers={customers} />
    </div>
  );
}
