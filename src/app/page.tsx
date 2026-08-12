import { OpeningApp } from "@/modules/opening/opening-app";
import { getOpeningData } from "@/modules/opening/data";
import { createClient } from "@/server/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const data = await getOpeningData(user.id);
  if (!data)
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f6ee] p-6">
        <div className="card max-w-lg p-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#6e746c]">
            ERP KUMERA
          </p>
          <h1 className="mt-3 text-2xl font-black">
            Tu usuario aún no tiene un negocio asignado
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#747970]">
            La conexión con Supabase funciona. El superadministrador debe crear
            KUMERA y asignar tu usuario antes de ingresar movimientos.
          </p>
        </div>
      </main>
    );
  return (
    <OpeningApp
      initialEntries={data.entries}
      initialCategories={data.categories}
      businessName={data.businessName}
      ledgerId={data.ledgerId}
      ledgerStatus={data.ledgerStatus}
      closedAt={data.closedAt}
      recoverableInvestment={data.recoverableInvestment}
      connected
    />
  );
}
