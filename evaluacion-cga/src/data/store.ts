import type { Backup, Camiseta, Configuracion, Evaluacion, Jugador } from "../domain/types";
import { migrarConfiguracion, migrarEvaluaciones } from "./migrar";

export type ModoAlmacenamiento = "local" | "nube";

export interface EstadoDatos {
  jugadores: Jugador[];
  evaluaciones: Evaluacion[];
  camisetas: Camiseta[];
  configuracion: Configuracion;
}

/**
 * Contrato único de persistencia. El resto de la aplicación no sabe si está
 * hablando con IndexedDB o con Supabase; cambiar de uno a otro es sólo definir
 * las variables de entorno.
 */
export interface Store {
  modo: ModoAlmacenamiento;
  etiqueta: string;
  cargar(): Promise<EstadoDatos>;
  guardarJugador(jugador: Jugador): Promise<void>;
  eliminarJugador(id: string): Promise<void>;
  guardarEvaluacion(evaluacion: Evaluacion): Promise<void>;
  eliminarEvaluacion(id: string): Promise<void>;
  guardarCamiseta(camiseta: Camiseta): Promise<void>;
  eliminarCamiseta(id: string): Promise<void>;
  guardarConfiguracion(configuracion: Configuracion): Promise<void>;
  /** Hoja de papel escaneada. Se guarda y se lee aparte de la evaluación. */
  leerHoja(evaluacionId: string): Promise<string | null>;
  guardarHoja(evaluacionId: string, dataUrl: string | null): Promise<void>;
  importar(backup: Backup): Promise<void>;
}

export function construirBackup(estado: EstadoDatos): Backup {
  return {
    formato: "cga-evaluacion-futbol",
    version: 3,
    exportadoEn: new Date().toISOString(),
    jugadores: estado.jugadores,
    evaluaciones: estado.evaluaciones,
    camisetas: estado.camisetas,
    configuracion: estado.configuracion,
  };
}

/**
 * Acepta respaldos de las tres versiones del formato. Los de la versión 1 traen
 * una sola rúbrica; se convierten a la estructura de pautas al vuelo. Los de la
 * 2 no traen camisetas, y entran con el pedido vacío. Así un archivo bajado
 * hace meses se sigue pudiendo cargar.
 */
export function validarBackup(dato: unknown): Backup {
  const b = dato as (Partial<Backup> & { rubrica?: unknown }) | undefined;
  if (!b || b.formato !== "cga-evaluacion-futbol") {
    throw new Error("El archivo no es un respaldo válido de la escuela.");
  }
  if (!Array.isArray(b.jugadores) || !Array.isArray(b.evaluaciones)) {
    throw new Error("El respaldo está incompleto o dañado.");
  }
  if (!b.configuracion && !b.rubrica) {
    throw new Error("El respaldo no trae los parámetros de evaluación.");
  }

  const configuracion = migrarConfiguracion(b.configuracion ?? b.rubrica);
  return {
    formato: "cga-evaluacion-futbol",
    version: 3,
    exportadoEn: b.exportadoEn ?? new Date().toISOString(),
    jugadores: b.jugadores,
    evaluaciones: migrarEvaluaciones(b.evaluaciones, configuracion),
    camisetas: Array.isArray(b.camisetas) ? b.camisetas : [],
    configuracion,
  };
}
