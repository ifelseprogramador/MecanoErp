import { registerModule } from "@/core/registry";

registerModule({
  slug: "ordens",
  label: "Ordens de serviço",
  iconName: "ClipboardList",
  href: "/ordens",
  order: 40,
  enabled: true,
  dependsOn: ["clientes", "veiculos", "catalogo"],
});
