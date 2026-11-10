"use client";

import { Banknote, Package, Tag, Wrench } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  FACIL_INPUT_CLASS,
  FacilChoiceField,
  FacilField,
  FacilWizard,
  type WizardStep,
} from "@/components/facil/facil-wizard";
import { useOfflineCreateAction } from "@/core/offline/use-offline-create-action";
import { createCatalogItem } from "../actions";
import { parseCatalogItemFormData } from "../validation";

/**
 * Cadastro de item do catálogo no modo Fácil: uma pergunta por tela, com a
 * MESMA Server Action, a MESMA validação e o MESMO plano B offline do
 * formulário formal (`NewCatalogItemForm`). Nomes de campo: `type`, `name`,
 * `unit` e `defaultPrice` (em reais, a validação converte para centavos).
 */
export function NewCatalogItemFacil() {
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

  const steps: WizardStep[] = [
    {
      id: "tipo",
      title: "É um serviço ou uma peça?",
      icon: Tag,
      fields: ["type"],
      content: (
        <FacilChoiceField
          name="type"
          defaultValue="servico"
          options={[
            { value: "servico", label: "Serviço", hint: "mão de obra", icon: Wrench },
            { value: "peca", label: "Peça", hint: "produto", icon: Package },
          ]}
        />
      ),
    },
    {
      id: "nome",
      title: "Como se chama?",
      hint: "Ex.: Troca de óleo, Pastilha de freio dianteira.",
      icon: Tag,
      fields: ["name"],
      content: (
        <FacilField label="Nome" htmlFor="facil-item-name">
          <Input
            id="facil-item-name"
            name="name"
            required
            autoComplete="off"
            autoFocus
            className={FACIL_INPUT_CLASS}
          />
        </FacilField>
      ),
    },
    {
      id: "preco",
      title: "Quanto custa?",
      hint: "É o preço padrão: na ordem de serviço dá para mudar.",
      icon: Banknote,
      fields: ["defaultPrice", "unit", "defaultPriceCents"],
      content: (
        <div className="grid grid-cols-[1fr_7rem] gap-4">
          <FacilField label="Preço (R$)" htmlFor="facil-item-price">
            <Input
              id="facil-item-price"
              name="defaultPrice"
              inputMode="decimal"
              placeholder="0,00"
              required
              autoComplete="off"
              className={FACIL_INPUT_CLASS}
            />
          </FacilField>
          <FacilField label="Unidade" htmlFor="facil-item-unit">
            <Input
              id="facil-item-unit"
              name="unit"
              defaultValue="un"
              required
              className={FACIL_INPUT_CLASS}
            />
          </FacilField>
        </div>
      ),
    },
  ];

  return (
    <FacilWizard
      action={action}
      steps={steps}
      cancelHref="/catalogo"
      submitLabel="Salvar item"
      review={[
        { name: "type", label: "Tipo", format: (v) => (v === "peca" ? "Peça" : "Serviço") },
        { name: "name", label: "Nome" },
        { name: "defaultPrice", label: "Preço", format: (v) => `R$ ${v}` },
        { name: "unit", label: "Unidade" },
      ]}
    />
  );
}
