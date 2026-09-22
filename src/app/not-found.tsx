import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        O endereço que você acessou não existe ou foi movido.
      </p>
      <Button render={<Link href="/">Voltar ao início</Link>} />
    </div>
  );
}
