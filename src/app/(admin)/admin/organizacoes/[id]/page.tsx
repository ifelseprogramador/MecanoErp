import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { Badge } from "@/components/ui/badge";
import { getOrganizationForAdmin } from "@/core/admin/queries";
import {
  hardDeleteOrganization,
  updateBilling,
  updateOrganizationName,
  updateSeats,
} from "@/core/admin/actions";
import { OrgStatusToggle } from "@/core/admin/components/org-status-toggle";
import { OrganizationNameForm } from "@/core/admin/components/organization-name-form";
import { ImpersonateButton } from "@/core/admin/components/impersonate-button";
import { BillingForm } from "@/core/admin/components/billing-form";
import { SeatsForm } from "@/core/admin/components/seats-form";
import { OrgSupportWaitForm } from "@/core/admin/components/org-support-wait-form";
import { ModuleToggleList } from "@/core/admin/components/module-toggle-list";
import { HardDeleteForm } from "@/core/admin/components/hard-delete-form";
import { ResetMemberPasswordButton } from "@/core/admin/components/reset-member-password-button";
import { CollapsibleCard } from "@/core/admin/components/collapsible-card";
import { AuditLogCard } from "@/core/admin/components/audit-log-card";
import { LiveSupportCard } from "@/core/admin/components/live-support-card";
import { getAllModules } from "@/core/registry";
import { getOpenSessionForOrgAdmin, listSupportTargetsForOrg } from "@/core/live-support/queries";

export default async function AdminOrganizationDetailPage({
  params,
}: PageProps<"/admin/organizacoes/[id]">) {
  const { id } = await params;
  const [data, openSession, supportTargets] = await Promise.all([
    getOrganizationForAdmin(id),
    getOpenSessionForOrgAdmin(id),
    listSupportTargetsForOrg(id),
  ]);

  if (!data) {
    notFound();
  }

  const { organization: org, members, customerCount, vehicleCount, moduleSettings, audit } = data;
  const updateBillingWithId = updateBilling.bind(null, org.id);
  const hardDeleteWithId = hardDeleteOrganization.bind(null, org.id);
  const updateNameWithId = updateOrganizationName.bind(null, org.id);
  const updateSeatsWithId = updateSeats.bind(null, org.id);
  const activeCount = members.filter((m) => m.active).length;

  const overrideBySlug = new Map(moduleSettings.map((m) => [m.moduleSlug, m.enabled]));
  const modules = getAllModules().map((m) => ({
    slug: m.slug,
    label: m.label,
    enabled: overrideBySlug.get(m.slug) ?? m.enabled,
  }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-2">
          <BackButton href="/admin" />
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
              <OrganizationNameForm currentName={org.name} action={updateNameWithId} />
            </div>
            <div className="mt-1 flex gap-2">
              <Badge variant={org.status === "blocked" ? "destructive" : "secondary"}>
                {org.status === "blocked" ? "Bloqueada" : "Ativa"}
              </Badge>
              <Badge variant="outline">
                {customerCount} cliente{customerCount === 1 ? "" : "s"}
              </Badge>
              <Badge variant="outline">
                {vehicleCount} veículo{vehicleCount === 1 ? "" : "s"}
              </Badge>
              <Badge variant="outline">
                {org.multiUser ? `Multiusuário (${activeCount}/${org.seatLimit})` : "1 usuário"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <ImpersonateButton organizationId={org.id} />
          <OrgStatusToggle organizationId={org.id} status={org.status} />
        </div>
      </div>

      <LiveSupportCard
        organizationId={org.id}
        targets={supportTargets}
        initialSession={
          openSession &&
          (openSession.status === "pending" ||
            openSession.status === "active" ||
            openSession.status === "chat")
            ? {
                id: openSession.id,
                status: openSession.status,
                screenRequested: openSession.screenRequested,
                controlGranted: openSession.controlGranted,
              }
            : null
        }
      />

      <CollapsibleCard title="Cobrança">
        <BillingForm
          billingStatus={org.billingStatus}
          nextDueDate={org.nextDueDate}
          billingNotes={org.billingNotes}
          action={updateBillingWithId}
        />
      </CollapsibleCard>

      <CollapsibleCard title="Atendimento de suporte">
        <OrgSupportWaitForm organizationId={org.id} initialSeconds={org.supportWaitSeconds} />
      </CollapsibleCard>

      <CollapsibleCard title="Usuários">
        <SeatsForm
          multiUser={org.multiUser}
          seatLimit={org.seatLimit}
          extraSeatPriceCents={org.extraSeatPriceCents}
          activeCount={activeCount}
          action={updateSeatsWithId}
        />
      </CollapsibleCard>

      <CollapsibleCard title="Módulos habilitados (personalização)">
        <ModuleToggleList organizationId={org.id} modules={modules} />
      </CollapsibleCard>

      <CollapsibleCard title="Pessoas com acesso">
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum usuário vinculado.</p>
        ) : (
          <ul className="flex flex-col gap-2 text-sm">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate">{m.name}</p>
                  <p className="text-muted-foreground truncate font-mono text-xs">
                    {m.email && m.email !== m.name ? `${m.email} · ` : ""}
                    {m.userId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{m.role === "owner" ? "Dono" : "Equipe"}</Badge>
                  {!m.active && <Badge variant="destructive">Bloqueado</Badge>}
                  <ResetMemberPasswordButton
                    organizationId={org.id}
                    userId={m.userId}
                    label={m.name}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleCard>

      <AuditLogCard organizationId={org.id} entries={audit} />

      <CollapsibleCard
        title="Zona de risco"
        className="border-destructive/50"
        titleClassName="text-destructive"
      >
        <HardDeleteForm organizationName={org.name} action={hardDeleteWithId} />
      </CollapsibleCard>
    </div>
  );
}
