self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Caja siempre consulta la información vigente de la aplicación.
  // No almacenamos ventas, sesiones ni respuestas privadas en caché.
});
