"use client";

import { useEffect } from "react";

export function CashRegisterPwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const deploymentId = document.documentElement.dataset.dplId;
    const workerUrl = deploymentId
      ? `/caja-sw.js?dpl=${encodeURIComponent(deploymentId)}`
      : "/caja-sw.js";
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;

    const reloadForNewVersion = () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      reloadForNewVersion,
    );

    let registration: ServiceWorkerRegistration | undefined;
    const updateWorker = () => registration?.update().catch(() => undefined);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") updateWorker();
    };

    navigator.serviceWorker
      .register(workerUrl, {
        scope: "/caja",
        updateViaCache: "none",
      })
      .then((nextRegistration) => {
        registration = nextRegistration;
        return nextRegistration.update();
      })
      .catch(() => {
        // Caja continúa funcionando si este navegador no admite instalación.
      });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", updateWorker);
    const interval = window.setInterval(updateWorker, 5 * 60 * 1000);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        reloadForNewVersion,
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", updateWorker);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
