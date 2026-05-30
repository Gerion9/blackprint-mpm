/** Utilidades de formato es-MX. */
const NF = new Intl.NumberFormat("es-MX");

export function formatNumber(n: number): string {
  return NF.format(n);
}

export function formatPercent(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`;
}

/** Normaliza un nombre de entidad a una llave de join (sin acentos, alias). */
export function canonEstado(name: string): string {
  let s = (name ?? "")
    .toString()
    .toLowerCase()
    .replace(/[áàä]/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/[óö]/g, "o")
    .replace(/ú/g, "u")
    .replace(/ñ/g, "n")
    .trim();
  const alias: Record<string, string> = {
    "estado de mexico": "mexico",
    edomex: "mexico",
    cdmx: "ciudad de mexico",
    "coahuila de zaragoza": "coahuila",
    "michoacan de ocampo": "michoacan",
    "veracruz de ignacio de la llave": "veracruz",
    "queretaro de arteaga": "queretaro",
  };
  return alias[s] ?? s;
}
