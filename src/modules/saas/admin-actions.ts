"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperadmin } from "@/server/saas/access";
import { createAdminClient } from "@/server/supabase/admin";
import { createClient } from "@/server/supabase/server";

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
});

export async function provisionBusinessAction(
  _state: ProvisionState,
  form: FormData,
): Promise<ProvisionState> {
  await requireSuperadmin();
  const parsed = schema.safeParse(Object.fromEntries(form));
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
  revalidatePath("/admin/clientes");
  return {
    ok: true,
    message: "Cliente beta creado sin modificar ningún negocio existente.",
    businessId,
  };
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
