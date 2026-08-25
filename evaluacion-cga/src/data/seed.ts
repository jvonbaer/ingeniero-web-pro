import { CONFIGURACION_BASE } from "../config/pautas";
import { gruposDe, nuevoId, pautaDeCategoria } from "../domain/scoring";
import type { Backup, Evaluacion, Jugador } from "../domain/types";

/**
 * Reparte un promedio objetivo (en la escala 1-5) entre `n` sub-puntos usando
 * sólo valores enteros, para que los datos de demostración se vean como los
 * cargaría un entrenador de verdad.
 */
function repartir(objetivo: number, n: number): number[] {
  const base = Math.floor(objetivo);
  const conUnoMas = Math.round((objetivo - base) * n);
  return Array.from({ length: n }, (_, i) =>
    Math.min(5, Math.max(1, base + (i < conUnoMas ? 1 : 0))),
  );
}

type Objetivos = Record<string, number>;

function armarEvaluacion(
  jugador: Jugador,
  fecha: string,
  entrenador: string,
  objetivos: Objetivos,
  observaciones: string,
  proximos: string[],
): Evaluacion {
  // Cada jugador se evalúa con la pauta de su categoría, igual que en el uso real.
  const pauta = pautaDeCategoria(CONFIGURACION_BASE, jugador.categoria);
  const puntajes: Record<string, number> = {};
  // Se reparte dentro de cada subsección: el puntaje de una sección es el
  // promedio de los promedios de sus subsecciones, así que repartir sobre la
  // lista plana daría un resultado distinto al que pide el guion.
  for (const categoria of pauta.categorias) {
    for (const grupo of gruposDe(categoria)) {
      const valores = repartir(objetivos[categoria.id] ?? 3, grupo.indicadores.length);
      grupo.indicadores.forEach((indicador, i) => {
        puntajes[indicador.id] = valores[i];
      });
    }
  }
  return {
    id: nuevoId("ev"),
    jugadorId: jugador.id,
    fecha,
    temporada: fecha.slice(0, 4),
    entrenador,
    pautaId: pauta.id,
    pautaVersion: pauta.version,
    escalaMax: pauta.escalaMax,
    puntajes,
    observaciones,
    objetivos: proximos,
    estado: "finalizada",
    creadaEn: `${fecha}T18:00:00.000Z`,
    actualizadaEn: `${fecha}T18:00:00.000Z`,
  };
}

function armarJugador(
  codigo: string,
  nombre: string,
  apellido: string,
  fechaNacimiento: string,
  categoria: string,
  posicion: string,
  pieHabil: Jugador["pieHabil"],
  alturaCm: number,
  dorsal: string,
): Jugador {
  return {
    id: nuevoId("jug"),
    codigo,
    nombre,
    apellido,
    fechaNacimiento,
    categoria,
    posicion,
    pieHabil,
    alturaCm,
    dorsal,
    fotoDataUrl: null,
    ingreso: "2022-03-07",
    apoderado: { nombre: "", email: "", telefono: "" },
    activo: true,
    creadoEn: new Date().toISOString(),
  };
}

