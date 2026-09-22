import { Car } from "lucide-react";
import { registerModule } from "@/core/registry";

registerModule({
  slug: "veiculos",
  label: "Veículos",
  icon: Car,
  href: "/veiculos",
  order: 20,
  enabled: true,
  dependsOn: ["clientes"],
});
