"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { formatPlate } from "@/core/format";
import { Hint } from "@/components/hint";
import type { ActionResult } from "@/core/action-result";
import type { WorkOrder } from "../schema.types";

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

const initialState: ActionResult = { ok: false };

export function WorkOrderForm({
  order,
  customers,
  vehicles,
  defaultCustomerId,
  action,
}: {
  order?: WorkOrder;
  customers: SelectableCustomer[];
  vehicles: SelectableVehicle[];
  defaultCustomerId?: string;
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errors = state.errors ?? {};
  const [customerId, setCustomerId] = useState(order?.customerId ?? defaultCustomerId ?? "");

  useEffect(() => {
    if (state.ok) toast.success("Ordem de serviço salva.");
  }, [state]);

  const customerItems = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c.name])),
    [customers],
  );

  const vehiclesOfCustomer = useMemo(
    () => vehicles.filter((v) => v.customerId === customerId),
    [vehicles, customerId],
  );
  const vehicleItems = useMemo(
    () =>
      Object.fromEntries(
        vehiclesOfCustomer.map((v) => [
          v.id,
          `${formatPlate(v.plate)}${v.brand ? ` — ${v.brand} ${v.model ?? ""}`.trim() : ""}`,
        ]),
      ),
    [vehiclesOfCustomer],
  );

  return (
    <form key={order?.updatedAt?.toString()} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="customerId">Cliente</Label>
        <Select
          name="customerId"
          items={customerItems}
          defaultValue={order?.customerId ?? defaultCustomerId}
          onValueChange={(value) => setCustomerId(String(value))}
        >
          <SelectTrigger id="customerId" className="w-full">
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="vehicleId">Veículo</Label>
        <Select
          key={customerId}
          name="vehicleId"
          items={vehicleItems}
          defaultValue={order?.vehicleId}
          disabled={!customerId}
        >
          <SelectTrigger id="vehicleId" className="w-full">
            <SelectValue
              placeholder={customerId ? "Selecione o veículo" : "Selecione o cliente primeiro"}
            />
          </SelectTrigger>
          <SelectContent>
            {vehiclesOfCustomer.map((v) => (
              <SelectItem key={v.id} value={v.id}>
                {formatPlate(v.plate)}
                {v.brand ? ` — ${v.brand} ${v.model ?? ""}`.trim() : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {vehiclesOfCustomer.length === 0 && customerId && (
          <p className="text-muted-foreground text-xs">
            Este cliente não tem veículos cadastrados.
          </p>
        )}
        {errors.vehicleId?.map((error) => (
          <p key={error} className="text-destructive text-sm">
            {error}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="kmEntrada">Km de entrada</Label>
        <Input
          id="kmEntrada"
          name="kmEntrada"
          inputMode="numeric"
          defaultValue={order?.kmEntrada ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="relatoCliente">Relato do cliente</Label>
        <Textarea
          id="relatoCliente"
          name="relatoCliente"
          defaultValue={order?.relatoCliente ?? ""}
          rows={2}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="diagnostico">Diagnóstico</Label>
        <Textarea
          id="diagnostico"
          name="diagnostico"
          defaultValue={order?.diagnostico ?? ""}
          rows={2}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="discount">Desconto</Label>
          <Hint>Valor em reais, aplicado sobre o total dos itens ao calcular o total da OS.</Hint>
        </div>
        <Input
          id="discount"
          name="discount"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={order ? (order.discountCents / 100).toFixed(2).replace(".", ",") : ""}
        />
      </div>

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
