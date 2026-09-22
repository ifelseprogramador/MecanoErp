import { registerModule } from "@/core/registry";

registerModule({
  slug: "veiculos",
  label: "Veículos",
  iconName: "Car",
  href: "/veiculos",
  order: 20,
  enabled: true,
  dependsOn: ["clientes"],
});
