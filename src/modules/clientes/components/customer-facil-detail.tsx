import { Building2, Car, IdCard, Mail, Pencil, Phone, Plus, Printer, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CreatedBanner } from "@/components/created-banner";
import { HistoryCard } from "@/components/history-card";
import { FacilPage } from "@/components/facil/facil-page";
import { FacilList } from "@/components/facil/facil-list";
import { FacilActions, FacilTile } from "@/components/facil/facil-tile";
import { formatDocument } from "@/core/document";
import { formatPlate } from "@/core/format";
import { deleteCustomer, updateCustomer } from "../actions";
import type { CustomerWithAddress } from "../schema.types";
import { CustomerForm } from "./customer-form";

interface VehicleSummary {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
}

/**
 * Ficha do cliente no modo Fácil: os dados principais em linhas simples,
 * cards de ação (editar, novo veículo, imprimir) e os veículos em cards. A
 * edição completa reaproveita o `CustomerForm` formal, só que escondido atrás
 * de "Editar dados" (`?editar=1`) — quem não precisa não vê campo nenhum.
 */
export function CustomerFacilDetail({
  customer,
  vehicles,
  created,
  editing,
}: {
  customer: CustomerWithAddress;
  vehicles: VehicleSummary[];
  created: boolean;
  editing: boolean;
}) {
  const details = [
    {
      icon: Phone,
      label: "Telefone",
      value: customer.phone,
      href: customer.phone ? `tel:${customer.phone}` : undefined,
    },
    {
      icon: Mail,
      label: "E-mail",
      value: customer.email,
      href: customer.email ? `mailto:${customer.email}` : undefined,
    },
    {
      icon: IdCard,
      label: "CPF/CNPJ",
      value: customer.document ? formatDocument(customer.document) : null,
    },
  ].filter((row) => row.value);

  return (
    <FacilPage
      title={customer.name}
      subtitle={customer.type === "pj" ? "Empresa" : "Pessoa"}
      icon={customer.type === "pj" ? Building2 : User}
      backHref="/clientes"
      backLabel="Clientes"
    >
      {created && (
        <CreatedBanner
          message="Cliente cadastrado com sucesso."
          createAnotherHref="/clientes/novo"
          createAnotherLabel="Cadastrar outro"
        />
      )}

      {details.length > 0 && (
        <dl className="bg-card divide-y rounded-2xl ring-1 ring-black/5 dark:ring-white/10">
          {details.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="flex items-center gap-4 p-4">
              <Icon className="text-primary h-6 w-6 shrink-0" />
              <dt className="text-muted-foreground w-24 shrink-0">{label}</dt>
              <dd className="min-w-0 truncate text-lg font-medium">
                {href ? (
                  <a href={href} className="hover:underline">
                    {value}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <FacilActions>
        <FacilTile
          href={editing ? `/clientes/${customer.id}` : `/clientes/${customer.id}?editar=1`}
          label={editing ? "Fechar edição" : "Editar dados"}
          icon={Pencil}
          size="lg"
          index={0}
        />
        <FacilTile
          href={`/veiculos/novo?customerId=${customer.id}`}
          label="Novo veículo"
          icon={Plus}
          size="lg"
          index={1}
        />
        <FacilTile
          href={`/clientes/${customer.id}/imprimir`}
          label="Imprimir ficha"
          icon={Printer}
          size="lg"
          index={2}
        />
      </FacilActions>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Editar dados do cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerForm customer={customer} action={updateCustomer.bind(null, customer.id)} />
          </CardContent>
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Car className="text-primary h-6 w-6" />
          Veículos
        </h2>
        <FacilList
          items={vehicles.map((vehicle) => ({
            id: vehicle.id,
            href: `/veiculos/${vehicle.id}`,
            title: formatPlate(vehicle.plate),
            subtitle: [vehicle.brand, vehicle.model].filter(Boolean).join(" ") || undefined,
            icon: Car,
          }))}
          emptyTitle="Nenhum veículo cadastrado"
          emptyHint="Cadastre o carro deste cliente para abrir uma ordem de serviço."
        />
      </section>

      <HistoryCard
        createdBy={customer.createdBy}
        createdAt={customer.createdAt}
        updatedBy={customer.updatedBy}
        updatedAt={customer.updatedAt}
      />

      <div className="flex justify-center pt-2">
        <ConfirmDeleteButton
          title="Remover cliente"
          description="Essa ação não pode ser desfeita. O cliente só pode ser removido se não tiver veículos ou ordens de serviço vinculados."
          onConfirm={deleteCustomer.bind(null, customer.id)}
          redirectTo="/clientes"
        />
      </div>
    </FacilPage>
  );
}
