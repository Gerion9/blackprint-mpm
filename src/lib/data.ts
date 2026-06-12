import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  EstadoSchema,
  MetaSchema,
  SourceSchema,
  MunicipioSchema,
  ClinicaSchema,
  SensitivitySchema,
  TijuanaStudySchema,
  TijuanaAgebSchema,
  type Estado,
  type Meta,
  type Source,
  type Municipio,
  type Clinica,
  type Sensitivity,
  type TijuanaStudy,
  type TijuanaAgeb,
} from "./schema";

/**
 * Server-side loaders (RSC / build-time). Leen public/data/*.json.
 * Validan con zod: si el pipeline emite un JSON malformado, el build falla
 * ruidoso (no se publica un score fuera de [0,100] ni un tier inválido).
 * municipios/clinicas pueden no existir aún (Fase B) → fallback [].
 */
const DATA_DIR = path.join(process.cwd(), "public", "data");

async function readValidated<T>(
  relPath: string,
  schema: z.ZodType<T>,
  fallback: T,
): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, relPath), "utf8");
    return schema.parse(JSON.parse(raw));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[data] ${relPath}: ${(err as Error).message} — usando fallback.`);
    }
    return fallback;
  }
}

export function loadEstados(): Promise<ReadonlyArray<Estado>> {
  return readValidated("estados.json", z.array(EstadoSchema), []);
}

export function loadMeta(): Promise<Meta | null> {
  return readValidated("meta.json", MetaSchema, null);
}

export function loadSources(): Promise<ReadonlyArray<Source>> {
  return readValidated("sources.json", z.array(SourceSchema), []);
}

export function loadMunicipios(): Promise<ReadonlyArray<Municipio>> {
  return readValidated("municipios.json", z.array(MunicipioSchema), []);
}

export function loadClinicas(): Promise<ReadonlyArray<Clinica>> {
  return readValidated("clinicas.json", z.array(ClinicaSchema), []);
}

export function loadSensitivity(): Promise<Sensitivity | null> {
  return readValidated("sensitivity.json", SensitivitySchema, null);
}

/** Estudio de plaza Tijuana (dossier /orquesta → tijuana.json). null si aún no existe. */
export function loadTijuana(): Promise<TijuanaStudy | null> {
  return readValidated("tijuana.json", TijuanaStudySchema, null);
}

/** Capa de demanda/desatención por colonia del deliverable (tijuana_agebs.json). [] si falta. */
export function loadTijuanaAgebs(): Promise<ReadonlyArray<TijuanaAgeb>> {
  return readValidated("tijuana_agebs.json", z.array(TijuanaAgebSchema), []);
}
