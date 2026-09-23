import { notFound } from "next/navigation";
import { formatDocument } from "@/core/document";
import { formatDate, formatPlate } from "@/core/format";
import { getCustomerById } from "@/modules/clientes/queries";
import { listVehiclesByCustomer } from "@/modules/veiculos";
import { getActiveOrg } from "@/core/auth";
import { AutoPrint } from "@/components/auto-print";

/** Impressão da ficha do cliente — mesmo padrão de
 * `(app)/ordens/[id]/imprimir/page.tsx` (ver comentário lá). */
export default async function PrintCustomerPage({ params }: PageProps<"/clientes/[id]/imprimir">) {
  const { id } = await params;
  const [customer, vehicles, org] = await Promise.all([
    getCustomerById(id),
    listVehiclesByCustomer(id),
    getActiveOrg(),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6 text-sm">
      <AutoPrint />
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold">{org.organizationName}</h1>
          <p className="text-muted-foreground">Ficha de cliente</p>
        </div>
        <p className="text-muted-foreground">Emitida em {formatDate(new Date())}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold">{customer.name}</h2>
        <p className="text-muted-foreground">
          {customer.type === "pf" ? "Pessoa física" : "Pessoa jurídica"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="CPF/CNPJ"
          value={customer.document ? formatDocument(customer.document) : "—"}
        />
        <Field label="Telefone" value={customer.phone || "—"} />
        <Field label="E-mail" value={customer.email || "—"} />
        <Field label="Endereço" value={customer.address || "—"} />
      </div>

      {customer.notes && (
        <div>
          <h3 className="font-semibold">Observações</h3>
          <p>{customer.notes}</p>
        </div>
      )}

      <div>
        <h3 className="mb-2 font-semibold">Veículos</h3>
        {vehicles.length === 0 ? (
          <p className="text-muted-foreground">Nenhum veículo cadastrado.</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b">
                <th className="py-1">Placa</th>
                <th className="py-1">Veículo</th>
                <th className="py-1">Ano</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b">
                  <td className="py-1">{formatPlate(vehicle.plate)}</td>
                  <td className="py-1">
                    {[vehicle.brand, vehicle.model].filter(Boolean).join(" ")}
                  </td>
                  <td className="py-1">{vehicle.year ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p>{value}</p>
    </div>
  );
}
