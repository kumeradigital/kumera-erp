import type { Metadata } from "next";
import { MobileCashierGuard } from "@/shared/ui/mobile-cashier-guard";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP KUMERA",
  description: "Control simple y claro para abrir tu negocio",
  applicationName: "ERP KUMERA",
  appleWebApp: {
    capable: true,
    title: "KUMERA",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/kumera-192.png",
  },
};

export const viewport = {
  themeColor: "#235b45",
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <MobileCashierGuard>{children}</MobileCashierGuard>
      </body>
    </html>
  );
}
