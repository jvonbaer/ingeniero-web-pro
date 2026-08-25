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
 * Construye los sub-puntos de una subsección.
 *
 * Cada entrada es `[id, nombre]`, o `[id, nombre, etiquetas]` cuando la pregunta
 * se mide con nombres propios en vez de la escala general.
 *
 * Los identificadores son el dato que hay que cuidar: las evaluaciones guardan
 * el puntaje contra el id, no contra la posición en la lista. Renombrar un
 * sub-punto es inofensivo; cambiarle el id equivale a borrarlo y crear otro, y
 * deja huérfano todo el historial de ese sub-punto.
 */
type Fila = [string, string] | [string, string, string[]];

function sub(grupo: string | undefined, filas: Fila[]): Indicador[] {
  return filas.map(([id, nombre, etiquetas]) => ({
    id,
    nombre,
    ayuda: "",
    activo: true,
    ...(grupo ? { grupo } : {}),
    ...(etiquetas ? { etiquetas } : {}),
  }));
}

/**
 * Las siete secciones de la pauta de la escuela. Son los siete ejes de la tela
 * de araña, en este orden.
 *
 * Las secciones 2 y 3 vienen divididas en subsecciones —conducción, control,
 * pase…—. Cada subsección tiene su propio promedio, y el de la sección es el
 * promedio de esos promedios: así "Técnica", que trae veinticinco sub-puntos,
 * no pesa cinco veces más que "Asistencia", que trae seis.
 */
const SECCIONES: CategoriaRubrica[] = [
  {
    id: "asistencia",
    nombre: "Asistencia y compromiso",
    nombreCorto: "Asistencia",
    descripcion: "Presencia, puntualidad y cuidado de los materiales.",
    icono: "reloj",
    peso: 1,
    indicadores: sub(undefined, [
      ["s1-asistencia", "Asistencia a entrenamientos"],
      ["s1-puntualidad", "Puntualidad"],
      ["s1-implementos", "Trae implementos necesarios"],
      ["s1-participa", "Participa activamente"],
      ["s1-materiales", "Cuida los materiales"],
      ["s1-compromiso", "Mantiene compromiso con los entrenamientos"],
    ]),
  },
  {
    id: "tecnica",
    nombre: "Técnica individual",
    nombreCorto: "Técnica",
    descripcion: "Fundamentos técnicos básicos.",
    icono: "balon",
    peso: 1,
    indicadores: [
      ...sub("Conducción de balón", [
        ["s2-cond-control", "Controla el balón mientras conduce"],
        ["s2-cond-cerca", "Mantiene el balón cerca del cuerpo"],
        ["s2-cond-direccion", "Cambia de dirección"],
        ["s2-cond-velocidad", "Cambia de velocidad"],
        ["s2-cond-perfiles", "Utiliza ambos perfiles"],
      ]),
      ...sub("Control y recepción", [
        ["s2-ctrl-rasos", "Controla pases rasos"],
        ["s2-ctrl-movimiento", "Controla balones en movimiento"],
        ["s2-ctrl-orienta", "Orienta correctamente el control"],
        ["s2-ctrl-superficies", "Utiliza diferentes superficies del pie"],
        ["s2-ctrl-perfiles", "Controla utilizando ambos perfiles"],
      ]),
      ...sub("Pase", [
        ["s2-pase-precision", "Precisión"],
        ["s2-pase-fuerza", "Fuerza adecuada"],
        ["s2-pase-ambos", "Pase con ambos pies"],
        ["s2-pase-movimiento", "Pase en movimiento"],
        ["s2-pase-eleccion", "Elige correctamente al compañero"],
      ]),
      ...sub("Regate y duelos 1 contra 1", [
        ["s2-reg-atreve", "Se atreve a enfrentar al rival"],
        ["s2-reg-direccion", "Cambia de dirección"],
        ["s2-reg-ritmo", "Cambia de ritmo"],
        ["s2-reg-protege", "Protege el balón"],
        ["s2-reg-recursos", "Utiliza recursos para superar rivales"],
      ]),
      ...sub("Finalización (remate al arco)", [
        ["s2-fin-precision", "Precisión"],
        ["s2-fin-potencia", "Potencia"],
        ["s2-fin-movimiento", "Remate en movimiento"],
        ["s2-fin-eleccion", "Elige dónde rematar"],
        ["s2-fin-perfiles", "Utiliza ambos perfiles"],
      ]),
    ],
  },
  {
    id: "tactica",
    nombre: "Iniciación táctica",
    nombreCorto: "Táctica",
    descripcion: "Ataque, defensa y lectura del juego.",
    icono: "brujula",
    peso: 1,
    indicadores: [
      ...sub("Ataque (momento ofensivo)", [
        ["s3-ata-desmarca", "Se desmarca"],
        ["s3-ata-espacios", "Busca espacios libres"],
        ["s3-ata-apoya", "Apoya al compañero con balón"],
        ["s3-ata-decisiones", "Toma buenas decisiones"],
        ["s3-ata-comprende", "Comprende cuándo pasar, conducir o regatear"],
      ]),
      ...sub("Defensa (momento defensivo)", [
        ["s3-def-marca", "Marca correctamente"],
        ["s3-def-recupera", "Intenta recuperar el balón"],
        ["s3-def-espacios", "Ocupa correctamente los espacios"],
        ["s3-def-ayuda", "Ayuda a sus compañeros"],
        ["s3-def-reaccion", "Reacciona al perder el balón"],
      ]),
      ...sub("Comprensión del juego", [
        ["s3-comp-cabeza", "Levanta la cabeza antes de recibir"],
        ["s3-comp-observa", "Observa antes de tomar decisiones"],
        ["s3-comp-espacios", "Entiende los espacios"],
        ["s3-comp-adapta", "Se adapta a diferentes situaciones"],
        ["s3-comp-instrucciones", "Comprende las instrucciones tácticas"],
      ]),
      ...sub("Evaluación durante el partido", [
        ["s3-par-participacion", "Participación", ["Muy baja", "Baja", "Adecuada", "Alta", "Muy alta"]],
        ["s3-par-decisiones", "Toma de decisiones", ["Necesita mucha ayuda", "Irregular", "Adecuada", "Buena", "Excelente"]],
        ["s3-par-ofensiva", "Participación ofensiva"],
        ["s3-par-defensiva", "Participación defensiva"],
        ["s3-par-comprension", "Comprensión del juego"],
        ["s3-par-actitud", "Actitud durante el partido"],
      ]),
    ],
  },
  {
    id: "fisico",
    nombre: "Capacidades físicas y motrices",
    nombreCorto: "Físico",
    descripcion: "Coordinación, velocidad, agilidad y resistencia.",
    icono: "correr",
    peso: 1,
    indicadores: sub(undefined, [
      ["s4-coordinacion", "Coordinación general"],
      ["s4-equilibrio", "Equilibrio"],
      ["s4-agilidad", "Agilidad"],
      ["s4-reaccion", "Velocidad de reacción"],
      ["s4-cambios", "Cambios de dirección"],
      ["s4-velocidad", "Velocidad"],
      ["s4-resistencia", "Resistencia"],
      ["s4-coord-balon", "Coordinación con balón"],
    ]),
  },
  {
    id: "psicologico",
    nombre: "Aspectos psicológicos y actitudinales",
    nombreCorto: "Psicológico",
    descripcion: "Motivación, esfuerzo, concentración y confianza.",
    icono: "diana",
    peso: 1,
    indicadores: sub(undefined, [
      ["s5-motivacion", "Motivación"],
      ["s5-disfruta", "Disfruta del entrenamiento"],
      ["s5-esfuerzo", "Se esfuerza"],
      ["s5-persevera", "Persevera ante las dificultades"],
      ["s5-errores", "Acepta los errores"],
      ["s5-escucha", "Escucha al entrenador"],
      ["s5-concentracion", "Capacidad de concentración"],
      ["s5-iniciativa", "Iniciativa"],
      ["s5-confianza", "Confianza en sí mismo"],
      ["s5-correcciones", "Acepta correcciones"],
    ]),
  },
  {
    id: "conducta",
    nombre: "Conducta y valores",
    nombreCorto: "Conducta",
    descripcion: "Respeto, trabajo en equipo y actitud deportiva.",
    icono: "escudo",
    peso: 1,
    indicadores: sub(undefined, [
      ["s6-resp-companeros", "Respeta a sus compañeros"],
      ["s6-resp-entrenador", "Respeta al entrenador"],
      ["s6-resp-reglas", "Respeta las reglas"],
      ["s6-equipo", "Trabaja en equipo"],
      ["s6-ayuda", "Ayuda a sus compañeros"],
      ["s6-frustracion", "Maneja adecuadamente la frustración"],
      ["s6-deportiva", "Tiene actitud deportiva"],
      ["s6-instalaciones", "Cuida las instalaciones y materiales"],
    ]),
  },
  {
    id: "creatividad",
    nombre: "Creatividad y capacidad de aprendizaje",
    nombreCorto: "Creatividad",
    descripcion: "Iniciativa, adaptación y velocidad de aprendizaje.",
    icono: "estrella",
    peso: 1,
    indicadores: sub(undefined, [
      ["s7-soluciones", "Propone soluciones diferentes"],
      ["s7-atreve", "Se atreve a intentar cosas nuevas"],
      ["s7-creativo", "Es creativo con el balón"],
      ["s7-aprende", "Aprende rápidamente"],
      ["s7-aplica", "Aplica lo aprendido en el juego"],
      ["s7-adapta", "Se adapta a nuevos ejercicios"],
    ]),
  },
];

