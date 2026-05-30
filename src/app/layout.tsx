import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { fontBody, fontDisplay, fontMono, fontUi } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BlackPrint × Mirando por México · Priorización de cirugía de catarata",
    template: "%s · BlackPrint × Mirando por México",
  },
  description:
    "Estudio de location intelligence: dónde y con qué clínicas instalar las jornadas de " +
    "cirugía de catarata de Mirando por México. Priorización descriptiva de 32 entidades.",
  applicationName: "MPM Platform",
  authors: [{ name: "BlackPrint" }],
  keywords: ["cirugía de catarata", "Mirando por México", "location intelligence", "BlackPrint", "salud visual", "México"],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06114B",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontUi.variable} ${fontMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
