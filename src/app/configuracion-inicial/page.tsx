import { redirect } from "next/navigation";
import { OnboardingForm } from "@/modules/saas/onboarding-form";
import { getWorkspaceContext, saasEnabled } from "@/server/saas/access";
import { createClient } from "@/server/supabase/server";

export const dynamic = "force-dynamic";

export default async function InitialSetupPage() {
  if (!saasEnabled()) redirect("/");
  const context = await getWorkspaceContext();
  if (!context) redirect("/login");
  if (["minimum_complete", "complete"].includes(context.onboardingStatus))
    redirect("/");
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("name,legal_name,rut")
    .eq("id", context.businessId)
    .single();
  return (
    <main className="min-h-screen bg-[#f7f6ee] p-5 md:p-10">
      <div className="mx-auto mb-6 max-w-2xl">
        <p className="font-black text-[#235b45]">ERP KUMERA</p>
        <p className="text-sm text-[#747970]">
          Configuremos tu negocio paso a paso.
        </p>
      </div>
      <OnboardingForm
        defaults={{
          name: data?.name || "",
          legalName: data?.legal_name || "",
          rut: data?.rut || "",
        }}
      />
    </main>
  );
}
