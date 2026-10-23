"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/server/supabase/server";

export type BusinessProfileActionState = {
  ok: boolean;
  message: string;
};

const initialError: BusinessProfileActionState = { ok: false, message: "" };

function clean(form: FormData, field: string, max: number) {
  return String(form.get(field) || "")
    .trim()
    .slice(0, max);
}

export async function saveBusinessProfileAction(
  _previous: BusinessProfileActionState = initialError,
  form: FormData,
): Promise<BusinessProfileActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Tu sesión ya no es válida." };

  const { data: membership } = await supabase
    .from("business_admins")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();
  if (!membership)
    return { ok: false, message: "No tienes un negocio asignado." };

  const name = clean(form, "name", 120);
  const legalName = clean(form, "legalName", 160);
  const rut = clean(form, "rut", 20).toUpperCase();
  const businessActivity = clean(form, "businessActivity", 240);
  const address = clean(form, "address", 180);
  const commune = clean(form, "commune", 100);
  const city = clean(form, "city", 100);
  const contactEmail = clean(form, "contactEmail", 160).toLowerCase();
  const phone = clean(form, "phone", 40);
  if (!name || !legalName || !rut)
    return {
      ok: false,
      message: "Nombre comercial, razón social y RUT son obligatorios.",
    };
  if (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail))
    return { ok: false, message: "El correo de contacto no es válido." };

  const { error } = await supabase
    .from("businesses")
    .update({
      name,
      legal_name: legalName,
      rut,
      business_activity: businessActivity || null,
      address: address || null,
      commune: commune || null,
      city: city || null,
      contact_email: contactEmail || null,
      phone: phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", membership.business_id);
  if (error) {
    console.error("No se pudo actualizar la empresa", error);
    return {
      ok: false,
      message: "No pudimos guardar los datos. Inténtalo nuevamente.",
    };
  }
  revalidatePath("/");
  revalidatePath("/empresa");
  revalidatePath("/puesta-en-marcha");
  return { ok: true, message: "Datos de la empresa actualizados." };
}
