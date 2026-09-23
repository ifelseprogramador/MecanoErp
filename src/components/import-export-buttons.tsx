import Link from "next/link";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Par de botões "Exportar"/"Importar" (CSV) de uma listagem — mesmo par
 * em todo módulo que tiver as duas rotas (`<modulo>/exportar`,
 * `<modulo>/importar`). Não duplicar este JSX em `modules/<modulo>/`.
 */
export function ImportExportButtons({ basePath }: { basePath: string }) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href={`${basePath}/exportar`} />}
      >
        <Download className="h-4 w-4" />
        Exportar
      </Button>
      <Button
        variant="outline"
        size="sm"
        nativeButton={false}
        render={<Link href={`${basePath}/importar`} />}
      >
        <Upload className="h-4 w-4" />
        Importar
      </Button>
    </div>
  );
}
