import type { Rubrica } from "../domain/types";

/**
 * Rúbrica base de la Escuela de Fútbol CGA.
 *
 * Es sólo el punto de partida: el entrenador puede agregar, renombrar, desactivar
 * o repesar categorías e indicadores desde la pantalla "Parámetros". Cada cambio
 * sube el número de versión y las evaluaciones anteriores conservan la suya, así
 * el historial nunca se rompe.
 */
export const RUBRICA_BASE: Rubrica = {
  version: 1,
  actualizadaEn: "2024-01-01",
  escalaMax: 5,
  etiquetasEscala: ["Inicial", "En progreso", "Aceptable", "Bueno", "Destacado"],
  categorias: [
    {
      id: "tecnica",
      nombre: "Técnica",
      descripcion: "Control de balón, regate, pases, remates.",
      icono: "balon",
      peso: 1.25,
      indicadores: [
        { id: "tec-control", nombre: "Control y recepción", ayuda: "Domina el balón en el primer toque, con ambos pies y de distintas alturas.", activo: true },
        { id: "tec-conduccion", nombre: "Conducción y regate", ayuda: "Conduce con la cabeza levantada y supera rivales en el uno contra uno.", activo: true },
        { id: "tec-pase", nombre: "Pase y precisión", ayuda: "Entrega precisa a corta y media distancia, con la fuerza adecuada.", activo: true },
        { id: "tec-remate", nombre: "Remate y definición", ayuda: "Golpeo firme y dirigido; define con ambos pies dentro del área.", activo: true },
        { id: "tec-juego-aereo", nombre: "Juego aéreo", ayuda: "Cabecea con seguridad en ataque y defensa; mide el salto.", activo: true },
      ],
    },
    {
      id: "fisico",
      nombre: "Físico",
      descripcion: "Velocidad, resistencia, fuerza, coordinación.",
      icono: "correr",
      peso: 1,
      indicadores: [
        { id: "fis-velocidad", nombre: "Velocidad", ayuda: "Aceleración en los primeros metros y velocidad punta con balón y sin él.", activo: true },
        { id: "fis-resistencia", nombre: "Resistencia", ayuda: "Sostiene el ritmo durante todo el entrenamiento o partido.", activo: true },
        { id: "fis-fuerza", nombre: "Fuerza y duelo físico", ayuda: "Aguanta el cuerpo a cuerpo y protege el balón.", activo: true },
        { id: "fis-coordinacion", nombre: "Coordinación y agilidad", ayuda: "Cambia de dirección con equilibrio y control del cuerpo.", activo: true },
      ],
    },
    {
      id: "tactico",
      nombre: "Táctico",
      descripcion: "Lectura de juego, posición y decisiones.",
      icono: "brujula",
      peso: 1.25,
      indicadores: [
        { id: "tac-posicionamiento", nombre: "Posicionamiento", ayuda: "Ocupa el espacio que le corresponde según su puesto y el momento del juego.", activo: true },
        { id: "tac-lectura", nombre: "Lectura de juego", ayuda: "Anticipa la jugada y reconoce dónde está el espacio libre.", activo: true },
        { id: "tac-decision", nombre: "Toma de decisiones", ayuda: "Elige bien entre conducir, pasar o rematar, y lo hace a tiempo.", activo: true },
        { id: "tac-transiciones", nombre: "Transiciones", ayuda: "Reacciona rápido al perder o recuperar el balón.", activo: true },
        { id: "tac-marca", nombre: "Marca y presión", ayuda: "Presiona coordinado con sus compañeros y sigue a su marca.", activo: true },
      ],
    },
    {
      id: "mental",
      nombre: "Mental",
      descripcion: "Concentración, confianza, actitud, manejo emocional.",
      icono: "diana",
      peso: 1,
      indicadores: [
        { id: "men-concentracion", nombre: "Concentración", ayuda: "Mantiene la atención en la tarea durante toda la sesión.", activo: true },
        { id: "men-confianza", nombre: "Confianza", ayuda: "Se atreve a pedir el balón y a intentar jugadas.", activo: true },
        { id: "men-frustracion", nombre: "Manejo de la frustración", ayuda: "Reacciona bien ante el error propio, del compañero o del árbitro.", activo: true },
        { id: "men-competitividad", nombre: "Competitividad", ayuda: "Compite con intensidad sana y no baja los brazos.", activo: true },
      ],
    },
    {
      id: "social",
      nombre: "Social",
      descripcion: "Trabajo en equipo, comunicación, respeto.",
      icono: "equipo",
      peso: 1,
      indicadores: [
        { id: "soc-equipo", nombre: "Trabajo en equipo", ayuda: "Juega para el equipo y celebra el logro del compañero.", activo: true },
        { id: "soc-comunicacion", nombre: "Comunicación", ayuda: "Habla en la cancha, pide y avisa.", activo: true },
        { id: "soc-respeto", nombre: "Respeto", ayuda: "Trata bien a compañeros, rivales, árbitros y cuerpo técnico.", activo: true },
        { id: "soc-liderazgo", nombre: "Liderazgo", ayuda: "Arrastra al grupo con el ejemplo y ayuda a los que van más atrás.", activo: true },
      ],
    },
    {
      id: "disciplina",
      nombre: "Disciplina",
      descripcion: "Compromiso, puntualidad, esfuerzo, hábitos.",
      icono: "escudo",
      peso: 1,
      indicadores: [
        { id: "dis-asistencia", nombre: "Asistencia", ayuda: "Asiste de forma regular a entrenamientos y partidos.", activo: true },
        { id: "dis-puntualidad", nombre: "Puntualidad", ayuda: "Llega a la hora y listo para entrenar.", activo: true },
        { id: "dis-esfuerzo", nombre: "Esfuerzo en entrenamiento", ayuda: "Entrega el máximo en cada ejercicio, no sólo en el partido.", activo: true },
        { id: "dis-habitos", nombre: "Hábitos y autocuidado", ayuda: "Cuida su equipamiento, descanso, hidratación y alimentación.", activo: true },
      ],
    },
  ],
};

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
