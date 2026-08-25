import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Backup, Evaluacion, Jugador } from "../domain/types";
import { conexion } from "./conexion";
import { esDesfaseDeReloj, traducirError } from "./mensajes";
import { migrarConfiguracion, migrarEvaluaciones } from "./migrar";
import type { EstadoDatos, Store } from "./store";

export const nubeConfigurada = conexion !== null;

let cliente: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (!cliente) {
    if (!conexion) {
      throw new Error("No hay conexión con la nube. Configúrela en Datos → Conexión con la nube.");
    }
    cliente = createClient(conexion.url, conexion.anonKey);
  }
  return cliente;
}

function reventar(contexto: string, error: { message: string } | null) {
  if (error) throw new Error(`${contexto}: ${traducirError(error.message)}`);
}

/** Espera sin bloquear, para el reintento de la carga inicial. */
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
function leerTodo() {
  return Promise.all([
    db().from("jugadores").select("datos").order("codigo", { ascending: true }),
    db().from("evaluaciones").select("datos").order("fecha", { ascending: false }),
    db().from("rubrica").select("datos").eq("id", 1).maybeSingle(),
  ]);
}

export const supabaseDriver: Store = {
  modo: "nube",
  etiqueta: "Nube compartida",

  async cargar(): Promise<EstadoDatos> {
    let [rj, re, rr] = await leerTodo();

    // El token recién firmado puede llegar con unos milisegundos de adelanto
    // respecto del servicio que lo valida, y entonces la primera lectura tras
    // iniciar sesión falla sola. Se reintenta una vez antes de dar la cara:
    // si era eso, el entrenador nunca se entera; si era el reloj del teléfono,
    // vuelve a fallar y el mensaje ya dice qué revisar.
    const desfase = [rj.error, re.error, rr.error].some(
      (e) => e && esDesfaseDeReloj(e.message),
    );
    if (desfase) {
      await esperar(1500);
      [rj, re, rr] = await leerTodo();
    }

    reventar("No se pudieron leer los jugadores", rj.error);
    reventar("No se pudieron leer las evaluaciones", re.error);
    reventar("No se pudieron leer los parámetros", rr.error);

    // La fila 1 de `rubrica` guarda la configuración completa. Si viene en el
    // formato antiguo —una sola rúbrica— se migra al leerla.
    const configuracion = migrarConfiguracion(rr.data?.datos);
    return {
      jugadores: (rj.data ?? []).map((f) => f.datos as Jugador),
      evaluaciones: migrarEvaluaciones(
        (re.data ?? []).map((f) => f.datos as Evaluacion),
        configuracion,
      ),
      configuracion,
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

  async guardarConfiguracion(configuracion) {
    const { error } = await db()
      .from("rubrica")
      .upsert({ id: 1, datos: configuracion, actualizado_en: new Date().toISOString() });
    reventar("No se pudieron guardar los parámetros", error);
  },

  async leerHoja(evaluacionId) {
    const { data, error } = await db()
      .from("hojas")
      .select("datos")
      .eq("evaluacion_id", evaluacionId)
      .maybeSingle();
    reventar("No se pudo leer la hoja escaneada", error);
    return (data?.datos as string | undefined) ?? null;
  },

  async guardarHoja(evaluacionId, dataUrl) {
    if (dataUrl === null) {
      const { error } = await db().from("hojas").delete().eq("evaluacion_id", evaluacionId);
      reventar("No se pudo quitar la hoja escaneada", error);
      return;
    }
    const { error } = await db()
      .from("hojas")
      .upsert({
        evaluacion_id: evaluacionId,
        datos: dataUrl,
        actualizado_en: new Date().toISOString(),
      });
    reventar("No se pudo guardar la hoja escaneada", error);
  },

  async importar(backup: Backup) {
    await this.guardarConfiguracion(backup.configuracion);
    for (const j of backup.jugadores) await this.guardarJugador(j);
    for (const e of backup.evaluaciones) await this.guardarEvaluacion(e);
  },
};
