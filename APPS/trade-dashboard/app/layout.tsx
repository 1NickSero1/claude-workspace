import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trade Dashboard — Nico & Sebas",
  description: "Precios en vivo de los activos que estamos siguiendo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-neutral-950 text-neutral-100 min-h-screen">{children}</body>
    </html>
  );
}
