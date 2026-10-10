import type { Metadata } from "next";
import { MobileCashierGuard } from "@/shared/ui/mobile-cashier-guard";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERP KUMERA",
  description: "Control simple y claro para abrir tu negocio",
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
