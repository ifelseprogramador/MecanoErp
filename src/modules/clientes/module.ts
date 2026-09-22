import { Users } from "lucide-react";
import { registerModule } from "@/core/registry";

registerModule({
  slug: "clientes",
  label: "Clientes",
  icon: Users,
  href: "/clientes",
  order: 10,
  enabled: true,
});
