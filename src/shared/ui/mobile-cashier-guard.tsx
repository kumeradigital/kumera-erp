"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const MOBILE_QUERY = "(max-width: 767px)";
const MOBILE_ROUTES = new Set(["/login", "/caja"]);

export function MobileCashierGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const routeIsAvailableOnMobile = MOBILE_ROUTES.has(pathname);

  useEffect(() => {
    if (routeIsAvailableOnMobile) return;

    const media = window.matchMedia(MOBILE_QUERY);
    if (media.matches) router.replace("/caja");
  }, [routeIsAvailableOnMobile, router]);

  if (routeIsAvailableOnMobile) return children;

  return (
    <>
      <div className="hidden md:contents">{children}</div>
      <main className="grid min-h-dvh place-items-center bg-[#f7f6ee] p-6 md:hidden">
        <div className="text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#d8f070] text-xl font-black text-[#235b45]">
            K
          </div>
          <p className="mt-3 text-sm font-bold text-[#235b45]">
            Abriendo caja…
          </p>
        </div>
      </main>
    </>
  );
}
