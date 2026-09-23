"use client";

import { useOfflineCreateAction } from "@/core/offline/use-offline-create-action";
import { createCustomer } from "../actions";
import { parseCustomerFormData } from "../validation";
import { CustomerForm } from "./customer-form";

/**
 * Wrapper client-only em volta de `CustomerForm` só pra aplicar o plano B
 * offline (`useOfflineCreateAction`, um hook — só funciona em Client
 * Component) sem precisar transformar a página `clientes/novo` inteira
 * num Client Component. `CustomerForm` continua sem saber que isso
 * existe: recebe a mesma assinatura de `action` de sempre.
 */
export function NewCustomerForm() {
  const action = useOfflineCreateAction(createCustomer, {
    module: "clientes",
    entity: "customer",
    actionName: "createCustomer",
    parse: (formData) => {
      const result = parseCustomerFormData(formData);
      if (!result.success) {
        return { success: false, errors: result.error.flatten().fieldErrors };
      }
      return { success: true, data: result.data };
    },
    label: (data) => data.name,
    pendingPath: (id) => `/clientes/pendente?id=${id}`,
  });

  return <CustomerForm action={action} />;
}
