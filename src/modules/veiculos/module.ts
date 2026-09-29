import { registerModule } from "@/core/registry";
import { registerBackupTable } from "@/core/backup";
import { vehicles } from "./schema";

registerModule({
  slug: "veiculos",
  label: "Veículos",
  iconName: "Car",
  href: "/veiculos",
  order: 20,
  enabled: true,
  dependsOn: ["clientes"],
});

registerBackupTable({
  key: "vehicles",
  table: vehicles,
  dateColumns: ["createdAt", "updatedAt"],
});
