import type { Metadata, Viewport } from "next";
import { CashRegisterPwaRegistration } from "./pwa-registration";

export const metadata: Metadata = {
  title: "Caja · ERP KUMERA",
  applicationName: "ERP KUMERA · Caja",
  manifest: "/caja/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "KUMERA Caja",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/kumera-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#235b45",
  viewportFit: "cover",
};

export default function CashRegisterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <CashRegisterPwaRegistration />
      {children}
    </>
  );
}
