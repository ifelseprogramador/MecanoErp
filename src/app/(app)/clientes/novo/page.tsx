import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerForm } from "@/modules/clientes/components/customer-form";
import { createCustomer } from "@/modules/clientes/actions";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Novo cliente</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm action={createCustomer} />
        </CardContent>
      </Card>
    </div>
  );
}
