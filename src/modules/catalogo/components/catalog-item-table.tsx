import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RowActions } from "@/components/row-actions";
import { formatCents } from "@/core/money";
import { deleteCatalogItem } from "../actions";
import type { CatalogItem } from "../schema.types";

export function CatalogItemTable({ items }: { items: CatalogItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">Nenhum item cadastrado.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Unidade</TableHead>
          <TableHead>Preço padrão</TableHead>
          <TableHead className="w-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <Link href={`/catalogo/${item.id}`} className="font-medium hover:underline">
                {item.name}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant={item.type === "servico" ? "default" : "secondary"}>
                {item.type === "servico" ? "Serviço" : "Peça"}
              </Badge>
            </TableCell>
            <TableCell>{item.unit}</TableCell>
            <TableCell>{formatCents(item.defaultPriceCents)}</TableCell>
            <TableCell>
              <RowActions
                editHref={`/catalogo/${item.id}`}
                deleteTitle="Remover item"
                deleteDescription="Essa ação não pode ser desfeita. O item só pode ser removido se não estiver usado em alguma ordem de serviço."
                onDelete={deleteCatalogItem.bind(null, item.id)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