/** Datos de demostración: cuatro jugadores y su historial de evaluaciones. */
export function datosDemo(): Backup {
  const matias = armarJugador("CGA-F-12-001", "Matías", "Rodríguez", "2012-06-12", "SUB-12", "Volante ofensivo", "Derecho", 148, "10");
  const emilia = armarJugador("CGA-F-13-001", "Emilia", "Fuentes", "2013-02-24", "SUB-12", "Volante de contención", "Izquierdo", 143, "5");
  const benja = armarJugador("CGA-F-12-002", "Benjamín", "Cárcamo", "2012-11-03", "SUB-12", "Arquero", "Derecho", 152, "1");
  const tomas = armarJugador("CGA-F-14-001", "Tomás", "Millán", "2014-08-19", "SUB-10", "Delantero centro", "Derecho", 131, "9");

  const evaluaciones: Evaluacion[] = [
    armarEvaluacion(
      matias, "2023-11-20", "Andrés Mercado",
      { asistencia: 4.0, tecnica: 3.4, tactica: 2.8, fisico: 3.0, psicologico: 3.2, conducta: 3.6, creatividad: 3.3 },
      "Matías llega con buena base técnica y muy buena actitud. Le cuesta sostener el ritmo en la segunda mitad y se apura en la decisión final.",
      ["Trabajar resistencia aeróbica dos veces por semana.", "Levantar la cabeza antes de recibir."],
    ),
    armarEvaluacion(
      matias, "2024-02-20", "Andrés Mercado",
      { asistencia: 4.4, tecnica: 3.8, tactica: 3.2, fisico: 3.4, psicologico: 3.6, conducta: 4.0, creatividad: 3.7 },
      "Avance claro en el control y en la lectura del juego. Se nota el trabajo físico del verano, aunque todavía cae el rendimiento en los últimos 15 minutos.",
      ["Sostener la intensidad hasta el final del partido.", "Mejorar el perfil de recepción."],
    ),
    armarEvaluacion(
      matias, "2024-05-20", "Andrés Mercado",
      { asistencia: 4.5, tecnica: 4.1, tactica: 3.5, fisico: 3.8, psicologico: 4.0, conducta: 4.3, creatividad: 4.0 },
      "Matías ha mostrado una gran evolución en su desempeño general. Destaca su compromiso y actitud positiva en cada entrenamiento. Sigue trabajando en la toma de decisiones bajo presión y en su resistencia física para alcanzar su máximo potencial.",
      [
        "Mejorar resistencia física y velocidad.",
        "Seguir potenciando la toma de decisiones en el último tercio.",
        "Mantener la disciplina y el enfoque en los entrenamientos.",
      ],
    ),
    armarEvaluacion(
      emilia, "2024-02-20", "Andrés Mercado",
      { asistencia: 4.6, tecnica: 3.6, tactica: 4.2, fisico: 4.0, psicologico: 3.8, conducta: 4.2, creatividad: 3.7 },
      "Emilia ordena al equipo desde el mediocampo y casi nunca pierde la posición. Puede ganar mucho si mejora el pase largo.",
      ["Trabajar el cambio de frente.", "Rematar más desde fuera del área."],
    ),
    armarEvaluacion(
      emilia, "2024-05-20", "Andrés Mercado",
      { asistencia: 4.8, tecnica: 3.9, tactica: 4.4, fisico: 4.1, psicologico: 4.0, conducta: 4.4, creatividad: 4.0 },
      "Sigue siendo la referencia táctica de la categoría. El pase largo mejoró y ya lo usa en partido.",
      ["Liderar la presión alta.", "Sumar remate de media distancia."],
    ),
    armarEvaluacion(
      benja, "2024-05-20", "Andrés Mercado",
      { asistencia: 4.2, tecnica: 3.2, tactica: 3.4, fisico: 3.6, psicologico: 3.0, conducta: 3.4, creatividad: 3.1 },
      "Muy seguro bajo los tres palos en el juego aéreo. Le falta confianza para salir jugando con los pies.",
      ["Practicar salida con los pies bajo presión.", "Trabajar la comunicación con la línea de defensa."],
    ),
    armarEvaluacion(
      tomas, "2024-05-20", "Estefani Contreras",
      { asistencia: 4.0, tecnica: 3.0, tactica: 2.6, fisico: 2.8, psicologico: 3.4, conducta: 3.8, creatividad: 3.2 },
      "Primer semestre de Tomás en la escuela. Entusiasta, aprende rápido y se integró muy bien al grupo.",
      ["Afianzar el control orientado.", "Sumar minutos de juego reducido."],
    ),
  ];

  return {
    formato: "cga-evaluacion-futbol",
    version: 2,
    exportadoEn: new Date().toISOString(),
    jugadores: [matias, emilia, benja, tomas],
    evaluaciones,
    configuracion: CONFIGURACION_BASE,
  };
}
