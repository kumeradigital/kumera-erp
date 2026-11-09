import { ProvisionForm } from "@/modules/saas/provision-form";
import { PlatformAdminForm } from "@/modules/saas/platform-admin-form";
import {
  revokePlatformAdminAction,
  setBusinessModulesAction,
  setSubscriptionStatusAction,
} from "@/modules/saas/admin-actions";
import { requireSuperadmin } from "@/server/saas/access";
import { createClient } from "@/server/supabase/server";
import { signOutAction } from "@/modules/auth/actions";

const configurableModules = [
  ["costing", "Costeo"],
  ["inventory", "Inventario"],
  ["finance", "Finanzas"],
  ["pos", "Caja"],
  ["sales", "Ventas"],
  ["production", "Producción"],
  ["payroll", "Personas"],
] as const;

export default async function AdminClientsPage() {
  const currentAdmin = await requireSuperadmin();
  const supabase = await createClient();
  const [
    subscriptionsResult,
    overridesResult,
    planModulesResult,
    adminsResult,
  ] = await Promise.all([
    supabase
      .from("business_subscriptions")
      .select("business_id,plan_key,status,starts_at,businesses(name,rut)")
      .order("starts_at", { ascending: false }),
    supabase
      .from("business_module_overrides")
      .select("business_id,module_key,enabled"),
    supabase.from("saas_plan_modules").select("plan_key,module_key"),
    supabase
      .from("profiles")
      .select("id,display_name,email")
      .eq("is_superadmin", true)
      .eq("active", true)
      .order("created_at"),
  ]);
  const subscriptions = subscriptionsResult.data || [];
  const overrides = overridesResult.data || [];
  const planModules = planModulesResult.data || [];
  const admins = adminsResult.data || [];

  return (
    <main className="min-h-screen bg-[#f7f6ee] p-5 md:p-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-black uppercase tracking-[.16em] text-[#657067]">
          Administración SaaS
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mt-2 text-3xl font-black">Clientes de ERP Kumera</h1>
            <p className="mt-1 text-sm text-[#747970]">
              Sesión: {currentAdmin.email}
            </p>
          </div>
          <form action={signOutAction}>
            <button className="rounded-xl border border-[#235b45] px-4 py-3 text-sm font-black text-[#235b45]">
              Cerrar sesión
            </button>
          </form>
        </div>
        <div className="mt-6">
          <PlatformAdminForm />
        </div>
        <section className="card mt-6 p-6">
          <h2 className="text-xl font-black">Administradores activos</h2>
          <div className="mt-3 divide-y divide-[#e1e1d7]">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-black">
                    {admin.display_name || "Administrador"}
                  </p>
                  <p className="text-xs text-[#777]">{admin.email}</p>
                </div>
                {admins.length > 1 && admin.id !== currentAdmin.userId && (
                  <form action={revokePlatformAdminAction}>
                    <input type="hidden" name="userId" value={admin.id} />
                    <button className="rounded-lg border border-[#d7d7ce] px-3 py-2 text-xs font-bold text-[#8c3e2c]">
                      Quitar administración
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
        <div className="mt-6">
          <ProvisionForm />
        </div>
        <section className="card mt-6 overflow-hidden p-6">
          <h2 className="text-xl font-black">Empresas aprovisionadas</h2>
          <p className="mt-1 text-sm text-[#747970]">
            El núcleo y el perfil de empresa siempre permanecen activos.
          </p>
          <div className="mt-4 divide-y divide-[#e1e1d7]">
            {subscriptions.map((item) => {
              const business = item.businesses as unknown as {
                name?: string;
                rut?: string;
              } | null;
              const enabled = new Set(
                planModules
                  .filter((row) => row.plan_key === item.plan_key)
                  .map((row) => row.module_key),
              );
              for (const override of overrides.filter(
                (row) => row.business_id === item.business_id,
              )) {
                if (override.enabled) enabled.add(override.module_key);
                else enabled.delete(override.module_key);
              }
              return (
                <div
                  key={item.business_id}
                  className="grid gap-4 py-5 lg:grid-cols-[1fr_2fr]"
                >
                  <div>
                    <p className="font-black">{business?.name}</p>
                    <p className="text-xs text-[#777]">
                      {business?.rut || "Sin RUT"} · {item.plan_key} ·{" "}
                      {item.status}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <form action={setBusinessModulesAction}>
                      <input
                        type="hidden"
                        name="businessId"
                        value={item.business_id}
                      />
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {configurableModules.map(([key, label]) => (
                          <label
                            key={key}
                            className="flex items-center gap-2 rounded-lg bg-[#f4f4ed] p-2 text-xs font-bold"
                          >
                            <input
                              type="checkbox"
                              name="modules"
                              value={key}
                              defaultChecked={enabled.has(key)}
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      <button className="mt-3 rounded-lg bg-[#235b45] px-3 py-2 text-xs font-black text-white">
                        Guardar módulos
                      </button>
                    </form>
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
                      <button className="rounded-lg border border-[#235b45] px-3 py-2 text-xs font-black text-[#235b45]">
                        Guardar estado
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
