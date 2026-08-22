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
 * Una pauta de evaluación completa. La escuela puede tener varias —una por grupo
 * de edad, por ejemplo— y cada categoría apunta a la que le corresponde.
 *
 * Se versiona: cada evaluación guarda la pauta y la versión con la que se
 * levantó, de modo que agregar o retirar indicadores nunca invalida el historial
 * ya registrado.
 */
export interface Pauta {
  id: string;
  nombre: string;
  descripcion: string;
  version: number;
  actualizadaEn: string;
  /** Valor máximo de la escala por indicador (1..escalaMax). */
  escalaMax: number;
  etiquetasEscala: string[];
  categorias: CategoriaRubrica[];
}

/**
 * Configuración de la escuela: las pautas disponibles, qué pauta usa cada
 * categoría de edad, y el listado de evaluadores.
 *
 * `asignaciones` es lo que hace automática la selección: al abrir una evaluación
 * la aplicación mira la categoría del jugador y levanta la pauta asignada, sin
 * que el entrenador tenga que elegirla.
 */
export interface Configuracion {
  /** Versión del formato de configuración, para migrar respaldos antiguos. */
  formato: 2;
  pautas: Pauta[];
  /** categoría de edad → id de pauta. */
  asignaciones: Record<string, string>;
  /** Pauta que se usa cuando una categoría no tiene asignación propia. */
  pautaPorDefecto: string;
  entrenadores: string[];
  actualizadaEn: string;
}

export interface Evaluacion {
  id: string;
  jugadorId: string;
  fecha: string; // ISO yyyy-mm-dd
  temporada: string;
  entrenador: string;
  /** Pauta con la que se levantó esta evaluación. */
  pautaId: string;
  pautaVersion: number;
  escalaMax: number;
  /** indicadorId → valor entero en 1..escalaMax. Los no respondidos se omiten. */
  puntajes: Record<string, number>;
  observaciones: string;
  objetivos: string[];
  estado: EstadoEvaluacion;
  /**
   * Marca que existe una hoja de papel escaneada para esta evaluación. La imagen
   * NO viaja acá: se guarda aparte y se lee sólo cuando alguien la abre, porque
   * si no la lista de evaluaciones cargaría varios megabytes en cada arranque.
   */
  tieneHoja?: boolean;
  creadaEn: string;
  actualizadaEn: string;
}

export interface Backup {
  formato: "cga-evaluacion-futbol";
  version: 2;
  exportadoEn: string;
  jugadores: Jugador[];
  evaluaciones: Evaluacion[];
  configuracion: Configuracion;
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
