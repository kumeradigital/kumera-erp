import { createClient } from "@/server/supabase/server";
import { redirect } from "next/navigation";
import { signOutAction } from "@/modules/auth/actions";

export default async function SuspendedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <main className="grid min-h-screen place-items-center bg-[#235b45] p-5">
      <div className="max-w-md rounded-[28px] bg-[#fffef9] p-8 text-center">
        <p className="text-xs font-black uppercase tracking-widest text-[#657067]">
          ERP Kumera
        </p>
        <h1 className="mt-3 text-2xl font-black">
          Acceso temporalmente suspendido
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#747970]">
          Tus datos permanecen guardados. Comunícate con Kumera para reactivar
          el servicio.
        </p>
        <form action={signOutAction}>
          <button className="mt-6 rounded-xl bg-[#235b45] px-5 py-3 font-black text-white">
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
