import type { CategoriaRubrica, Configuracion, Indicador, Pauta } from "../domain/types";

export const CATEGORIAS_EDAD = [
  "SUB-6", "SUB-8", "SUB-10", "SUB-12", "SUB-14", "SUB-16", "SUB-18",
];

export const POSICIONES = [
  "Arquero",
  "Defensa central",
  "Lateral derecho",
  "Lateral izquierdo",
  "Volante de contención",
  "Volante central",
  "Volante ofensivo",
  "Extremo derecho",
  "Extremo izquierdo",
  "Delantero centro",
];

/** Cuerpo técnico de la escuela. Se puede editar desde Parámetros. */
export const ENTRENADORES_BASE = [
  "Andrés Mercado",
  "Estefani Contreras",
  "Bryan Solis",
  "Mario Benavente",
];

const ESCALA = ["Inicial", "En progreso", "Aceptable", "Bueno", "Destacado"];

/**
 * Catálogo de sub-puntos, uno por identificador.
 *
 * Las pautas se arman eligiendo de aquí. Es deliberado que compartan los mismos
 * identificadores: cuando un niño pasa de SUB-10 a SUB-12 y cambia de pauta, los
 * sub-puntos que existen en ambas siguen siendo el mismo dato, así que la tela
 * de araña compara de verdad en vez de partir de cero.
 */
const CATALOGO: Record<string, Omit<Indicador, "activo">> = {
  "tec-control": { id: "tec-control", nombre: "Control y recepción", ayuda: "Domina el balón en el primer toque, con ambos pies y de distintas alturas." },
  "tec-conduccion": { id: "tec-conduccion", nombre: "Conducción y regate", ayuda: "Conduce con la cabeza levantada y supera rivales en el uno contra uno." },
  "tec-pase": { id: "tec-pase", nombre: "Pase y precisión", ayuda: "Entrega precisa a corta y media distancia, con la fuerza adecuada." },
  "tec-remate": { id: "tec-remate", nombre: "Remate y definición", ayuda: "Golpeo firme y dirigido; define con ambos pies dentro del área." },
  "tec-juego-aereo": { id: "tec-juego-aereo", nombre: "Juego aéreo", ayuda: "Cabecea con seguridad en ataque y defensa; mide el salto." },

  "fis-velocidad": { id: "fis-velocidad", nombre: "Velocidad", ayuda: "Aceleración en los primeros metros y velocidad punta con balón y sin él." },
  "fis-resistencia": { id: "fis-resistencia", nombre: "Resistencia", ayuda: "Sostiene el ritmo durante todo el entrenamiento o partido." },
  "fis-fuerza": { id: "fis-fuerza", nombre: "Fuerza y duelo físico", ayuda: "Aguanta el cuerpo a cuerpo y protege el balón." },
  "fis-coordinacion": { id: "fis-coordinacion", nombre: "Coordinación y agilidad", ayuda: "Cambia de dirección con equilibrio y control del cuerpo." },

  "tac-posicionamiento": { id: "tac-posicionamiento", nombre: "Posicionamiento", ayuda: "Ocupa el espacio que le corresponde según su puesto y el momento del juego." },
  "tac-lectura": { id: "tac-lectura", nombre: "Lectura de juego", ayuda: "Anticipa la jugada y reconoce dónde está el espacio libre." },
  "tac-decision": { id: "tac-decision", nombre: "Toma de decisiones", ayuda: "Elige bien entre conducir, pasar o rematar, y lo hace a tiempo." },
  "tac-transiciones": { id: "tac-transiciones", nombre: "Transiciones", ayuda: "Reacciona rápido al perder o recuperar el balón." },
  "tac-marca": { id: "tac-marca", nombre: "Marca y presión", ayuda: "Presiona coordinado con sus compañeros y sigue a su marca." },

  "men-concentracion": { id: "men-concentracion", nombre: "Concentración", ayuda: "Mantiene la atención en la tarea durante toda la sesión." },
  "men-confianza": { id: "men-confianza", nombre: "Confianza", ayuda: "Se atreve a pedir el balón y a intentar jugadas." },
  "men-frustracion": { id: "men-frustracion", nombre: "Manejo de la frustración", ayuda: "Reacciona bien ante el error propio, del compañero o del árbitro." },
  "men-competitividad": { id: "men-competitividad", nombre: "Competitividad", ayuda: "Compite con intensidad sana y no baja los brazos." },

  "soc-equipo": { id: "soc-equipo", nombre: "Trabajo en equipo", ayuda: "Juega para el equipo y celebra el logro del compañero." },
  "soc-comunicacion": { id: "soc-comunicacion", nombre: "Comunicación", ayuda: "Habla en la cancha, pide y avisa." },
  "soc-respeto": { id: "soc-respeto", nombre: "Respeto", ayuda: "Trata bien a compañeros, rivales, árbitros y cuerpo técnico." },
  "soc-liderazgo": { id: "soc-liderazgo", nombre: "Liderazgo", ayuda: "Arrastra al grupo con el ejemplo y ayuda a los que van más atrás." },

  "dis-asistencia": { id: "dis-asistencia", nombre: "Asistencia", ayuda: "Asiste de forma regular a entrenamientos y partidos." },
  "dis-puntualidad": { id: "dis-puntualidad", nombre: "Puntualidad", ayuda: "Llega a la hora y listo para entrenar." },
  "dis-esfuerzo": { id: "dis-esfuerzo", nombre: "Esfuerzo en entrenamiento", ayuda: "Entrega el máximo en cada ejercicio, no sólo en el partido." },
  "dis-habitos": { id: "dis-habitos", nombre: "Hábitos y autocuidado", ayuda: "Cuida su equipamiento, descanso, hidratación y alimentación." },
};

