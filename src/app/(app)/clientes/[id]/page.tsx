import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CreatedBanner } from "@/components/created-banner";
import { BackButton } from "@/components/back-button";
import { Plus, Printer } from "lucide-react";
import { formatPlate } from "@/core/format";
import { getCustomerById } from "@/modules/clientes/queries";
import { deleteCustomer, updateCustomer } from "@/modules/clientes/actions";
import { CustomerForm } from "@/modules/clientes/components/customer-form";
// Importado do barrel público do módulo (@/modules/veiculos), não de
// dentro dele — é a composição permitida na camada de rotas: uma página
// pode juntar dois módulos, um módulo nunca importa outro diretamente.
import { listVehiclesByCustomer } from "@/modules/veiculos";

export default async function CustomerDetailPage({
  params,
  searchParams,
}: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const { criado } = await searchParams;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const vehicles = await listVehiclesByCustomer(customer.id);
  const updateCustomerWithId = updateCustomer.bind(null, customer.id);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      {criado === "1" && (
        <CreatedBanner
          message="Cliente cadastrado com sucesso."
          createAnotherHref="/clientes/novo"
          createAnotherLabel="Cadastrar outro"
        />
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BackButton />
          <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/clientes/${customer.id}/imprimir`} target="_blank" />}
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <ConfirmDeleteButton
            title="Remover cliente"
            description="Essa ação não pode ser desfeita. O cliente só pode ser removido se não tiver veículos ou ordens de serviço vinculados."
            onConfirm={deleteCustomer.bind(null, customer.id)}
            redirectTo="/clientes"
          />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm customer={customer} action={updateCustomerWithId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Veículos</CardTitle>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/veiculos/novo?customerId=${customer.id}`} />}
          >
            <Plus className="h-4 w-4" />
            Novo veículo
          </Button>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum veículo cadastrado.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {vehicles.map((vehicle) => (
                <li key={vehicle.id}>
                  <Link href={`/veiculos/${vehicle.id}`} className="text-sm hover:underline">
                    {formatPlate(vehicle.plate)}
                    {vehicle.brand || vehicle.model
                      ? ` — ${[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}`
                      : ""}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
