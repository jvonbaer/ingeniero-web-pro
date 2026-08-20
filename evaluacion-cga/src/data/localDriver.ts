import { RUBRICA_BASE } from "../config/rubrica";
import type { Backup, Evaluacion, Jugador, Rubrica } from "../domain/types";
import { idbGet, idbSet } from "./idb";
import type { EstadoDatos, Store } from "./store";

const K_JUGADORES = "jugadores";
const K_EVALUACIONES = "evaluaciones";
const K_RUBRICA = "rubrica";

async function leerEstado(): Promise<EstadoDatos> {
  const [jugadores, evaluaciones, rubrica] = await Promise.all([
    idbGet<Jugador[]>(K_JUGADORES),
    idbGet<Evaluacion[]>(K_EVALUACIONES),
    idbGet<Rubrica>(K_RUBRICA),
  ]);
  return {
    jugadores: jugadores ?? [],
    evaluaciones: evaluaciones ?? [],
    rubrica: rubrica ?? RUBRICA_BASE,
  };
}

/** Persistencia en el propio dispositivo. No requiere ninguna configuración. */
export const localDriver: Store = {
  modo: "local",
  etiqueta: "Este dispositivo",

  async cargar() {
    return leerEstado();
  },

  async guardarJugador(jugador) {
    const lista = (await idbGet<Jugador[]>(K_JUGADORES)) ?? [];
    const i = lista.findIndex((j) => j.id === jugador.id);
    if (i >= 0) lista[i] = jugador;
    else lista.push(jugador);
    await idbSet(K_JUGADORES, lista);
  },

  async eliminarJugador(id) {
    const jugadores = ((await idbGet<Jugador[]>(K_JUGADORES)) ?? []).filter((j) => j.id !== id);
    const evaluaciones = ((await idbGet<Evaluacion[]>(K_EVALUACIONES)) ?? []).filter(
      (e) => e.jugadorId !== id,
    );
    await Promise.all([idbSet(K_JUGADORES, jugadores), idbSet(K_EVALUACIONES, evaluaciones)]);
  },

  async guardarEvaluacion(evaluacion) {
    const lista = (await idbGet<Evaluacion[]>(K_EVALUACIONES)) ?? [];
    const i = lista.findIndex((e) => e.id === evaluacion.id);
    if (i >= 0) lista[i] = evaluacion;
    else lista.push(evaluacion);
    await idbSet(K_EVALUACIONES, lista);
  },

  async eliminarEvaluacion(id) {
    const lista = ((await idbGet<Evaluacion[]>(K_EVALUACIONES)) ?? []).filter((e) => e.id !== id);
    await idbSet(K_EVALUACIONES, lista);
  },

  async guardarRubrica(rubrica) {
    await idbSet(K_RUBRICA, rubrica);
  },

  async importar(backup: Backup) {
    await Promise.all([
      idbSet(K_JUGADORES, backup.jugadores),
      idbSet(K_EVALUACIONES, backup.evaluaciones),
      idbSet(K_RUBRICA, backup.rubrica),
    ]);
  },
};
