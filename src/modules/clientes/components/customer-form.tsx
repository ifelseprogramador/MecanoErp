"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionResult } from "../actions";
import type { Customer } from "../schema.types";

const initialState: ActionResult = { ok: false };

export function CustomerForm({
  customer,
  action,
}: {
  customer?: Customer;
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Tipo</Label>
        <Select name="type" defaultValue={customer?.type ?? "pf"}>
          <SelectTrigger id="type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pf">Pessoa física</SelectItem>
            <SelectItem value="pj">Pessoa jurídica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Field id="name" label="Nome" defaultValue={customer?.name} required errors={errors.name} />
      <Field
        id="document"
        label="CPF/CNPJ"
        defaultValue={customer?.document ?? ""}
        errors={errors.document}
      />
      <Field
        id="phone"
        label="Telefone"
        defaultValue={customer?.phone ?? ""}
        errors={errors.phone}
      />
      <Field
        id="email"
        label="E-mail"
        type="email"
        defaultValue={customer?.email ?? ""}
        errors={errors.email}
      />
      <Field
        id="address"
        label="Endereço"
        defaultValue={customer?.address ?? ""}
        errors={errors.address}
      />

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" defaultValue={customer?.notes ?? ""} rows={3} />
      </div>

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  defaultValue,
  errors,
  type = "text",
  required,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  errors?: string[];
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} type={type} defaultValue={defaultValue} required={required} />
      {errors?.map((error) => (
        <p key={error} className="text-destructive text-sm">
          {error}
        </p>
      ))}
    </div>
  );
}
