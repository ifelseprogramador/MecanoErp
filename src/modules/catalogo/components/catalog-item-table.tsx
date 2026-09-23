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
import { formatCents } from "@/core/money";
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
              <Badge variant="secondary">{item.type === "servico" ? "Serviço" : "Peça"}</Badge>
            </TableCell>
            <TableCell>{item.unit}</TableCell>
            <TableCell>{formatCents(item.defaultPriceCents)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
