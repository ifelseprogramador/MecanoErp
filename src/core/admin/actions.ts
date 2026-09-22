"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/core/admin-auth";
import { createSupabaseAdminClient } from "@/core/supabase/admin";
import type { ActionResult } from "@/core/action-result";
import {
  customers,
  memberships,
  organizationModuleSettings,
  organizations,
  vehicles,
} from "@/db/schema";
import { parseBillingFormData, parseNewOrganizationFormData } from "./validation";

/**
 * Cria uma oficina nova + o usuário dono dela (via Admin API do Supabase,
 * já confirmado — sem enviar e-mail). Se o e-mail já existir como usuário
 * do Supabase, reaproveita a conta (mesmo padrão do src/db/seed.ts).
 */
export async function createOrganization(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { db, log } = await requireAdmin();

  const parsed = parseNewOrganizationFormData(formData);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }
  const { organizationName, ownerEmail, ownerPassword } = parsed.data;
  log.info("admin.organizacao.criar", { organizationName, ownerEmail });

  const supabaseAdmin = createSupabaseAdminClient();

  let ownerId: string;
  try {
    const { data: existing, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const existingUser = existing.users.find((u) => u.email === ownerEmail);
    if (existingUser) {
      ownerId = existingUser.id;
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: ownerEmail,
        password: ownerPassword,
        email_confirm: true,
      });
      if (error) throw error;
      ownerId = data.user.id;
    }
  } catch (err) {
    log.error("admin.organizacao.criar.usuario_falhou", { ownerEmail, err });
    return { ok: false, message: "Não foi possível criar/localizar o usuário dono." };
  }

  let organizationId: string;
  try {
    const [org] = await db.insert(organizations).values({ name: organizationName }).returning({
      id: organizations.id,
    });
    organizationId = org.id;

    await db
      .insert(memberships)
      .values({ userId: ownerId, organizationId, role: "owner" })
      .onConflictDoNothing();

    log.info("admin.organizacao.criar.sucesso", { organizationId, ownerId });
  } catch (err) {
    log.error("admin.organizacao.criar.falhou", { err });
    return { ok: false, message: "Usuário criado, mas a organização falhou. Tente novamente." };
  }

  revalidatePath("/admin");
  redirect(`/admin/organizacoes/${organizationId}`);
}

/** Bloqueia ou desbloqueia o acesso de TODA a organização (todos os
 * usuários dela param de conseguir entrar — ver core/auth.ts#getActiveOrg). */
export async function setOrganizationStatus(
  organizationId: string,
  status: "active" | "blocked",
): Promise<ActionResult> {
  const { db, log } = await requireAdmin();
  log.info("admin.organizacao.status", { organizationId, status });

  try {
    const result = await db
      .update(organizations)
      .set({ status, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId))
      .returning({ id: organizations.id });

    if (result.length === 0) {
      return { ok: false, message: "Organização não encontrada." };
    }

    revalidatePath("/admin");
    revalidatePath(`/admin/organizacoes/${organizationId}`);
    return { ok: true };
  } catch (err) {
    log.error("admin.organizacao.status.falhou", { organizationId, err });
    return { ok: false, message: "Não foi possível atualizar o status. Tente novamente." };
  }
}

export async function updateBilling(
  organizationId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { db, log } = await requireAdmin();
  log.info("admin.organizacao.cobranca", { organizationId });

  const parsed = parseBillingFormData(formData);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await db
      .update(organizations)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(organizations.id, organizationId));

    log.info("admin.organizacao.cobranca.sucesso", { organizationId });
    revalidatePath(`/admin/organizacoes/${organizationId}`);
    return { ok: true };
  } catch (err) {
    log.error("admin.organizacao.cobranca.falhou", { organizationId, err });
    return { ok: false, message: "Não foi possível salvar. Tente novamente." };
  }
}

/** Liga/desliga um módulo especificamente para uma organização
 * (personalização — ver core/module-settings.ts). */
export async function setModuleEnabledForOrg(
  organizationId: string,
  moduleSlug: string,
  enabled: boolean,
): Promise<ActionResult> {
  const { db, log } = await requireAdmin();
  log.info("admin.organizacao.modulo", { organizationId, moduleSlug, enabled });

  try {
    await db
      .insert(organizationModuleSettings)
      .values({ organizationId, moduleSlug, enabled })
      .onConflictDoUpdate({
        target: [organizationModuleSettings.organizationId, organizationModuleSettings.moduleSlug],
        set: { enabled, updatedAt: new Date() },
      });

    revalidatePath(`/admin/organizacoes/${organizationId}`);
    return { ok: true };
  } catch (err) {
    log.error("admin.organizacao.modulo.falhou", { organizationId, moduleSlug, err });
    return { ok: false, message: "Não foi possível salvar. Tente novamente." };
  }
}

/**
 * Apaga uma organização e TODOS os dados dela, sem volta. Exige digitar o
 * nome exato da organização (conferido no servidor, nunca confiando no que
 * o cliente mandou) — a mesma barreira que o GitHub usa para "delete repo".
 */
export async function hardDeleteOrganization(
  organizationId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { db, log } = await requireAdmin();
  log.info("admin.organizacao.apagar_tudo", { organizationId });

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) {
    return { ok: false, message: "Organização não encontrada." };
  }

  const confirmName = String(formData.get("confirmName") ?? "").trim();
  if (confirmName !== org.name) {
    log.warn("admin.organizacao.apagar_tudo.confirmacao_invalida", { organizationId });
    return {
      ok: false,
      errors: { confirmName: [`Digite exatamente "${org.name}" para confirmar.`] },
    };
  }

  try {
    await db.transaction(async (tx) => {
      // Ordem de dependência das FKs (todas ON DELETE RESTRICT, de
      // propósito — só este fluxo, com confirmação explícita, apaga em
      // cascata na mão).
      await tx.delete(vehicles).where(eq(vehicles.organizationId, organizationId));
      await tx.delete(customers).where(eq(customers.organizationId, organizationId));
      await tx
        .delete(organizationModuleSettings)
        .where(eq(organizationModuleSettings.organizationId, organizationId));
      await tx.delete(memberships).where(eq(memberships.organizationId, organizationId));
      await tx.delete(organizations).where(eq(organizations.id, organizationId));
    });

    log.info("admin.organizacao.apagar_tudo.sucesso", { organizationId, name: org.name });
  } catch (err) {
    log.error("admin.organizacao.apagar_tudo.falhou", { organizationId, err });
    return { ok: false, message: "Não foi possível apagar. Tente novamente." };
  }

  revalidatePath("/admin");
  redirect("/admin");
}
