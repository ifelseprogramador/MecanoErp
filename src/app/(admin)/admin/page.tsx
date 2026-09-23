import Link from "next/link";
import { DatabaseBackup } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { listPendingUserRequestsForAdmin } from "@/core/live-support/queries";
import { NewOrganizationForm } from "@/core/admin/components/new-organization-form";
import { SupportInbox } from "@/core/admin/components/support-inbox";

export default async function AdminDashboardPage({ searchParams }: PageProps<"/admin">) {
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : undefined;
  const [organizations, pendingRequests] = await Promise.all([
    listOrganizationsForAdmin(search),
    listPendingUserRequestsForAdmin(),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Oficinas</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/admin/backup" />}
          >
            <DatabaseBackup className="h-4 w-4" />
            Backup do sistema
          </Button>
          <NewOrganizationForm />
        </div>
      </div>

      <SupportInbox initialRequests={pendingRequests} />

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
