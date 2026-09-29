import { registerModule } from "@/core/registry";
import { registerBackupTable } from "@/core/backup";
import { catalogItems } from "./schema";

registerModule({
  slug: "catalogo",
  label: "Catálogo",
  iconName: "Package",
  href: "/catalogo",
  order: 30,
  enabled: true,
});

registerBackupTable({
  key: "catalog_items",
  table: catalogItems,
  dateColumns: ["createdAt", "updatedAt"],
});
