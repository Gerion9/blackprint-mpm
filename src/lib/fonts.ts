import { Bai_Jamjuree, Inter, JetBrains_Mono, Work_Sans } from "next/font/google";

/**
 * Polaris design system — 4 familias canónicas (ref POLARIS_TOKENS.md §1).
 *   Display (Bai Jamjuree)  → h1 hero, h2 secciones, KPI value.
 *   Body    (Work Sans)     → párrafos, copy editorial.
 *   UI      (Inter)         → labels, pills, navegación.
 *   Mono    (JetBrains Mono)→ eyebrows, num-tag §, KPI sub, tabular.
 */
export const fontDisplay = Bai_Jamjuree({
  subsets: ["latin"],
  weight: ["300", "500", "700"],
  variable: "--font-display",
  display: "swap",
});

export const fontBody = Work_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const fontUi = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

export const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
});
