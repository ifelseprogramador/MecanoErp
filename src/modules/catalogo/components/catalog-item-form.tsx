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
import { formatCents } from "@/core/money";
import type { ActionResult } from "@/core/action-result";
import type { CatalogItem } from "../schema.types";

const initialState: ActionResult = { ok: false };

export function CatalogItemForm({
  item,
  action,
}: {
  item?: CatalogItem;
  action: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const errors = state.errors ?? {};

  useEffect(() => {
    if (state.ok) {
      toast.success("Item salvo.");
    }
  }, [state]);

  return (
    <form key={item?.updatedAt?.toString()} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Tipo</Label>
        <Select
          name="type"
          items={{ servico: "Serviço", peca: "Peça" }}
          defaultValue={item?.type ?? "servico"}
        >
          <SelectTrigger id="type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="servico">Serviço</SelectItem>
            <SelectItem value="peca">Peça</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={item?.name} required />
        {errors.name?.map((error) => (
          <p key={error} className="text-destructive text-sm">
            {error}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="unit">Unidade</Label>
        <Input id="unit" name="unit" defaultValue={item?.unit ?? "un"} placeholder="un, h, kg..." />
        {errors.unit?.map((error) => (
          <p key={error} className="text-destructive text-sm">
            {error}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="defaultPrice">Preço padrão</Label>
        <Input
          id="defaultPrice"
          name="defaultPrice"
          inputMode="decimal"
          placeholder="0,00"
          defaultValue={item ? (item.defaultPriceCents / 100).toFixed(2).replace(".", ",") : ""}
        />
        {item && (
          <p className="text-muted-foreground text-xs">
            Valor atual: {formatCents(item.defaultPriceCents)}
          </p>
        )}
        {errors.defaultPriceCents?.map((error) => (
          <p key={error} className="text-destructive text-sm">
            {error}
          </p>
        ))}
      </div>

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
