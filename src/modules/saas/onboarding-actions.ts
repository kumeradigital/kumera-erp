"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getWorkspaceContext, saasEnabled } from "@/server/saas/access";
import { createClient } from "@/server/supabase/server";

export type OnboardingState = { ok: boolean; message: string };

const schema = z.object({
  password: z.string().min(10).max(100),
  name: z.string().trim().min(2).max(120),
  legalName: z.string().trim().min(2).max(160),
  rut: z.string().trim().min(7).max(20),
  activity: z.string().trim().max(240),
  address: z.string().trim().min(3).max(180),
  commune: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  locationName: z.string().trim().min(2).max(100),
  businessModel: z.array(z.enum(["resale", "manufactured"])).min(1),
  salesChannels: z.array(z.string().max(40)),
  paymentMethods: z.array(z.string().max(40)),
});

export async function completeOnboardingAction(
  _state: OnboardingState,
  form: FormData,
): Promise<OnboardingState> {
  if (!saasEnabled())
    return { ok: false, message: "El modo SaaS todavía no está habilitado." };
  const context = await getWorkspaceContext();
  if (!context || !["owner", "admin"].includes(context.role))
    return {
      ok: false,
      message: "No tienes permisos para configurar esta empresa.",
    };
  const parsed = schema.safeParse({
    password: form.get("password"),
    name: form.get("name"),
    legalName: form.get("legalName"),
    rut: form.get("rut"),
    activity: form.get("activity"),
    address: form.get("address"),
    commune: form.get("commune"),
    city: form.get("city"),
    locationName: form.get("locationName"),
    businessModel: form.getAll("businessModel"),
    salesChannels: form.getAll("salesChannels"),
    paymentMethods: form.getAll("paymentMethods"),
  });
  if (!parsed.success)
    return {
      ok: false,
      message:
        "Completa los datos obligatorios y usa una clave de al menos 10 caracteres.",
    };

  const supabase = await createClient();
  const passwordResult = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (passwordResult.error)
    return { ok: false, message: passwordResult.error.message };

  const businessResult = await supabase
    .from("businesses")
    .update({
      name: parsed.data.name,
      legal_name: parsed.data.legalName,
      rut: parsed.data.rut.toUpperCase(),
      business_activity: parsed.data.activity || null,
      address: parsed.data.address,
      commune: parsed.data.commune,
      city: parsed.data.city,
      updated_at: new Date().toISOString(),
    })
    .eq("id", context.businessId);
  if (businessResult.error)
    return { ok: false, message: businessResult.error.message };

  const locationResult = await supabase
    .from("business_locations")
    .update({
      name: parsed.data.locationName,
      address: parsed.data.address,
      commune: parsed.data.commune,
      city: parsed.data.city,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", context.businessId)
    .eq("is_primary", true);
  if (locationResult.error)
    return { ok: false, message: locationResult.error.message };

  const { error } = await supabase
    .from("business_onboarding")
    .update({
      status: "minimum_complete",
      current_step: "first_product",
      completed_steps: [
        "password",
        "business",
        "location",
        "operations",
        "channels",
      ],
      business_model: parsed.data.businessModel,
      sales_channels: parsed.data.salesChannels,
      payment_methods: parsed.data.paymentMethods,
      minimum_completed_at: new Date().toISOString(),
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", context.businessId);
  if (error) return { ok: false, message: error.message };
  await supabase
    .from("business_memberships")
    .update({ must_change_password: false })
    .eq("business_id", context.businessId)
    .eq("user_id", context.userId);
  redirect("/costos?bienvenida=1");
}