/**
 * La pauta de la Escuela de Fútbol, tal como la definió el cuerpo técnico.
 *
 * Es una sola y la usan todas las categorías de edad. El mecanismo para tener
 * pautas distintas por categoría sigue en pie —está en Parámetros—: el día que
 * la escuela quiera una versión recortada para SUB-6, se duplica ésta, se
 * desactivan los sub-puntos que no correspondan y se le asigna esa categoría.
 * Conviene duplicar y desactivar antes que escribir una pauta nueva desde cero,
 * porque los sub-puntos compartidos mantienen el historial comparable.
 */
export const PAUTA_ESCUELA: Pauta = {
  id: "pauta-escuela-2026",
  nombre: "Escuela de Fútbol",
  descripcion: "Siete secciones: asistencia, técnica, táctica, físico, psicológico, conducta y creatividad.",
  version: 1,
  actualizadaEn: "2026-08-25",
  escalaMax: 5,
  etiquetasEscala: ESCALA,
  categorias: SECCIONES,
};

/**
 * Punto de partida de la escuela. Todo esto se edita desde la pantalla
 * "Parámetros": agregar pautas, cambiar qué categoría usa cuál, y mantener el
 * listado de evaluadores.
 */
export const CONFIGURACION_BASE: Configuracion = {
  formato: 2,
  pautas: [PAUTA_ESCUELA],
  asignaciones: Object.fromEntries(CATEGORIAS_EDAD.map((c) => [c, PAUTA_ESCUELA.id])),
  pautaPorDefecto: PAUTA_ESCUELA.id,
  entrenadores: ENTRENADORES_BASE,
  actualizadaEn: "2026-08-25",
};
