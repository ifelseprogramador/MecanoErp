"use client";

import { useState } from "react";
import { Car, Gauge, MessageSquareText, UserRound, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FacilItemsField,
  describeLines,
  FacilSearchField,
  type FacilOption,
  type MiniCreate,
  type MiniResult,
} from "@/components/facil/facil-search";
import {
  FACIL_INPUT_CLASS,
  FacilField,
  FacilWizard,
  type WizardStep,
} from "@/components/facil/facil-wizard";
import { customerMiniFields, vehicleMiniFields } from "@/components/facil/mini-fields";
import { formatPlate } from "@/core/format";
import { parseReaisInput } from "@/core/money";
import { useOfflineCreateAction } from "@/core/offline/use-offline-create-action";
import { createWorkOrderWithItems } from "../actions";
import { parseWorkOrderHeaderFormData } from "../validation";

/**
 * As buscas e os cadastros rápidos vêm PRONTOS da página (composição entre
 * módulos acontece na camada de rotas: este módulo não importa clientes,
 * veículos nem catálogo).
 */
export interface WorkOrderPickers {
  searchCustomers: (term: string) => Promise<FacilOption[]>;
  createCustomer: (values: Record<string, string>) => Promise<MiniResult>;
  searchVehicles: (customerId: string, term: string) => Promise<FacilOption[]>;
  createVehicle: (values: Record<string, string>) => Promise<MiniResult>;
  searchCatalog: (term: string) => Promise<FacilOption[]>;
  createCatalogItem: (values: Record<string, string>) => Promise<MiniResult>;
}

const ITEM_TYPES = [
  { value: "peca", label: "Peça" },
  { value: "servico", label: "Serviço" },
];

/**
 * Novo orçamento no modo Fácil: cliente → veículo (só os do cliente) → relato
 * → km → peças e serviços → conferência. Cliente, veículo e peça podem ser
 * CADASTRADOS ali mesmo, sem sair do orçamento; as buscas rodam no servidor
 * (aguentam milhares de registros). MESMA validação do formulário formal e o
 * plano B offline do cabeçalho — mas itens exigem internet (a fila offline só
 * guarda o cabeçalho), então sem rede o assistente avisa em vez de perdê-los.
 */
