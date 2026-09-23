"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCents } from "@/core/money";
import type { ActionResult } from "@/core/action-result";
import type { WorkOrderItem } from "../schema.types";

const initialState: ActionResult = { ok: false };
const NONE = "__nenhum__";

interface SelectableCatalogItem {
  id: string;
  type: "servico" | "peca";
  name: string;
  unit: string;
  defaultPriceCents: number;
}

export function WorkOrderItemsEditor({
  orderId,
  items,
  catalogItems,
  addAction,
  removeAction,
  disabled,
}: {
  orderId: string;
  items: WorkOrderItem[];
  catalogItems: SelectableCatalogItem[];
  addAction: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
  removeAction: (itemId: string, orderId: string) => Promise<ActionResult>;
  disabled?: boolean;
}) {
  const [isRemoving, startRemoveTransition] = useTransition();

  function handleRemove(itemId: string) {
    startRemoveTransition(async () => {
      const result = await removeAction(itemId, orderId);
      if (!result.ok) {
        toast.error(result.message ?? "Não foi possível remover o item.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Qtd.</TableHead>
              <TableHead>Valor unit.</TableHead>
              <TableHead>Total</TableHead>
              {!disabled && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell>{item.type === "servico" ? "Serviço" : "Peça"}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{formatCents(item.unitPriceCents)}</TableCell>
                <TableCell>{formatCents(item.totalCents ?? 0)}</TableCell>
                {!disabled && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remover item"
                      disabled={isRemoving}
                      onClick={() => handleRemove(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground text-sm">Nenhum item adicionado ainda.</p>
      )}

      {!disabled && (
        // `key={items.length}` remonta o formulário do zero a cada item
        // adicionado com sucesso (o `items` que o pai recebe já vem
        // atualizado via `revalidatePath`) — reseta os campos
        // controlados sem precisar de um `setState` dentro de um
        // `useEffect` reagindo ao resultado da action (o React desaprova
        // esse padrão: risco de cascata de renders).
        <AddItemForm key={items.length} catalogItems={catalogItems} addAction={addAction} />
      )}
    </div>
  );
}

function AddItemForm({
  catalogItems,
  addAction,
}: {
  catalogItems: SelectableCatalogItem[];
  addAction: (prevState: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction, isPending] = useActionState(addAction, initialState);
  const errors = state.errors ?? {};
  const [selectedCatalogId, setSelectedCatalogId] = useState(NONE);
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"servico" | "peca">("servico");
  const [unitPrice, setUnitPrice] = useState("");

  useEffect(() => {
    if (state.ok) toast.success("Item adicionado.");
  }, [state]);

  function handlePickCatalogItem(id: string) {
    setSelectedCatalogId(id);
    const item = catalogItems.find((c) => c.id === id);
    if (item) {
      setDescription(item.name);
      setType(item.type);
      setUnitPrice((item.defaultPriceCents / 100).toFixed(2).replace(".", ","));
    }
  }

  const catalogItemNames: Record<string, string> = Object.fromEntries([
    [NONE, "Item avulso (fora do catálogo)"],
    ...catalogItems.map((c) => [c.id, c.name]),
  ]);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 border-t pt-4">
      <div className="col-span-2 flex flex-col gap-2">
        <Label htmlFor="catalogItem">Item do catálogo (opcional)</Label>
        <Select
          items={catalogItemNames}
          value={selectedCatalogId}
          onValueChange={(value) => handlePickCatalogItem(String(value))}
        >
          <SelectTrigger id="catalogItem" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Item avulso (fora do catálogo)</SelectItem>
            {catalogItems.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({formatCents(c.defaultPriceCents)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <input type="hidden" name="type" value={type} />

      <div className="col-span-2 flex flex-col gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        {errors.description?.map((error) => (
          <p key={error} className="text-destructive text-sm">
            {error}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="quantity">Quantidade</Label>
        <Input id="quantity" name="quantity" inputMode="decimal" defaultValue="1" required />
        {errors.quantity?.map((error) => (
          <p key={error} className="text-destructive text-sm">
            {error}
          </p>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="unitPrice">Valor unitário</Label>
        <Input
          id="unitPrice"
          name="unitPrice"
          inputMode="decimal"
          placeholder="0,00"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          required
        />
        {errors.unitPriceCents?.map((error) => (
          <p key={error} className="text-destructive text-sm">
            {error}
          </p>
        ))}
      </div>

      {state.message && <p className="text-destructive col-span-2 text-sm">{state.message}</p>}

      <Button type="submit" disabled={isPending} className="col-span-2">
        {isPending ? "Adicionando..." : "Adicionar item"}
      </Button>
    </form>
  );
}
