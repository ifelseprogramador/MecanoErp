"use client";

import { useOfflineCreateAction } from "@/core/offline/use-offline-create-action";
import { createVehicle } from "../actions";
import { parseVehicleFormData } from "../validation";
import { VehicleForm } from "./vehicle-form";

/**
 * Wrapper client-only em volta de `VehicleForm` só pra aplicar o plano B
 * offline — mesmo padrão de `modules/clientes/components/new-customer-form.tsx`.
 */
export function NewVehicleForm({
  customers,
  defaultCustomerId,
}: {
  customers: { id: string; name: string }[];
  defaultCustomerId?: string;
}) {
  const action = useOfflineCreateAction(createVehicle, {
    module: "veiculos",
    entity: "vehicle",
    actionName: "createVehicle",
    parse: (formData) => {
      const result = parseVehicleFormData(formData);
      if (!result.success) {
        return { success: false, errors: result.error.flatten().fieldErrors };
      }
      return { success: true, data: result.data };
    },
    label: (data) => data.plate,
    pendingPath: (id) => `/veiculos/pendente?id=${id}`,
  });

  return (
    <VehicleForm customers={customers} defaultCustomerId={defaultCustomerId} action={action} />
  );
}
