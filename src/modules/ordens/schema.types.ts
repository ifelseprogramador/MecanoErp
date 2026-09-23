import type { InferSelectModel } from "drizzle-orm";
import type { workOrderItems, workOrders } from "./schema";

export type WorkOrder = InferSelectModel<typeof workOrders>;
export type WorkOrderItem = InferSelectModel<typeof workOrderItems>;
