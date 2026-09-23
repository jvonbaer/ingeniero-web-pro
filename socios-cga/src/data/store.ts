import type {
  Aviso,
  Backup,
  EntradaBitacora,
  Inscripcion,
  Pago,
  Persona,
  Plan,
  Vinculo,
} from "../domain/types";

export type ModoAlmacenamiento = "local" | "nube";

export interface EstadoDatos {
  personas: Persona[];
  vinculos: Vinculo[];
  planes: Plan[];
  inscripciones: Inscripcion[];
  pagos: Pago[];
  avisos: Aviso[];
}

/**
 * Contrato único de persistencia. Las pantallas no saben si están hablando con
 * IndexedDB de este computador o con la base compartida en Supabase; pasar de
 * uno a otro es sólo configurar la conexión.
 */
export interface Store {
  modo: ModoAlmacenamiento;
  etiqueta: string;
  cargar(): Promise<EstadoDatos>;
  guardarPersona(persona: Persona): Promise<void>;
  /** Borra también sus vínculos, inscripciones y pagos. */
  eliminarPersona(id: string): Promise<void>;
  guardarVinculo(vinculo: Vinculo): Promise<void>;
  eliminarVinculo(id: string): Promise<void>;
  guardarPlan(plan: Plan): Promise<void>;
  eliminarPlan(id: string): Promise<void>;
  guardarInscripcion(inscripcion: Inscripcion): Promise<void>;
  eliminarInscripcion(id: string): Promise<void>;
  guardarPago(pago: Pago): Promise<void>;
  eliminarPago(id: string): Promise<void>;
  guardarAviso(aviso: Aviso): Promise<void>;
  /** Quién hizo qué, de lo más reciente a lo más antiguo. */
  bitacora(limite?: number): Promise<EntradaBitacora[]>;
  importar(backup: Backup): Promise<void>;
  vaciar(): Promise<void>;
}

export function estadoVacio(): EstadoDatos {
  return { personas: [], vinculos: [], planes: [], inscripciones: [], pagos: [], avisos: [] };
}

export function construirBackup(estado: EstadoDatos): Backup {
  return {
    formato: "cga-socios",
    version: 1,
    exportadoEn: new Date().toISOString(),
    personas: estado.personas,
    vinculos: estado.vinculos,
    planes: estado.planes,
    inscripciones: estado.inscripciones,
    pagos: estado.pagos,
    avisos: estado.avisos,
  };
}

export function validarBackup(dato: unknown): Backup {
  const b = dato as Partial<Backup> | undefined;
  if (!b || b.formato !== "cga-socios") {
    throw new Error("El archivo no es un respaldo del registro de socios del CGA.");
  }
  if (!Array.isArray(b.personas) || !Array.isArray(b.planes)) {
    throw new Error("El respaldo está incompleto o dañado.");
  }
  return {
    formato: "cga-socios",
    version: 1,
    exportadoEn: b.exportadoEn ?? new Date().toISOString(),
    personas: b.personas,
    vinculos: b.vinculos ?? [],
    planes: b.planes,
    inscripciones: b.inscripciones ?? [],
    pagos: b.pagos ?? [],
    avisos: b.avisos ?? [],
  };
}

/** Identificadores propios: no hace falta pedirle uno a la base para guardar. */
export function nuevoId(prefijo: string): string {
  const azar = crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefijo}_${Date.now().toString(36)}${azar}`;
}
