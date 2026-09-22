import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveOrg } from "@/core/auth";

// Fase 4 do plano substitui isto por indicadores reais (OS abertas,
// agendamentos de hoje, a receber do mês, faturamento do mês).
export default async function DashboardPage() {
  const org = await getActiveOrg();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
        <p className="text-muted-foreground text-sm">{org.organizationName}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo</CardTitle>
          <CardDescription>
            Os módulos de clientes, veículos, ordens de serviço, agenda e financeiro aparecerão aqui
            conforme forem ativados.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
