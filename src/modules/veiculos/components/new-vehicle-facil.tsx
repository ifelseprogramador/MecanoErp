"use client";

import { useState } from "react";
import {
  Car,
  Droplets,
  Flame,
  Fuel,
  Gauge,
  Leaf,
  Palette,
  UserRound,
  Zap,
  Ban,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  FacilSearchField,
  type FacilOption,
  type MiniResult,
} from "@/components/facil/facil-search";
import {
  FACIL_INPUT_CLASS,
  FacilChoiceField,
  FacilField,
  FacilWizard,
  type WizardStep,
} from "@/components/facil/facil-wizard";
import { customerMiniFields } from "@/components/facil/mini-fields";
import { useOfflineCreateAction } from "@/core/offline/use-offline-create-action";
import { createVehicle } from "../actions";
import { parseVehicleFormData } from "../validation";

const FUEL_LABELS: Record<string, string> = {
  gasolina: "Gasolina",
  etanol: "Etanol",
  flex: "Flex",
  diesel: "Diesel",
  eletrico: "Elétrico",
  gnv: "GNV",
};

/**
 * Cadastro de veículo no modo Fácil: uma pergunta por tela, com a MESMA
 * Server Action, a MESMA validação (`parseVehicleFormData`) e o MESMO plano B
 * offline do formulário formal (`NewVehicleForm`). Os `name` dos campos são
 * os de `vehicleSchema`.
 */
export function NewVehicleFacil({
  searchCustomers,
  createCustomer,
  defaultCustomer,
}: {
  /** Vêm prontos da página: este módulo não importa o de clientes. */
  searchCustomers: (term: string) => Promise<FacilOption[]>;
  createCustomer: (values: Record<string, string>) => Promise<MiniResult>;
  /** Cliente já escolhido (chegou da ficha dele, "Novo veículo"). */
  defaultCustomer?: FacilOption;
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

  const [customer, setCustomer] = useState<FacilOption | null>(defaultCustomer ?? null);

  const steps: WizardStep[] = [
    {
      id: "cliente",
      title: "De quem é o veículo?",
      hint: "Digite o nome ou o telefone. Cliente novo? Cadastre aqui mesmo.",
      icon: UserRound,
      fields: ["customerId"],
      content: (
        <FacilSearchField
          name="customerId"
          required
          autoFocus={!defaultCustomer}
          defaultOption={defaultCustomer}
          search={searchCustomers}
          onChange={setCustomer}
          creates={[
            {
              id: "cliente",
              label: "Cadastrar novo cliente",
              title: "Novo cliente",
              fields: customerMiniFields({ withNotes: true }),
              submit: createCustomer,
            },
          ]}
          placeholder="Procurar cliente por nome ou telefone"
          emptyText="Nenhum cliente cadastrado ainda."
        />
      ),
    },
    {
      id: "placa",
      title: "Qual a placa?",
      hint: "Pode ser a antiga (ABC-1234) ou a Mercosul (ABC1D23).",
      icon: Car,
      fields: ["plate"],
      content: (
        <FacilField label="Placa" htmlFor="facil-plate">
          <Input
            id="facil-plate"
            name="plate"
            required
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={8}
            autoFocus
            className={`${FACIL_INPUT_CLASS} text-center tracking-widest uppercase`}
          />
        </FacilField>
      ),
    },
    {
      id: "modelo",
      title: "Que carro é esse?",
      hint: "Opcional, mas ajuda a achar o veículo depois.",
      icon: Palette,
      fields: ["brand", "model", "year", "color"],
      content: (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <FacilField label="Marca" htmlFor="facil-brand">
              <Input id="facil-brand" name="brand" className={FACIL_INPUT_CLASS} />
            </FacilField>
            <FacilField label="Modelo" htmlFor="facil-model">
              <Input id="facil-model" name="model" className={FACIL_INPUT_CLASS} />
            </FacilField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FacilField label="Ano" htmlFor="facil-year">
              <Input
                id="facil-year"
                name="year"
                type="number"
                inputMode="numeric"
                className={FACIL_INPUT_CLASS}
              />
            </FacilField>
            <FacilField label="Cor" htmlFor="facil-color">
              <Input id="facil-color" name="color" className={FACIL_INPUT_CLASS} />
            </FacilField>
          </div>
        </div>
      ),
    },
    {
      id: "combustivel",
      title: "Qual o combustível e a quilometragem?",
      hint: "Opcional. Toque em 'Não informar' para pular.",
      icon: Fuel,
      fields: ["fuel", "currentKm"],
      content: (
        <div className="flex flex-col gap-4">
          <FacilChoiceField
            name="fuel"
            defaultValue=""
            options={[
              { value: "gasolina", label: "Gasolina", icon: Fuel },
              { value: "etanol", label: "Etanol", icon: Leaf },
              { value: "flex", label: "Flex", icon: Droplets },
              { value: "diesel", label: "Diesel", icon: Fuel },
              { value: "eletrico", label: "Elétrico", icon: Zap },
              { value: "gnv", label: "GNV", icon: Flame },
              { value: "", label: "Não informar", icon: Ban },
            ]}
          />
          <FacilField label="Quilometragem atual" htmlFor="facil-km">
            <div className="relative">
              <Input
                id="facil-km"
                name="currentKm"
                type="number"
                inputMode="numeric"
                min={0}
                className={`${FACIL_INPUT_CLASS} pr-14`}
              />
              <Gauge className="text-muted-foreground absolute top-4 right-4 h-6 w-6" />
            </div>
          </FacilField>
        </div>
      ),
    },
  ];

  return (
    <FacilWizard
      action={action}
      steps={steps}
      cancelHref="/veiculos"
      submitLabel="Salvar veículo"
      review={[
        { name: "customerId", label: "Cliente", format: () => customer?.label ?? "" },
        { name: "plate", label: "Placa", format: (v) => v.toUpperCase() },
        { name: "brand", label: "Marca" },
        { name: "model", label: "Modelo" },
        { name: "year", label: "Ano" },
        { name: "color", label: "Cor" },
        { name: "fuel", label: "Combustível", format: (v) => FUEL_LABELS[v] ?? v },
        { name: "currentKm", label: "Km", format: (v) => `${v} km` },
      ]}
    />
  );
}
