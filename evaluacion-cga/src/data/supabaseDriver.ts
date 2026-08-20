import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { RUBRICA_BASE } from "../config/rubrica";
import type { Backup, Evaluacion, Jugador, Rubrica } from "../domain/types";
import type { EstadoDatos, Store } from "./store";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const nubeConfigurada = Boolean(URL && ANON);

let cliente: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!cliente) {
    if (!URL || !ANON) throw new Error("Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
    cliente = createClient(URL, ANON);
  }
  return cliente;
}

function reventar(contexto: string, error: { message: string } | null) {
  if (error) throw new Error(`${contexto}: ${error.message}`);
}

/**
 * Persistencia compartida en Supabase.
 *
 * Cada entidad viaja completa dentro de una columna `datos` (jsonb) y sólo se
 * proyectan como columnas los campos por los que se filtra o se ordena. Es una
 * decisión deliberada: la rúbrica la edita el propio entrenador, así que un
 * esquema relacional rígido para los puntajes obligaría a migrar la base cada
 * vez que agrega un indicador. La vista `v_puntajes` de schema.sql expone los
 * mismos datos fila por fila para quien quiera consultarlos en SQL.
 */
export const supabaseDriver: Store = {
  modo: "nube",
  etiqueta: "Nube compartida",

  async cargar(): Promise<EstadoDatos> {
    const [rj, re, rr] = await Promise.all([
      db().from("jugadores").select("datos").order("codigo", { ascending: true }),
      db().from("evaluaciones").select("datos").order("fecha", { ascending: false }),
      db().from("rubrica").select("datos").eq("id", 1).maybeSingle(),
    ]);

    reventar("No se pudieron leer los jugadores", rj.error);
    reventar("No se pudieron leer las evaluaciones", re.error);
    reventar("No se pudo leer la rúbrica", rr.error);

    return {
      jugadores: (rj.data ?? []).map((f) => f.datos as Jugador),
      evaluaciones: (re.data ?? []).map((f) => f.datos as Evaluacion),
      rubrica: (rr.data?.datos as Rubrica) ?? RUBRICA_BASE,
    };
  },

  async guardarJugador(jugador) {
    const { error } = await db()
      .from("jugadores")
      .upsert({
        id: jugador.id,
        codigo: jugador.codigo,
        categoria: jugador.categoria,
        activo: jugador.activo,
        datos: jugador,
        actualizado_en: new Date().toISOString(),
      });
    reventar("No se pudo guardar el jugador", error);
  },

  async eliminarJugador(id) {
    const { error } = await db().from("jugadores").delete().eq("id", id);
    reventar("No se pudo eliminar el jugador", error);
  },

  async guardarEvaluacion(evaluacion) {
    const { error } = await db()
      .from("evaluaciones")
      .upsert({
        id: evaluacion.id,
        jugador_id: evaluacion.jugadorId,
        fecha: evaluacion.fecha,
        estado: evaluacion.estado,
        datos: evaluacion,
        actualizado_en: new Date().toISOString(),
      });
    reventar("No se pudo guardar la evaluación", error);
  },

  async eliminarEvaluacion(id) {
    const { error } = await db().from("evaluaciones").delete().eq("id", id);
    reventar("No se pudo eliminar la evaluación", error);
  },

  async guardarRubrica(rubrica) {
    const { error } = await db()
      .from("rubrica")
      .upsert({ id: 1, datos: rubrica, actualizado_en: new Date().toISOString() });
    reventar("No se pudieron guardar los parámetros", error);
  },

  async importar(backup: Backup) {
    await this.guardarRubrica(backup.rubrica);
    for (const j of backup.jugadores) await this.guardarJugador(j);
    for (const e of backup.evaluaciones) await this.guardarEvaluacion(e);
  },
};