export function NewWorkOrderFacil({ pickers }: { pickers: WorkOrderPickers }) {
  const action = useOfflineCreateAction(createWorkOrderWithItems, {
    module: "ordens",
    entity: "work_order",
    actionName: "createWorkOrder",
    parse: (formData) => {
      if (describeLines(String(formData.get("itemsJson") ?? "")) !== "") {
        return {
          success: false,
          errors: {
            itemsJson: [
              "Sem internet não dá para guardar os itens. Tire os itens e salve só o orçamento (adicione-os depois), ou espere a conexão voltar.",
            ],
          },
        };
      }
      const result = parseWorkOrderHeaderFormData(formData);
      if (!result.success) {
        return { success: false, errors: result.error.flatten().fieldErrors };
      }
      return { success: true, data: result.data };
    },
    label: () => "Novo orçamento",
    pendingPath: (id) => `/ordens/pendente?id=${id}`,
  });

  const [customer, setCustomer] = useState<FacilOption | null>(null);
  const [vehicle, setVehicle] = useState<FacilOption | null>(null);
  const customerId = customer?.value ?? "";

  const createCustomer: MiniCreate = {
    id: "cliente",
    label: "Cadastrar novo cliente",
    title: "Novo cliente",
    fields: customerMiniFields({ withNotes: true }),
    submit: pickers.createCustomer,
  };
  const createVehicle: MiniCreate = {
    id: "veiculo",
    label: "Cadastrar novo veículo deste cliente",
    title: "Novo veículo",
    fields: vehicleMiniFields(),
    submit: (values) => pickers.createVehicle({ ...values, customerId }),
  };
  const createCatalogItem: MiniCreate = {
    id: "catalogo",
    label: "Cadastrar nova peça ou serviço",
    title: "Nova peça ou serviço",
    fields: [
      { key: "type", label: "Tipo", choices: ITEM_TYPES, defaultValue: "peca" },
      { key: "name", label: "Nome", required: true },
      { key: "price", label: "Preço (R$)", type: "money", required: true, placeholder: "0,00" },
      { key: "unit", label: "Unidade (un, h, kg…)", defaultValue: "un", advanced: true },
    ],
    submit: pickers.createCatalogItem,
  };
  const freeItem: MiniCreate = {
    id: "avulso",
    label: "Item avulso (sem cadastrar)",
    title: "Item avulso",
    submitLabel: "Adicionar",
    fields: [
      { key: "type", label: "Tipo", choices: ITEM_TYPES, defaultValue: "servico" },
      { key: "label", label: "Descrição", required: true },
      { key: "price", label: "Preço (R$)", type: "money", required: true, placeholder: "0,00" },
    ],
    submit: async (values) => {
      const cents = parseReaisInput(values.price ?? "");
      if (cents === null) return { ok: false, errors: { price: ["Informe um preço válido."] } };
      return {
        ok: true,
        option: {
          value: `free:${values.label}`,
          label: values.label,
          priceCents: cents,
          extras: { type: values.type === "peca" ? "peca" : "servico" },
        },
      };
    },
  };

  const steps: WizardStep[] = [
    {
      id: "cliente",
      title: "Para qual cliente é o orçamento?",
      hint: "Digite o nome ou o telefone. Cliente novo? Cadastre aqui mesmo.",
      icon: UserRound,
      fields: ["customerId"],
      content: (
        <FacilSearchField
          name="customerId"
          required
          autoFocus
          search={pickers.searchCustomers}
          creates={[createCustomer]}
          onChange={(option) => {
            setCustomer(option);
            setVehicle(null);
          }}
          placeholder="Procurar cliente por nome ou telefone"
          emptyText="Nenhum cliente cadastrado ainda."
        />
      ),
    },
    {
      id: "veiculo",
      title: "Qual veículo?",
      hint: `Só os veículos de ${customer?.label ?? "este cliente"}. Carro novo? Cadastre aqui mesmo.`,
      icon: Car,
      fields: ["vehicleId"],
      content: (
        <FacilSearchField
          // Troca de cliente = busca nova, sem herdar a escolha anterior.
          key={customerId}
          name="vehicleId"
          required
          search={(term) => pickers.searchVehicles(customerId, term)}
          creates={[createVehicle]}
          onChange={setVehicle}
          placeholder="Procurar pela placa, marca ou modelo"
          emptyText="Este cliente ainda não tem veículo."
        />
      ),
    },
    {
      id: "relato",
      title: "O que o cliente relatou?",
      hint: "Opcional. Pode escrever do seu jeito.",
      icon: MessageSquareText,
      fields: ["relatoCliente"],
      content: (
        <FacilField label="Relato do cliente" htmlFor="facil-relato">
          <Textarea
            id="facil-relato"
            name="relatoCliente"
            rows={4}
            className="rounded-xl px-4 py-3 text-lg md:text-lg"
          />
        </FacilField>
      ),
    },
    {
      id: "km",
      title: "Quantos km o carro tem?",
      hint: "Opcional. Anote o que está no painel.",
      icon: Gauge,
      fields: ["kmEntrada"],
      content: (
        <FacilField label="Quilometragem de entrada" htmlFor="facil-km-entrada">
          <Input
            id="facil-km-entrada"
            name="kmEntrada"
            type="number"
            inputMode="numeric"
            min={0}
            className={FACIL_INPUT_CLASS}
          />
        </FacilField>
      ),
    },
    {
      id: "itens",
      title: "Quais peças e serviços?",
      hint: "Opcional agora: dá para adicionar depois na ordem.",
      icon: Wrench,
      fields: ["itemsJson"],
      content: (
        <FacilItemsField
          name="itemsJson"
          search={pickers.searchCatalog}
          creates={[createCatalogItem, freeItem]}
        />
      ),
    },
  ];

  return (
    <FacilWizard
      action={action}
      steps={steps}
      cancelHref="/ordens"
      submitLabel="Criar orçamento"
      review={[
        { name: "customerId", label: "Cliente", format: () => customer?.label ?? "" },
        {
          name: "vehicleId",
          label: "Veículo",
          format: () =>
            vehicle
              ? [formatPlate(vehicle.label), vehicle.subtitle].filter(Boolean).join(" · ")
              : "",
        },
        { name: "relatoCliente", label: "Relato" },
        { name: "kmEntrada", label: "Km de entrada", format: (v) => `${v} km` },
        { name: "itemsJson", label: "Itens", format: describeLines },
      ]}
    />
  );
}
