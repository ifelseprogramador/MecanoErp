import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchBox } from "@/components/search-box";
import { formatDate } from "@/core/format";
import { listOrganizationsForAdmin } from "@/core/admin/queries";
import { NewOrganizationForm } from "@/core/admin/components/new-organization-form";

export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin">) {
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : undefined;
  const organizations = await listOrganizationsForAdmin(search);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Oficinas</h1>
        <NewOrganizationForm />
      </div>

      <SearchBox placeholder="Buscar oficina..." />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cobrança</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Criada em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org) => (
            <TableRow key={org.id}>
              <TableCell>
                <Link
                  href={`/admin/organizacoes/${org.id}`}
                  className="font-medium hover:underline"
                >
                  {org.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={org.status === "blocked" ? "destructive" : "secondary"}>
                  {org.status === "blocked" ? "Bloqueada" : "Ativa"}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={org.billingStatus === "em_dia" ? "secondary" : "destructive"}>
                  {org.billingStatus === "em_dia"
                    ? "Em dia"
                    : org.billingStatus === "atrasado"
                      ? "Atrasado"
                      : "Cancelado"}
                </Badge>
              </TableCell>
              <TableCell>{org.nextDueDate ? formatDate(org.nextDueDate) : "—"}</TableCell>
              <TableCell>{formatDate(org.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {organizations.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Nenhuma oficina encontrada.
        </p>
      )}
    </div>
  );
}
