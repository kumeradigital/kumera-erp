"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperadmin } from "@/server/saas/access";
import { createAdminClient } from "@/server/supabase/admin";
import { createClient } from "@/server/supabase/server";
import { moduleKeys, type ModuleKey } from "@/server/saas/types";

export type ProvisionState = {
  ok: boolean;
  message: string;
  businessId?: string;
};

const schema = z.object({
  businessName: z.string().trim().min(2).max(120),
  legalName: z.string().trim().max(160),
  rut: z.string().trim().max(20),
  ownerName: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase(),
  temporaryPassword: z.string().min(10).max(100),
  plan: z.enum(["costs", "management", "operations"]),
  modules: z.array(z.enum(moduleKeys)).min(1),
});

export async function provisionBusinessAction(
  _state: ProvisionState,
  form: FormData,
): Promise<ProvisionState> {
  await requireSuperadmin();
  const parsed = schema.safeParse({
    businessName: form.get("businessName"),
    legalName: form.get("legalName"),
    rut: form.get("rut"),
    ownerName: form.get("ownerName"),
    email: form.get("email"),
    temporaryPassword: form.get("temporaryPassword"),
    plan: form.get("plan"),
    modules: ["core", ...form.getAll("modules")],
  });
  if (!parsed.success)
    return {
      ok: false,
      message: "Revisa los datos y usa una clave de al menos 10 caracteres.",
    };

  const admin = createAdminClient();
  const { data: created, error: userError } = await admin.auth.admin.createUser(
    {
      email: parsed.data.email,
      password: parsed.data.temporaryPassword,
      email_confirm: true,
      user_metadata: { display_name: parsed.data.ownerName },
    },
  );
  if (userError || !created.user)
    return {
      ok: false,
      message: userError?.message || "No se pudo crear el acceso.",
    };

  const supabase = await createClient();
  const { data: businessId, error: provisionError } = await supabase.rpc(
    "provision_beta_business",
    {
      p_user_id: created.user.id,
      p_email: parsed.data.email,
      p_display_name: parsed.data.ownerName,
      p_business_name: parsed.data.businessName,
      p_legal_name: parsed.data.legalName,
      p_rut: parsed.data.rut,
      p_plan_key: parsed.data.plan,
    },
  );
  if (provisionError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return {
      ok: false,
      message: `No se aprovisionó la empresa: ${provisionError.message}`,
    };
  }
  const selected = new Set<ModuleKey>(parsed.data.modules);
  const overrides = moduleKeys.map((moduleKey) => ({
    business_id: businessId,
    module_key: moduleKey,
    enabled: selected.has(moduleKey),
    reason: "Configuración definida al crear el cliente",
    updated_at: new Date().toISOString(),
  }));
  const { error: moduleError } = await supabase
    .from("business_module_overrides")
    .upsert(overrides, { onConflict: "business_id,module_key" });
  if (moduleError)
    return {
      ok: false,
      message: `La empresa fue creada, pero faltó configurar sus módulos: ${moduleError.message}`,
      businessId,
    };
  revalidatePath("/admin/clientes");
  return {
    ok: true,
    message: "Cliente beta creado sin modificar ningún negocio existente.",
    businessId,
  };
}

export async function setBusinessModulesAction(form: FormData) {
  await requireSuperadmin();
  const businessId = String(form.get("businessId") || "");
  if (!/^[0-9a-f-]{36}$/i.test(businessId)) return;
  const selected = new Set(
    form
      .getAll("modules")
      .map(String)
      .filter((value): value is ModuleKey =>
        moduleKeys.includes(value as ModuleKey),
      ),
  );
  selected.add("core");
  const supabase = await createClient();
  const { error } = await supabase.from("business_module_overrides").upsert(
    moduleKeys.map((moduleKey) => ({
      business_id: businessId,
      module_key: moduleKey,
      enabled: selected.has(moduleKey),
      reason: "Configuración manual desde administración",
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "business_id,module_key" },
  );
  if (error)
    throw new Error(`No se pudieron actualizar los módulos: ${error.message}`);
  revalidatePath("/admin/clientes");
}

const platformAdminSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase(),
  temporaryPassword: z.string().min(10).max(100),
});

export async function createPlatformAdminAction(
  _state: ProvisionState,
  form: FormData,
): Promise<ProvisionState> {
  await requireSuperadmin();
  const parsed = platformAdminSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      ok: false,
      message: "Revisa el correo y usa una clave de al menos 10 caracteres.",
    };
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.temporaryPassword,
    email_confirm: true,
    user_metadata: { display_name: parsed.data.displayName },
  });
  if (error || !data.user)
    return {
      ok: false,
      message: error?.message || "No se pudo crear el administrador.",
    };
  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    email: parsed.data.email,
    display_name: parsed.data.displayName,
    is_superadmin: true,
    active: true,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, message: profileError.message };
  }
  revalidatePath("/admin/clientes");
  return {
    ok: true,
    message:
      "Administrador de plataforma creado. No pertenece a ninguna empresa.",
  };
}

export async function revokePlatformAdminAction(form: FormData) {
  const current = await requireSuperadmin();
  const userId = String(form.get("userId") || "");
  if (!/^[0-9a-f-]{36}$/i.test(userId) || userId === current.userId) return;
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_superadmin", true)
    .eq("active", true);
  if ((count || 0) < 2)
    throw new Error("Debe existir al menos otro administrador activo.");
  await supabase
    .from("profiles")
    .update({ is_superadmin: false })
    .eq("id", userId);
  revalidatePath("/admin/clientes");
}

export async function setSubscriptionStatusAction(form: FormData) {
  await requireSuperadmin();
  const businessId = String(form.get("businessId") || "");
  const status = String(form.get("status") || "");
  if (!/^[0-9a-f-]{36}$/i.test(businessId)) return;
  if (!["trial", "active", "suspended", "cancelled"].includes(status)) return;
  const supabase = await createClient();
  await supabase
    .from("business_subscriptions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("business_id", businessId);
  revalidatePath("/admin/clientes");
}
