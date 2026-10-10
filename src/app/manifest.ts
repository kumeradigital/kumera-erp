import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/caja",
    name: "ERP KUMERA · Caja",
    short_name: "KUMERA",
    description: "Caja y gestión diaria de ERP KUMERA",
    start_url: "/caja",
    scope: "/",
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
}
