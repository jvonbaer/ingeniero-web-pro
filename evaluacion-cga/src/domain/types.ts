/** Modelo de datos del sistema de evaluación. */

export type PieHabil = "Derecho" | "Izquierdo" | "Ambidiestro";

export type EstadoEvaluacion = "borrador" | "finalizada";

export interface Apoderado {
  nombre: string;
  email: string;
  telefono: string;
}

export interface Jugador {
  id: string;
  /** Código de seguimiento, p. ej. CGA-F-12-007. Único y estable en el tiempo. */
  codigo: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string; // ISO yyyy-mm-dd
  categoria: string; // SUB-8 … SUB-18
  posicion: string;
  pieHabil: PieHabil;
  alturaCm: number | null;
  dorsal: string;
  /** Foto en data URL (JPEG comprimido ~480px). */
  fotoDataUrl: string | null;
  ingreso: string; // ISO yyyy-mm-dd, fecha de ingreso a la escuela
  apoderado: Apoderado;
  activo: boolean;
  creadoEn: string;
}

/** Un sub-punto observable dentro de una categoría. */
export interface Indicador {
  id: string;
  nombre: string;
  ayuda: string;
  activo: boolean;
}

/** Un eje del gráfico de tela de araña. */
export interface CategoriaRubrica {
  id: string;
  nombre: string;
  descripcion: string;
  /** Emoji o glifo mostrado junto al eje. */
  icono: string;
  /** Peso relativo dentro del puntaje general (se normaliza al sumar). */
  peso: number;
  indicadores: Indicador[];
}

/**
 * Conjunto de parámetros de evaluación. Se versiona: cada evaluación guarda la
 * versión con la que se levantó, de modo que agregar o retirar indicadores nunca
 * invalida el historial ya registrado.
 */
export interface Rubrica {
  version: number;
  actualizadaEn: string;
  /** Valor máximo de la escala por indicador (1..escalaMax). */
  escalaMax: number;
  etiquetasEscala: string[];
  categorias: CategoriaRubrica[];
}

export interface Evaluacion {
  id: string;
  jugadorId: string;
  fecha: string; // ISO yyyy-mm-dd
  temporada: string;
  entrenador: string;
  rubricaVersion: number;
  escalaMax: number;
  /** indicadorId → valor entero en 1..escalaMax. Los no respondidos se omiten. */
  puntajes: Record<string, number>;
  observaciones: string;
  objetivos: string[];
  estado: EstadoEvaluacion;
  creadaEn: string;
  actualizadaEn: string;
}

export interface Backup {
  formato: "cga-evaluacion-futbol";
  version: 1;
  exportadoEn: string;
  jugadores: Jugador[];
  evaluaciones: Evaluacion[];
  rubrica: Rubrica;
}

/* ---------- Resultados calculados ---------- */

export type NivelId =
  | "inicial"
  | "desarrollo"
  | "intermedio"
  | "avanzado"
  | "excelente";

export interface Nivel {
  id: NivelId;
  etiqueta: string;
  min: number;
}

export interface ResultadoCategoria {
  categoriaId: string;
  nombre: string;
  icono: string;
  descripcion: string;
  /** 0-100, o null si no hay ningún indicador respondido. */
  puntaje: number | null;
  respondidos: number;
  total: number;
  nivel: Nivel | null;
}

export interface ResultadoEvaluacion {
  evaluacion: Evaluacion;
  categorias: ResultadoCategoria[];
  general: number | null;
  nivel: Nivel | null;
  completitud: number; // 0-1
}
