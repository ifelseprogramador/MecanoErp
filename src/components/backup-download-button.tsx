"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Baixa o backup (`GET /backup/exportar`) e, quando o navegador suporta
 * a Web Share API (a maioria dos navegadores de celular — Chrome/Safari
 * Android e iOS), abre o seletor NATIVO do sistema operacional: a pessoa
 * escolhe salvar no Google Drive, mandar por WhatsApp/e-mail, guardar
 * nos Arquivos, qualquer app instalado. Sem isso disponível (a maioria
 * dos navegadores de desktop), cai pra um download comum — cobre os
 * três jeitos pedidos (nuvem, máquina, compartilhar) sem depender de
 * nenhum serviço de nuvem específico nem credencial nenhuma.
 */
export function BackupDownloadButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    // `navigator` não existe no render do servidor — só sabe se o
    // dispositivo suporta compartilhamento depois de montar no cliente,
    // senão o ícone divergiria entre o HTML do servidor e a hidratação.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  async function handleClick() {
    setIsLoading(true);
    try {
      const response = await fetch("/backup/exportar");
      if (!response.ok) throw new Error("Falha ao gerar o backup.");
      const blob = await response.blob();
      const filename =
        response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ??
        "mecanoerp-backup.json";
      const file = new File([blob], filename, { type: "application/json" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Backup MecanoErp",
          text: "Backup dos dados da oficina.",
        });
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      // Cancelar o seletor de compartilhamento também cai aqui (AbortError) —
      // não é uma falha de verdade, só não avisa nada nesse caso.
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error("Não foi possível gerar o backup. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : canShare ? (
        <Share2 className="h-4 w-4" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {isLoading ? "Gerando backup..." : "Baixar / compartilhar backup"}
    </Button>
  );
}
