import { createClient } from "@/server/supabase/server";
import type { BusinessProfile } from "./types";

export async function getBusinessProfile(): Promise<BusinessProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión no válida");

  const { data: membership, error: membershipError } = await supabase
    .from("business_admins")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();
  if (membershipError || !membership) throw new Error("Sin negocio");

  const [businessResult, profileResult, ledgerResult] = await Promise.all([
    supabase
      .from("businesses")
      .select(
        "id,name,rut,legal_name,business_activity,address,commune,city,contact_email,phone,currency,timezone",
      )
      .eq("id", membership.business_id)
      .single(),
    supabase
      .from("profiles")
      .select("display_name,email")
      .eq("id", user.id)
      .single(),
    supabase
      .from("opening_ledgers")
      .select("status,closed_at")
      .eq("business_id", membership.business_id)
      .maybeSingle(),
  ]);
  if (businessResult.error) throw businessResult.error;
  if (profileResult.error) throw profileResult.error;
  if (ledgerResult.error) throw ledgerResult.error;
  const business = businessResult.data;
  const profile = profileResult.data;
  return {
    id: business.id,
    name: business.name,
    legalName: business.legal_name || "",
    rut: business.rut || "",
    businessActivity: business.business_activity || "",
    address: business.address || "",
    commune: business.commune || "",
    city: business.city || "",
    contactEmail: business.contact_email || "",
    phone: business.phone || "",
    currency: business.currency,
    timezone: business.timezone,
    administratorName: profile.display_name || "Administrador",
    administratorEmail: profile.email,
    openingStatus: ledgerResult.data?.status,
    openingClosedAt: ledgerResult.data?.closed_at || undefined,
  };
}
