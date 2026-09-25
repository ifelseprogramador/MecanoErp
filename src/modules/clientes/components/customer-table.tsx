import { ActionLink } from "@/components/action-link";
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
import { formatDocument } from "@/core/document";
import { deleteCustomer } from "../actions";
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
          <TableHead className="w-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell>
              <ActionLink href={`/clientes/${customer.id}`} className="font-medium">
                {customer.name}
              </ActionLink>
            </TableCell>
            <TableCell>
              <Badge variant={customer.type === "pf" ? "default" : "secondary"}>
                {customer.type === "pf" ? "Pessoa física" : "Pessoa jurídica"}
              </Badge>
            </TableCell>
            <TableCell>{customer.document ? formatDocument(customer.document) : "—"}</TableCell>
            <TableCell>{customer.phone || "—"}</TableCell>
            <TableCell>
              <RowActions
                editHref={`/clientes/${customer.id}`}
                deleteTitle="Remover cliente"
                deleteDescription="Essa ação não pode ser desfeita. O cliente só pode ser removido se não tiver veículos ou ordens de serviço vinculados."
                onDelete={deleteCustomer.bind(null, customer.id)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
