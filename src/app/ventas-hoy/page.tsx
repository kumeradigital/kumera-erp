import { getTodaySalesTotal } from "@/modules/pos/data";
import { PosShell } from "@/modules/pos/pos-shell";
import { TodaySalesRefresh } from "@/modules/pos/today-sales-refresh";
import { formatClp } from "@/shared/money";

export default async function TodaySalesPage() {
  const sales = await getTodaySalesTotal();

  return (
    <PosShell active="sales">
      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg items-start px-4 py-8 sm:items-center sm:py-10">
        <section className="card w-full p-6 text-center sm:p-9">
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#6e746c]">
            Venta de hoy
          </p>
          <p className="mt-5 text-5xl font-black tracking-tight text-[#20231f] sm:text-6xl">
            {formatClp(sales.total)}
          </p>
          <p className="mt-3 text-sm text-[#747970]">
            Actualizado a las {sales.updatedAt}
          </p>
          <TodaySalesRefresh />
        </section>
      </main>
    </PosShell>
  );
}
