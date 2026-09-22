import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomerById } from "@/modules/clientes/queries";
import { updateCustomer } from "@/modules/clientes/actions";
import { CustomerForm } from "@/modules/clientes/components/customer-form";
import { DeleteCustomerButton } from "@/modules/clientes/components/delete-customer-button";

export default async function CustomerDetailPage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const updateCustomerWithId = updateCustomer.bind(null, customer.id);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
        <DeleteCustomerButton customerId={customer.id} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm customer={customer} action={updateCustomerWithId} />
        </CardContent>
      </Card>
    </div>
  );
}
