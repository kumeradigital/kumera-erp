import { ProvisionForm } from "@/modules/saas/provision-form";
import { setSubscriptionStatusAction } from "@/modules/saas/admin-actions";
import { requireSuperadmin } from "@/server/saas/access";
import { createClient } from "@/server/supabase/server";

export default async function AdminClientsPage() {
  await requireSuperadmin();
  const supabase = await createClient();
  const { data: subscriptions } = await supabase
    .from("business_subscriptions")
    .select("business_id,plan_key,status,starts_at,businesses(name,rut)")
    .order("starts_at", { ascending: false });
  return (
    <main className="min-h-screen bg-[#f7f6ee] p-5 md:p-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-black uppercase tracking-[.16em] text-[#657067]">
          Administración SaaS
        </p>
        <h1 className="mt-2 text-3xl font-black">Clientes de ERP Kumera</h1>
        <div className="mt-6">
          <ProvisionForm />
        </div>
        <section className="card mt-6 overflow-hidden p-6">
          <h2 className="text-xl font-black">Empresas aprovisionadas</h2>
          <div className="mt-4 divide-y divide-[#e1e1d7]">
            {(subscriptions || []).map((item) => {
              const business = item.businesses as unknown as {
                name?: string;
                rut?: string;
              } | null;
              return (
                <div
                  key={item.business_id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="font-black">{business?.name}</p>
                    <p className="text-xs text-[#777]">
                      {business?.rut || "Sin RUT"} · {item.plan_key} ·{" "}
                      {item.status}
                    </p>
                  </div>
                  <form
                    action={setSubscriptionStatusAction}
                    className="flex gap-2"
                  >
                    <input
                      type="hidden"
                      name="businessId"
                      value={item.business_id}
                    />
                    <select
                      name="status"
                      defaultValue={item.status}
                      className="rounded-lg border border-[#d7d7ce] bg-white px-3 text-sm"
                    >
                      <option value="trial">Prueba</option>
                      <option value="active">Activo</option>
                      <option value="suspended">Suspendido</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                    <button className="rounded-lg bg-[#235b45] px-3 py-2 text-xs font-black text-white">
                      Guardar
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
