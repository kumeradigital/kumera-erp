"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function TodaySalesRefresh() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => router.refresh())}
      className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#bdd0c4] bg-white px-5 font-black text-[#235b45] disabled:opacity-60"
    >
      <RefreshCw size={19} className={isPending ? "animate-spin" : ""} />
      {isPending ? "Actualizando…" : "Actualizar venta"}
    </button>
  );
}
