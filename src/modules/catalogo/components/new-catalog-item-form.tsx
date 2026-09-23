"use client";

import { useOfflineCreateAction } from "@/core/offline/use-offline-create-action";
import { createCatalogItem } from "../actions";
import { parseCatalogItemFormData } from "../validation";
import { CatalogItemForm } from "./catalog-item-form";

/**
 * Wrapper client-only em volta de `CatalogItemForm` só pra aplicar o
 * plano B offline — mesmo padrão de
 * `modules/clientes/components/new-customer-form.tsx`.
 */
export function NewCatalogItemForm() {
  const action = useOfflineCreateAction(createCatalogItem, {
    module: "catalogo",
    entity: "catalog_item",
    actionName: "createCatalogItem",
    parse: (formData) => {
      const result = parseCatalogItemFormData(formData);
      if (!result.success) {
        return { success: false, errors: result.error.flatten().fieldErrors };
      }
      return { success: true, data: result.data };
    },
    label: (data) => data.name,
    pendingPath: (id) => `/catalogo/pendente?id=${id}`,
  });

  return <CatalogItemForm action={action} />;
}
