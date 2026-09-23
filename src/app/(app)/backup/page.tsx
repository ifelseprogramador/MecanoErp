import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackupDownloadButton } from "@/components/backup-download-button";
import { BackupRestoreForm } from "@/components/backup-restore-form";

export default function BackupPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backup</h1>
        <p className="text-muted-foreground text-sm">
          Cópia completa dos dados da sua oficina — clientes, veículos, catálogo e ordens de
          serviço.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fazer backup</CardTitle>
          <CardDescription>
            Gera um arquivo com tudo o que está cadastrado. No celular, você pode enviar direto pro
            Google Drive, WhatsApp, e-mail ou qualquer app — no computador, baixa como arquivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BackupDownloadButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restaurar backup</CardTitle>
          <CardDescription>
            Reimporta um arquivo de backup gerado aqui. Seguro rodar mais de uma vez — o que já
            existe não duplica, só entra o que estava faltando. Útil pra recuperar dados depois de
            um problema, ou migrar pra outra conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BackupRestoreForm />
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">
        O arquivo também traz a estrutura de cada tabela (nomes e tipos de coluna) — útil como
        referência caso precise migrar os dados pra outro banco (MySQL, etc.), além de servir pra
        restaurar aqui mesmo.
      </p>
    </div>
  );
}
