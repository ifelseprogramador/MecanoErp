import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewCustomerForm } from "@/modules/clientes/components/new-customer-form";

export default function NewCustomerPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Novo cliente</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <NewCustomerForm />
        </CardContent>
      </Card>
    </div>
  );
}
