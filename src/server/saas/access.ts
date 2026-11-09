import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import {
  allModules,
  moduleKeys,
  type BusinessRole,
  type ModuleKey,
  type WorkspaceContext,
} from "./types";

export function saasEnabled() {
  return process.env.KUMERA_SAAS_ENABLED === "true";
}

function validModules(values: unknown[]): ModuleKey[] {
  return values.filter((value): value is ModuleKey =>
    moduleKeys.includes(value as ModuleKey),
  );
}

export const getWorkspaceContext = cache(
  async (): Promise<WorkspaceContext | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .maybeSingle();

    if (!saasEnabled()) {
      const { data: legacy } = await supabase
        .from("business_admins")
        .select("business_id,businesses(name)")
        .eq("user_id", user.id)
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      if (!legacy) return null;
      const business = legacy.businesses as unknown as { name?: string } | null;
      return {
        userId: user.id,
        businessId: legacy.business_id,
        businessName: business?.name || "Tu negocio",
        role: "owner",
        modules: allModules,
        subscriptionStatus: "legacy",
        onboardingStatus: "complete",
        mustChangePassword: false,
        isSuperadmin: Boolean(profile?.is_superadmin),
      };
    }

    const { data: membership } = await supabase
      .from("business_memberships")
      .select("id,business_id,role,must_change_password,businesses(name)")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (!membership) return null;

    const [
      subscriptionResult,
      overridesResult,
      locationResult,
      onboardingResult,
    ] = await Promise.all([
      supabase
        .from("business_subscriptions")
        .select("plan_key,status,saas_plan_modules(module_key)")
        .eq("business_id", membership.business_id)
        .maybeSingle(),
      supabase
        .from("business_module_overrides")
        .select("module_key,enabled")
        .eq("business_id", membership.business_id),
      supabase
        .from("business_locations")
        .select("id")
        .eq("business_id", membership.business_id)
        .eq("is_primary", true)
        .maybeSingle(),
      supabase
        .from("business_onboarding")
        .select("status")
        .eq("business_id", membership.business_id)
        .maybeSingle(),
    ]);

    const subscription = subscriptionResult.data;
    const planRows = (subscription?.saas_plan_modules || []) as unknown as {
      module_key: string;
    }[];
    const enabled = new Set(
      validModules(planRows.map((row) => row.module_key)),
    );
    for (const override of overridesResult.data || []) {
      if (!moduleKeys.includes(override.module_key as ModuleKey)) continue;
      if (override.enabled) enabled.add(override.module_key as ModuleKey);
      else enabled.delete(override.module_key as ModuleKey);
    }
    const business = membership.businesses as unknown as {
      name?: string;
    } | null;
    return {
      userId: user.id,
      businessId: membership.business_id,
      businessName: business?.name || "Tu negocio",
      role: membership.role as BusinessRole,
      locationId: locationResult.data?.id,
      modules: [...enabled],
      subscriptionStatus: subscription?.status || "provisioned",
      onboardingStatus: onboardingResult.data?.status || "not_started",
      mustChangePassword: membership.must_change_password,
      isSuperadmin: Boolean(profile?.is_superadmin),
    };
  },
);

export async function requireWorkspace() {
  const context = await getWorkspaceContext();
  if (!context) redirect("/login");
  if (["suspended", "cancelled"].includes(context.subscriptionStatus))
    redirect("/acceso-suspendido");
  return context;
}

export async function requireModule(module: ModuleKey) {
  const context = await requireWorkspace();
  if (!context.modules.includes(module)) redirect("/?modulo=no-disponible");
  if (
    saasEnabled() &&
    context.onboardingStatus !== "complete" &&
    context.onboardingStatus !== "minimum_complete"
  )
    redirect("/configuracion-inicial");
  return context;
}

export async function requireSuperadmin() {
  const context = await requireWorkspace();
  if (!context.isSuperadmin) redirect("/");
  return context;
}
