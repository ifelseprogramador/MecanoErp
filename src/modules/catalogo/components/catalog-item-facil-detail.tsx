import { Banknote, Package, Pencil, Printer, Ruler, Tag, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CreatedBanner } from "@/components/created-banner";
import { FacilInfo } from "@/components/facil/facil-info";
import { FacilPage } from "@/components/facil/facil-page";
import { FacilActions, FacilTile } from "@/components/facil/facil-tile";
import { formatCents } from "@/core/money";
import { deleteCatalogItem, updateCatalogItem } from "../actions";
import type { CatalogItem } from "../schema.types";
import { CatalogItemForm } from "./catalog-item-form";

/**
 * Ficha do item do catálogo no modo Fácil. A edição completa reaproveita o
 * `CatalogItemForm` formal atrás de "Editar dados" (`?editar=1`).
 */
export function CatalogItemFacilDetail({
  item,
  created,
  editing,
}: {
  item: CatalogItem;
  created: boolean;
  editing: boolean;
}) {
  const isService = item.type === "servico";
  return (
    <FacilPage
      title={item.name}
      subtitle={isService ? "Serviço" : "Peça"}
      icon={isService ? Wrench : Package}
      backHref="/catalogo"
      backLabel="Catálogo"
    >
      {created && (
        <CreatedBanner
          message="Item cadastrado com sucesso."
          createAnotherHref="/catalogo/novo"
          createAnotherLabel="Cadastrar outro"
        />
      )}

      <FacilInfo
        rows={[
          { icon: Tag, label: "Tipo", value: isService ? "Serviço" : "Peça" },
          { icon: Banknote, label: "Preço padrão", value: formatCents(item.defaultPriceCents) },
          { icon: Ruler, label: "Unidade", value: item.unit },
        ]}
      />

      <FacilActions>
        <FacilTile
          href={editing ? `/catalogo/${item.id}` : `/catalogo/${item.id}?editar=1`}
          label={editing ? "Fechar edição" : "Editar dados"}
          icon={Pencil}
          size="lg"
          index={0}
        />
        <FacilTile
          href={`/catalogo/${item.id}/imprimir`}
          label="Imprimir ficha"
          icon={Printer}
          size="lg"
          index={1}
        />
      </FacilActions>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Editar dados do item</CardTitle>
          </CardHeader>
          <CardContent>
            <CatalogItemForm item={item} action={updateCatalogItem.bind(null, item.id)} />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center pt-2">
        <ConfirmDeleteButton
          title="Remover item"
          description="Essa ação não pode ser desfeita. O item só pode ser removido se não estiver usado em nenhuma ordem de serviço."
          onConfirm={deleteCatalogItem.bind(null, item.id)}
          redirectTo="/catalogo"
        />
      </div>
    </FacilPage>
  );
}
