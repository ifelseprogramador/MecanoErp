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
import { formatDocument } from "@/core/document";
import type { Customer } from "../schema.types";

// Lista simples, sem sort/paginação: o volume esperado (clientes de uma
// oficina) não justifica um data grid ainda. Se isso mudar, reavaliar
// @tanstack/react-table (v9 trocou a API por inteiro — ver
// node_modules/@tanstack/react-table/skills/migrate-v8-to-v9).
export function CustomerTable({ customers }: { customers: Customer[] }) {
  if (customers.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">Nenhum cliente encontrado.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>CPF/CNPJ</TableHead>
          <TableHead>Telefone</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell>
              <Link href={`/clientes/${customer.id}`} className="font-medium hover:underline">
                {customer.name}
              </Link>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">
                {customer.type === "pf" ? "Pessoa física" : "Pessoa jurídica"}
              </Badge>
            </TableCell>
            <TableCell>{customer.document ? formatDocument(customer.document) : "—"}</TableCell>
            <TableCell>{customer.phone || "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
