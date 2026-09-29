import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { ToastProvider } from "@/components/client/toast";

export const metadata: Metadata = {
  title: { default: "ScoutUp · Demo", template: "%s · ScoutUp" },
  description: "ScoutUp — Connectant talent, clubs i oportunitats. Demo interactiva amb dades fictícies.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b0d13", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ca">
      <body className="min-h-dvh font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
