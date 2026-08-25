import { CATEGORIAS_EDAD, CONFIGURACION_BASE, ENTRENADORES_BASE } from "../config/pautas";
import type { Configuracion, Evaluacion, Pauta } from "../domain/types";

/**
 * Migración del formato 1 al 2.
 *
 * En el formato 1 la escuela tenía una sola rúbrica para todas las categorías.
 * En el 2 hay varias pautas y cada categoría apunta a una. Esto convierte lo
 * viejo en lo nuevo sin perder nada: la rúbrica única pasa a ser una pauta y
 * queda asignada a todas las categorías, que es exactamente el comportamiento
 * que la escuela tenía hasta ahora.
 *
 * Se aplica tanto a los datos guardados en el dispositivo o en la nube como a
 * los respaldos que se carguen desde un archivo antiguo.
 */

const ID_HEREDADA = "pauta-heredada";

interface RubricaAntigua {
  version?: number;
  actualizadaEn?: string;
  escalaMax?: number;
  etiquetasEscala?: string[];
  categorias?: unknown[];
}

function esConfiguracion(dato: unknown): dato is Configuracion {
  return Boolean(dato && typeof dato === "object" && Array.isArray((dato as Configuracion).pautas));
}

export function migrarConfiguracion(dato: unknown): Configuracion {
  if (esConfiguracion(dato)) {
    // Una configuración ya migrada puede venir sin evaluadores si se guardó
    // antes de que existiera ese campo.
    return {
      ...dato,
      entrenadores: dato.entrenadores?.length ? dato.entrenadores : ENTRENADORES_BASE,
    };
  }

  const antigua = dato as RubricaAntigua | undefined;
  if (!antigua?.categorias?.length) return CONFIGURACION_BASE;

  const heredada: Pauta = {
    id: ID_HEREDADA,
    nombre: "General",
    descripcion: "Rúbrica única que usaba la escuela antes de separar las pautas por categoría.",
    version: antigua.version ?? 1,
    actualizadaEn: antigua.actualizadaEn ?? new Date().toISOString().slice(0, 10),
    escalaMax: antigua.escalaMax ?? 5,
    etiquetasEscala: antigua.etiquetasEscala ?? CONFIGURACION_BASE.pautas[0].etiquetasEscala,
    categorias: antigua.categorias as Pauta["categorias"],
  };

  return {
    formato: 2,
    pautas: [heredada],
    asignaciones: Object.fromEntries(CATEGORIAS_EDAD.map((c) => [c, ID_HEREDADA])),
    pautaPorDefecto: ID_HEREDADA,
    entrenadores: ENTRENADORES_BASE,
    actualizadaEn: new Date().toISOString().slice(0, 10),
  };
}

interface EvaluacionAntigua extends Omit<Evaluacion, "pautaId" | "pautaVersion"> {
  pautaId?: string;
  pautaVersion?: number;
  rubricaVersion?: number;
}

/** Las evaluaciones del formato 1 no sabían de pautas: se les asigna la heredada. */
export function migrarEvaluacion(
  evaluacion: EvaluacionAntigua,
  configuracion: Configuracion,
): Evaluacion {
  if (evaluacion.pautaId) return evaluacion as Evaluacion;
  return {
    ...evaluacion,
    pautaId: configuracion.pautas[0]?.id ?? configuracion.pautaPorDefecto,
    pautaVersion: evaluacion.rubricaVersion ?? 1,
  } as Evaluacion;
}

export function migrarEvaluaciones(
  evaluaciones: EvaluacionAntigua[],
  configuracion: Configuracion,
): Evaluacion[] {
  return evaluaciones.map((e) => migrarEvaluacion(e, configuracion));
}
