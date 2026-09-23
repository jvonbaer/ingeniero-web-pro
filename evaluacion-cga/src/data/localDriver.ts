import type { Backup, Camiseta, Evaluacion, Jugador } from "../domain/types";
import { migrarConfiguracion, migrarEvaluaciones } from "./migrar";
import { idbGet, idbSet } from "./idb";
import type { EstadoDatos, Store } from "./store";

const K_JUGADORES = "jugadores";
const K_EVALUACIONES = "evaluaciones";
const K_CAMISETAS = "camisetas";
const K_CONFIG = "configuracion";
const K_HOJA = (id: string) => `hoja:${id}`;
/** Clave del formato 1: se sigue leyendo para migrar dispositivos ya en uso. */
const K_RUBRICA_ANTIGUA = "rubrica";

async function leerEstado(): Promise<EstadoDatos> {
  const [jugadores, evaluaciones, camisetas, config, rubricaAntigua] = await Promise.all([
    idbGet<Jugador[]>(K_JUGADORES),
    idbGet<Evaluacion[]>(K_EVALUACIONES),
    idbGet<Camiseta[]>(K_CAMISETAS),
    idbGet<unknown>(K_CONFIG),
    idbGet<unknown>(K_RUBRICA_ANTIGUA),
  ]);

  const configuracion = migrarConfiguracion(config ?? rubricaAntigua);
  return {
    jugadores: jugadores ?? [],
    evaluaciones: migrarEvaluaciones(evaluaciones ?? [], configuracion),
    camisetas: camisetas ?? [],
    configuracion,
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
    // La camiseta se va con la ficha, como en la nube: si quedara huérfana,
    // seguiría bloqueando su número en la categoría sin dueño que lo reclame.
    const camisetas = ((await idbGet<Camiseta[]>(K_CAMISETAS)) ?? []).filter(
      (c) => c.jugadorId !== id,
    );
    await Promise.all([
      idbSet(K_JUGADORES, jugadores),
      idbSet(K_EVALUACIONES, evaluaciones),
      idbSet(K_CAMISETAS, camisetas),
    ]);
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

  async guardarCamiseta(camiseta) {
    const lista = (await idbGet<Camiseta[]>(K_CAMISETAS)) ?? [];
    const i = lista.findIndex((c) => c.id === camiseta.id);
    if (i >= 0) lista[i] = camiseta;
    else lista.push(camiseta);
    await idbSet(K_CAMISETAS, lista);
  },

  async eliminarCamiseta(id) {
    const lista = ((await idbGet<Camiseta[]>(K_CAMISETAS)) ?? []).filter((c) => c.id !== id);
    await idbSet(K_CAMISETAS, lista);
  },

  async guardarConfiguracion(configuracion) {
    await idbSet(K_CONFIG, configuracion);
  },

  async leerHoja(evaluacionId) {
    return (await idbGet<string>(K_HOJA(evaluacionId))) ?? null;
  },

  async guardarHoja(evaluacionId, dataUrl) {
    await idbSet(K_HOJA(evaluacionId), dataUrl ?? undefined);
  },

  async importar(backup: Backup) {
    await Promise.all([
      idbSet(K_JUGADORES, backup.jugadores),
      idbSet(K_EVALUACIONES, backup.evaluaciones),
      idbSet(K_CAMISETAS, backup.camisetas),
      idbSet(K_CONFIG, backup.configuracion),
    ]);
  },
};
