import { ActionLink } from "@/components/action-link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCents } from "@/core/money";
import { formatDate, formatPlate } from "@/core/format";
import { RowActions } from "@/components/row-actions";
import { WorkOrderStatusBadge } from "./work-order-status-badge";
import type { WorkOrderStatus } from "../domain";

interface WorkOrderRow {
  id: string;
  number: number;
  status: WorkOrderStatus;
  totalCents: number;
  createdAt: Date;
  customerName: string;
  vehiclePlate: string;
}

export function WorkOrderTable({ orders }: { orders: WorkOrderRow[] }) {
  if (orders.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Nenhuma ordem de serviço encontrada.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nº</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Veículo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Criada em</TableHead>
          <TableHead className="w-0" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell>
              <ActionLink href={`/ordens/${order.id}`} className="font-medium">
                #{order.number}
              </ActionLink>
            </TableCell>
            <TableCell>{order.customerName}</TableCell>
            <TableCell>{formatPlate(order.vehiclePlate)}</TableCell>
            <TableCell>
              <WorkOrderStatusBadge status={order.status} />
            </TableCell>
            <TableCell>{formatCents(order.totalCents)}</TableCell>
            <TableCell>{formatDate(order.createdAt)}</TableCell>
            <TableCell>
              <RowActions editHref={`/ordens/${order.id}`} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
