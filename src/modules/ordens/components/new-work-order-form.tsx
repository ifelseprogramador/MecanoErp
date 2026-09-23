"use client";

import { useOfflineCreateAction } from "@/core/offline/use-offline-create-action";
import { createWorkOrder } from "../actions";
import { parseWorkOrderHeaderFormData } from "../validation";
import { WorkOrderForm } from "./work-order-form";

interface SelectableCustomer {
  id: string;
  name: string;
}
interface SelectableVehicle {
  id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  customerId: string;
}

/**
 * Wrapper client-only em volta de `WorkOrderForm` só pra aplicar o plano
 * B offline — mesmo padrão de
 * `modules/clientes/components/new-customer-form.tsx`. Só cobre o
 * CABEÇALHO da OS (cliente, veículo, km, relato, desconto): itens são
 * adicionados depois, na página de detalhe, que só existe pra uma OS já
 * sincronizada — ver comentário em `actions.ts#createWorkOrderRecord`
 * sobre por que o número sequencial não é um problema aqui.
 */
export function NewWorkOrderForm({
  customers,
  vehicles,
}: {
  customers: SelectableCustomer[];
  vehicles: SelectableVehicle[];
}) {
  const action = useOfflineCreateAction(createWorkOrder, {
    module: "ordens",
    entity: "work_order",
    actionName: "createWorkOrder",
    parse: (formData) => {
      const result = parseWorkOrderHeaderFormData(formData);
      if (!result.success) {
        return { success: false, errors: result.error.flatten().fieldErrors };
      }
      return { success: true, data: result.data };
    },
    label: (data) => {
      const vehicle = vehicles.find((v) => v.id === data.vehicleId);
      return vehicle ? vehicle.plate : "Nova ordem de serviço";
    },
    pendingPath: (id) => `/ordens/pendente?id=${id}`,
  });

  return <WorkOrderForm customers={customers} vehicles={vehicles} action={action} />;
}
