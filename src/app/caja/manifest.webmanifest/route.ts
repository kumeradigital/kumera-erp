const cashRegisterManifest = {
  id: "/caja",
  name: "ERP KUMERA · Caja",
  short_name: "KUMERA Caja",
  description: "Caja diaria de ERP KUMERA",
  start_url: "/caja",
  scope: "/caja",
  display: "standalone",
  background_color: "#f7f6ee",
  theme_color: "#235b45",
  orientation: "landscape",
  icons: [
    {
      src: "/icons/kumera-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/kumera-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/icons/kumera-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ],
};

export function GET() {
  return Response.json(cashRegisterManifest, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "application/manifest+json",
    },
  });
}