function indicadores(...ids: string[]): Indicador[] {
  return ids.map((id) => ({ ...CATALOGO[id], activo: true }));
}

/**
 * Los seis ejes de la tela de araña. Las pautas comparten estos identificadores
 * a propósito: lo que cambia entre una y otra son los sub-puntos y los pesos, no
 * los ejes, para que el gráfico de un niño se pueda comparar con el del año
 * pasado aunque haya cambiado de categoría.
 */
function ejes(
  pesos: Record<string, number>,
  subpuntos: Record<string, Indicador[]>,
): CategoriaRubrica[] {
  const base = [
    { id: "tecnica", nombre: "Técnica", descripcion: "Control de balón, regate, pases, remates.", icono: "balon" },
    { id: "fisico", nombre: "Físico", descripcion: "Velocidad, resistencia, fuerza, coordinación.", icono: "correr" },
    { id: "tactico", nombre: "Táctico", descripcion: "Lectura de juego, posición y decisiones.", icono: "brujula" },
    { id: "mental", nombre: "Mental", descripcion: "Concentración, confianza, actitud, manejo emocional.", icono: "diana" },
    { id: "social", nombre: "Social", descripcion: "Trabajo en equipo, comunicación, respeto.", icono: "equipo" },
    { id: "disciplina", nombre: "Disciplina", descripcion: "Compromiso, puntualidad, esfuerzo, hábitos.", icono: "escudo" },
  ];
  return base.map((eje) => ({
    ...eje,
    peso: pesos[eje.id] ?? 1,
    indicadores: subpuntos[eje.id] ?? [],
  }));
}

/**
 * Pauta formativa. Menos sub-puntos y menos peso táctico: a esta edad importa
 * más que el niño quiera venir, se lleve bien con el grupo y tome contacto con
 * el balón que dónde se para en una salida desde el fondo.
 */
export const PAUTA_FORMATIVA: Pauta = {
  id: "pauta-formativa",
  nombre: "Formativa",
  descripcion: "Primeros años en la escuela. Fundamentos, hábitos y convivencia.",
  version: 1,
  actualizadaEn: "2024-01-01",
  escalaMax: 5,
  etiquetasEscala: ESCALA,
  categorias: ejes(
    { tecnica: 1.25, fisico: 1, tactico: 0.75, mental: 1, social: 1.25, disciplina: 1.25 },
    {
      tecnica: indicadores("tec-control", "tec-conduccion", "tec-pase", "tec-remate"),
      fisico: indicadores("fis-velocidad", "fis-coordinacion", "fis-resistencia"),
      tactico: indicadores("tac-posicionamiento", "tac-decision"),
      mental: indicadores("men-concentracion", "men-confianza", "men-frustracion"),
      social: indicadores("soc-equipo", "soc-comunicacion", "soc-respeto"),
      disciplina: indicadores("dis-asistencia", "dis-puntualidad", "dis-esfuerzo"),
    },
  ),
};

/** Pauta competitiva. La rúbrica completa, con el peso puesto en técnica y táctica. */
export const PAUTA_COMPETITIVA: Pauta = {
  id: "pauta-competitiva",
  nombre: "Competitiva",
  descripcion: "Categorías de competencia. Rúbrica completa, con lectura táctica.",
  version: 1,
  actualizadaEn: "2024-01-01",
  escalaMax: 5,
  etiquetasEscala: ESCALA,
  categorias: ejes(
    { tecnica: 1.25, fisico: 1, tactico: 1.25, mental: 1, social: 1, disciplina: 1 },
    {
      tecnica: indicadores("tec-control", "tec-conduccion", "tec-pase", "tec-remate", "tec-juego-aereo"),
      fisico: indicadores("fis-velocidad", "fis-resistencia", "fis-fuerza", "fis-coordinacion"),
      tactico: indicadores("tac-posicionamiento", "tac-lectura", "tac-decision", "tac-transiciones", "tac-marca"),
      mental: indicadores("men-concentracion", "men-confianza", "men-frustracion", "men-competitividad"),
      social: indicadores("soc-equipo", "soc-comunicacion", "soc-respeto", "soc-liderazgo"),
      disciplina: indicadores("dis-asistencia", "dis-puntualidad", "dis-esfuerzo", "dis-habitos"),
    },
  ),
};

/**
 * Punto de partida de la escuela. Todo esto se edita desde la pantalla
 * "Parámetros": agregar pautas, cambiar qué categoría usa cuál, y mantener el
 * listado de evaluadores.
 */
export const CONFIGURACION_BASE: Configuracion = {
  formato: 2,
  pautas: [PAUTA_FORMATIVA, PAUTA_COMPETITIVA],
  asignaciones: {
    "SUB-6": PAUTA_FORMATIVA.id,
    "SUB-8": PAUTA_FORMATIVA.id,
    "SUB-10": PAUTA_FORMATIVA.id,
    "SUB-12": PAUTA_COMPETITIVA.id,
    "SUB-14": PAUTA_COMPETITIVA.id,
    "SUB-16": PAUTA_COMPETITIVA.id,
    "SUB-18": PAUTA_COMPETITIVA.id,
  },
  pautaPorDefecto: PAUTA_COMPETITIVA.id,
  entrenadores: ENTRENADORES_BASE,
  actualizadaEn: "2024-01-01",
};
