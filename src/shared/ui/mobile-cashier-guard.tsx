"use client";

import { useEffect, useState } from "react";
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
  const [canRender, setCanRender] = useState(routeIsAvailableOnMobile);

  useEffect(() => {
    if (routeIsAvailableOnMobile) {
      setCanRender(true);
      return;
    }

    const media = window.matchMedia(MOBILE_QUERY);
    if (media.matches) {
      setCanRender(false);
      router.replace("/caja");
      return;
    }

    setCanRender(true);
  }, [routeIsAvailableOnMobile, router]);

  if (!canRender) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[#f7f6ee] p-6">
        <div className="text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#d8f070] text-xl font-black text-[#235b45]">
            K
          </div>
          <p className="mt-3 text-sm font-bold text-[#235b45]">
            Abriendo caja…
          </p>
        </div>
      </main>
    );
  }

  return children;
}
