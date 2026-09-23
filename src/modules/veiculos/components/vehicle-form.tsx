"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Hint } from "@/components/hint";
import type { ActionResult } from "@/core/action-result";
import type { Vehicle } from "../schema.types";

const initialState: ActionResult = { ok: false };

const FUEL_LABELS: Record<string, string> = {
  gasolina: "Gasolina",
  etanol: "Etanol",
  flex: "Flex",
  diesel: "Diesel",
  eletrico: "Elétrico",
  gnv: "GNV",
};

export function VehicleForm({
  vehicle,
  customers,
  defaultCustomerId,
  action,
}: {
  vehicle?: Vehicle;
  customers: { id: string; name: string }[];
  defaultCustomerId?: string;
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errors = state.errors ?? {};

  // A criação redireciona no servidor; isto só dispara na edição (ver
  // modules/clientes/components/customer-form.tsx).
  useEffect(() => {
    if (state.ok) {
      toast.success("Veículo salvo.");
    }
  }, [state]);

  return (
    // Ver o comentário equivalente em
    // modules/clientes/components/customer-form.tsx.
    <form key={vehicle?.updatedAt?.toString()} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="customerId">Cliente</Label>
        <Select
          name="customerId"
          items={Object.fromEntries(customers.map((c) => [c.id, c.name]))}
          defaultValue={vehicle?.customerId ?? defaultCustomerId}
        >
          <SelectTrigger id="customerId" className="w-full">
            <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.customerId?.map((error) => (
          <p key={error} className="text-destructive text-sm">
            {error}
          </p>
        ))}
      </div>

      <Field
        id="plate"
        label="Placa"
        defaultValue={vehicle?.plate}
        errors={errors.plate}
        required
        hint="Aceita o formato antigo (ABC-1234) ou Mercosul (ABC1D23), com ou sem traço."
      />
      <Field id="brand" label="Marca" defaultValue={vehicle?.brand ?? ""} errors={errors.brand} />
      <Field id="model" label="Modelo" defaultValue={vehicle?.model ?? ""} errors={errors.model} />

      <div className="grid grid-cols-2 gap-4">
        <Field
          id="year"
          label="Ano"
          type="number"
          defaultValue={vehicle?.year?.toString() ?? ""}
          errors={errors.year}
        />
        <Field id="color" label="Cor" defaultValue={vehicle?.color ?? ""} errors={errors.color} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="fuel">Combustível</Label>
        <Select name="fuel" items={FUEL_LABELS} defaultValue={vehicle?.fuel ?? undefined}>
          <SelectTrigger id="fuel" className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(FUEL_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Field
        id="currentKm"
        label="Quilometragem atual"
        type="number"
        defaultValue={vehicle?.currentKm?.toString() ?? ""}
        errors={errors.currentKm}
      />
      <Field
        id="chassis"
        label="Chassi"
        defaultValue={vehicle?.chassis ?? ""}
        errors={errors.chassis}
      />

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
  hint,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  errors?: string[];
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor={id}>{label}</Label>
        {hint && <Hint>{hint}</Hint>}
      </div>
      <Input id={id} name={id} type={type} defaultValue={defaultValue} required={required} />
      {errors?.map((error) => (
        <p key={error} className="text-destructive text-sm">
          {error}
        </p>
      ))}
    </div>
  );
}
