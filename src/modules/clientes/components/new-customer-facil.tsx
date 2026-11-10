"use client";

import { useState, useTransition } from "react";
import { Building2, IdCard, Loader2, MapPin, Phone, Search, User, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  FACIL_INPUT_CLASS,
  FacilChoiceField,
  FacilField,
  FacilWizard,
  type WizardStep,
} from "@/components/facil/facil-wizard";
import { formatCep, isValidCep } from "@/core/fiscal-fields";
import { useOfflineCreateAction } from "@/core/offline/use-offline-create-action";
import { buscarCep, createCustomer } from "../actions";
import { parseCustomerFormData } from "../validation";

const EMPTY_ADDRESS = {
  zip: "",
  street: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  ibgeCode: "",
};

/**
 * Cadastro de cliente no modo Fácil: uma pergunta por tela, com a MESMA
 * Server Action, a MESMA validação (`parseCustomerFormData`) e o MESMO plano
 * B offline do formulário formal (`NewCustomerForm`) — só muda a apresentação.
 * Os `name` dos campos são os de `CUSTOMER_FIELDS`.
 */
export function NewCustomerFacil() {
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

  const [address, setAddress] = useState(EMPTY_ADDRESS);
  const [cepPending, startCep] = useTransition();
  const setField = (name: keyof typeof EMPTY_ADDRESS, value: string) =>
    setAddress((current) => ({ ...current, [name]: value }));

  function onCepChange(raw: string) {
    const zip = formatCep(raw);
    setField("zip", zip);
    if (!isValidCep(zip)) return;
    startCep(async () => {
      const found = await buscarCep(zip);
      if (!found) {
        toast.info("CEP não encontrado — preencha o endereço à mão.");
        return;
      }
      setAddress((current) => ({
        ...current,
        // Só preenche o que a pessoa ainda não digitou.
        street: current.street || found.street,
        district: current.district || found.district,
        city: found.city,
        state: found.state,
        ibgeCode: found.ibgeCode,
      }));
    });
  }

  const steps: WizardStep[] = [
    {
      id: "tipo",
      title: "O cliente é uma pessoa ou uma empresa?",
      icon: UserRound,
      fields: ["type"],
      content: (
        <FacilChoiceField
          name="type"
          defaultValue="pf"
          options={[
            { value: "pf", label: "Pessoa", hint: "CPF", icon: User },
            { value: "pj", label: "Empresa", hint: "CNPJ", icon: Building2 },
          ]}
        />
      ),
    },
    {
      id: "nome",
      title: "Qual o nome do cliente?",
      hint: "Pode ser o nome da pessoa ou o da empresa.",
      icon: User,
      fields: ["name"],
      content: (
        <FacilField label="Nome" htmlFor="facil-name">
          <Input
            id="facil-name"
            name="name"
            required
            minLength={2}
            autoComplete="off"
            autoFocus
            className={FACIL_INPUT_CLASS}
          />
        </FacilField>
      ),
    },
    {
      id: "contato",
      title: "Como falar com o cliente?",
      hint: "Se não tiver agora, é só avançar — dá para completar depois.",
      icon: Phone,
      fields: ["phone", "email"],
      content: (
        <div className="flex flex-col gap-4">
          <FacilField label="Telefone ou WhatsApp" htmlFor="facil-phone">
            <Input
              id="facil-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              className={FACIL_INPUT_CLASS}
            />
          </FacilField>
          <FacilField label="E-mail" htmlFor="facil-email">
            <Input
              id="facil-email"
              name="email"
              type="email"
              autoComplete="off"
              className={FACIL_INPUT_CLASS}
            />
          </FacilField>
        </div>
      ),
    },
    {
      id: "documento",
      title: "Qual o CPF ou CNPJ?",
      hint: "Opcional. Só é preciso para emitir nota.",
      icon: IdCard,
      fields: ["document"],
      content: (
        <FacilField label="CPF ou CNPJ" htmlFor="facil-document">
          <Input
            id="facil-document"
            name="document"
            inputMode="numeric"
            autoComplete="off"
            className={FACIL_INPUT_CLASS}
          />
        </FacilField>
      ),
    },
    {
      id: "endereco",
      title: "Quer anotar o endereço?",
      hint: "Opcional. Digite o CEP e o resto se completa sozinho.",
      icon: MapPin,
      fields: ["zip", "street", "number", "complement", "district", "city", "state", "ibgeCode"],
      content: (
        <div className="flex flex-col gap-4">
          <FacilField
            label="CEP"
            htmlFor="facil-zip"
            hint={cepPending ? "Buscando o endereço…" : undefined}
          >
            <div className="relative">
              <Input
                id="facil-zip"
                name="zip"
                inputMode="numeric"
                autoComplete="off"
                value={address.zip}
                onChange={(event) => onCepChange(event.target.value)}
                className={`${FACIL_INPUT_CLASS} pr-12`}
              />
              {cepPending ? (
                <Loader2 className="text-muted-foreground absolute top-4 right-4 h-6 w-6 animate-spin" />
              ) : (
                <Search className="text-muted-foreground absolute top-4 right-4 h-6 w-6" />
              )}
            </div>
          </FacilField>
          <FacilField label="Rua" htmlFor="facil-street">
            <Input
              id="facil-street"
              name="street"
              value={address.street}
              onChange={(event) => setField("street", event.target.value)}
              className={FACIL_INPUT_CLASS}
            />
          </FacilField>
          <div className="grid grid-cols-2 gap-4">
            <FacilField label="Número" htmlFor="facil-number">
              <Input
                id="facil-number"
                name="number"
                value={address.number}
                onChange={(event) => setField("number", event.target.value)}
                className={FACIL_INPUT_CLASS}
              />
            </FacilField>
            <FacilField label="Complemento" htmlFor="facil-complement">
              <Input
                id="facil-complement"
                name="complement"
                value={address.complement}
                onChange={(event) => setField("complement", event.target.value)}
                className={FACIL_INPUT_CLASS}
              />
            </FacilField>
          </div>
          <FacilField label="Bairro" htmlFor="facil-district">
            <Input
              id="facil-district"
              name="district"
              value={address.district}
              onChange={(event) => setField("district", event.target.value)}
              className={FACIL_INPUT_CLASS}
            />
          </FacilField>
          <div className="grid grid-cols-[1fr_6rem] gap-4">
            <FacilField label="Cidade" htmlFor="facil-city">
              <Input
                id="facil-city"
                name="city"
                value={address.city}
                onChange={(event) => setField("city", event.target.value)}
                className={FACIL_INPUT_CLASS}
              />
            </FacilField>
            <FacilField label="UF" htmlFor="facil-state">
              <Input
                id="facil-state"
                name="state"
                maxLength={2}
                value={address.state}
                onChange={(event) => setField("state", event.target.value.toUpperCase())}
                className={FACIL_INPUT_CLASS}
              />
            </FacilField>
          </div>
          <input type="hidden" name="ibgeCode" value={address.ibgeCode} />
        </div>
      ),
    },
  ];

  return (
    <FacilWizard
      action={action}
      steps={steps}
      cancelHref="/clientes"
      submitLabel="Salvar cliente"
      review={[
        { name: "type", label: "Tipo", format: (v) => (v === "pj" ? "Empresa" : "Pessoa") },
        { name: "name", label: "Nome" },
        { name: "phone", label: "Telefone" },
        { name: "email", label: "E-mail" },
        { name: "document", label: "CPF/CNPJ" },
        { name: "street", label: "Rua" },
        { name: "city", label: "Cidade" },
      ]}
    />
  );
}
