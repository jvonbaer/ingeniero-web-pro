import type { Backup, Evaluacion, Jugador, Rubrica } from "../domain/types";

export type ModoAlmacenamiento = "local" | "nube";

export interface EstadoDatos {
  jugadores: Jugador[];
  evaluaciones: Evaluacion[];
  rubrica: Rubrica;
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
  guardarRubrica(rubrica: Rubrica): Promise<void>;
  importar(backup: Backup): Promise<void>;
}

export function construirBackup(estado: EstadoDatos): Backup {
  return {
    formato: "cga-evaluacion-futbol",
    version: 1,
    exportadoEn: new Date().toISOString(),
    jugadores: estado.jugadores,
    evaluaciones: estado.evaluaciones,
    rubrica: estado.rubrica,
  };
}

export function validarBackup(dato: unknown): Backup {
  const b = dato as Partial<Backup>;
  if (!b || b.formato !== "cga-evaluacion-futbol") {
    throw new Error("El archivo no es un respaldo válido de la escuela.");
  }
  if (!Array.isArray(b.jugadores) || !Array.isArray(b.evaluaciones) || !b.rubrica) {
    throw new Error("El respaldo está incompleto o dañado.");
  }
  return b as Backup;
}
