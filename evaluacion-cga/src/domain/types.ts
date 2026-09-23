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
  /**
   * Subsección a la que pertenece, cuando la sección se divide —"Pase",
   * "Finalización"—. Los indicadores de un mismo grupo van seguidos en la lista.
   *
   * Es una etiqueta en el propio sub-punto y no un tercer nivel de la
   * estructura: así el editor de Parámetros sigue trabajando sobre una lista
   * plana, y una sección sin subsecciones no necesita envoltorio alguno.
   */
  grupo?: string;
  /**
   * Nombres propios de los cinco puntos de la escala, cuando este sub-punto no
   * se mide con la escala general de la pauta. Sirve para preguntas como
   * "Participación", que va de "Muy baja" a "Muy alta".
   */
  etiquetas?: string[];
}

/** Un eje del gráfico de tela de araña. */
export interface CategoriaRubrica {
  id: string;
  nombre: string;
  /**
   * Nombre de una o dos palabras para la tela de araña. Los nombres completos
   * —"Aspectos psicológicos y actitudinales"— no caben en la punta de un eje sin
   * chocar con el de al lado. Si falta, se usa el nombre completo.
   */
  nombreCorto?: string;
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
  /** 3 desde que el respaldo incluye las camisetas. Los de la 2 se siguen leyendo. */
  version: 3;
  exportadoEn: string;
  jugadores: Jugador[];
  evaluaciones: Evaluacion[];
  camisetas: Camiseta[];
  configuracion: Configuracion;
}

/* ---------- Camisetas ---------- */

/**
 * Medio por el que se recibió el pago de la camiseta. Vacío mientras no se
 * haya recibido nada.
 */
export type MedioPagoCamiseta =
  | ""
  | "transferencia"
  | "efectivo"
  | "webpay"
  | "otro";

/** Se deduce del precio y de lo abonado; no se guarda. */
export type EstadoPagoCamiseta = "pendiente" | "abonado" | "pagado";

/**
 * La camiseta pedida por un jugador para una temporada.
 *
 * Es un registro aparte de la ficha del jugador y no un puñado de campos dentro
 * de ella, porque el pedido se repite cada temporada: el niño que este año usó
 * el 7 en SUB-10 el próximo puede quedar con el 14 en SUB-12, y las dos cosas
 * tienen que seguir siendo ciertas al mismo tiempo. Con campos sueltos en la
 * ficha, el pedido nuevo borraría el anterior y nadie podría revisar quién pagó
 * el año pasado.
 */
export interface Camiseta {
  id: string;
  jugadorId: string;
  /** Temporada del pedido, en años: "2026". Un jugador pide una por temporada. */
  temporada: string;
  /**
   * Categoría del jugador al momento de inscribirlo. Es una **copia** y no una
   * referencia a la ficha: el número es único dentro de la categoría, y si el
   * niño sube de SUB-10 a SUB-12 el pedido del año pasado no puede cambiar de
   * casillero solo y chocar con el número de otro compañero.
   */
  categoria: string;
  /** Dorsal estampado, 1 a 99. Único dentro de la temporada y la categoría. */
  numero: number;
  /** Nombre elegido por el jugador, en mayúsculas, tal cual se manda a estampar. */
  nombreEstampado: string;
  /** Talla del catálogo (ver TALLAS en domain/camisetas.ts). */
  talla: string;
  /** Precio cobrado, en pesos. Cero cuando la camiseta va por cuenta del club. */
  precio: number;
  /** Recibido a cuenta, en pesos. Igual al precio cuando está pagada del todo. */
  abonado: number;
  medioPago: MedioPagoCamiseta;
  /** ISO aaaa-mm-dd del último abono. Vacío mientras no se reciba nada. */
  fechaPago: string;
  /** N.º de transferencia, boleta o lo que el club use para respaldar el pago. */
  comprobante: string;
  entregada: boolean;
  /** ISO aaaa-mm-dd de la entrega. Vacío mientras no se entregue. */
  fechaEntrega: string;
  notas: string;
  creadaEn: string;
  actualizadaEn: string;
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

export interface ResultadoGrupo {
  nombre: string;
  /** 0-100, o null si no hay ningún indicador de la subsección respondido. */
  puntaje: number | null;
  respondidos: number;
  total: number;
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
  /** Desglose por subsección. Vacío cuando la sección no tiene subsecciones. */
  grupos: ResultadoGrupo[];
}

export interface ResultadoEvaluacion {
  evaluacion: Evaluacion;
  categorias: ResultadoCategoria[];
  general: number | null;
  nivel: Nivel | null;
  completitud: number; // 0-1
}
