import { registerModule } from "@/core/registry";
import { registerBackupTable } from "@/core/backup";
import { customers, customerAddresses } from "./schema";

registerModule({
  slug: "clientes",
  label: "Clientes",
  iconName: "Users",
  href: "/clientes",
  order: 10,
  enabled: true,
});

registerBackupTable({
  key: "customers",
  table: customers,
  dateColumns: ["createdAt", "updatedAt"],
});

registerBackupTable({
  key: "customer_addresses",
  table: customerAddresses,
  dateColumns: ["createdAt", "updatedAt"],
});
