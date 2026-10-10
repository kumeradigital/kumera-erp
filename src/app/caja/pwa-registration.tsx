"use client";

import { useEffect } from "react";

export function CashRegisterPwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/caja-sw.js", {
        scope: "/caja",
        updateViaCache: "none",
      })
      .catch(() => {
        // Caja continúa funcionando si este navegador no admite instalación.
      });
  }, []);

  return null;
}
