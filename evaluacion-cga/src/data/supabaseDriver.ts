import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Backup, Camiseta, Evaluacion, Jugador } from "../domain/types";
import { conexion } from "./conexion";
import { esDesfaseDeReloj, esTablaAusente, traducirError } from "./mensajes";
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

/**
 * Un borrado que no borró nada.
 *
 * Cuando la política de permisos no deja borrar una fila, PostgreSQL no
 * protesta: simplemente no la ve, afecta cero filas y devuelve éxito. Sin esta
 * comprobación el entrenador vería desaparecer la ficha de la pantalla y la
 * encontraría de vuelta al recargar, sin que nadie le haya dicho por qué. Por
 * eso el borrado pide de vuelta lo borrado y se revisa que venga algo.
 */
function reventarSiNoBorro(que: string, filas: unknown[] | null) {
  if (filas && filas.length > 0) return;
  throw new Error(
    `No se pudo eliminar ${que}: esa acción está reservada al administrador del club. ` +
      "Si usted lo es, salga y vuelva a entrar para refrescar sus permisos.",
  );
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
    db()
      .from("camisetas")
      .select("datos")
      .order("temporada", { ascending: false })
      .order("categoria", { ascending: true })
      .order("numero", { ascending: true }),
    db().from("rubrica").select("datos").eq("id", 1).maybeSingle(),
  ]);
}

export const supabaseDriver: Store = {
  modo: "nube",
  etiqueta: "Nube compartida",

  async cargar(): Promise<EstadoDatos> {
    let [rj, re, rc, rr] = await leerTodo();

    // El token recién firmado puede llegar con unos milisegundos de adelanto
    // respecto del servicio que lo valida, y entonces la primera lectura tras
    // iniciar sesión falla sola. Se reintenta una vez antes de dar la cara:
    // si era eso, el entrenador nunca se entera; si era el reloj del teléfono,
    // vuelve a fallar y el mensaje ya dice qué revisar.
    const desfase = [rj.error, re.error, rc.error, rr.error].some(
      (e) => e && esDesfaseDeReloj(e.message),
    );
    if (desfase) {
      await esperar(1500);
      [rj, re, rc, rr] = await leerTodo();
    }

    reventar("No se pudieron leer los jugadores", rj.error);
    reventar("No se pudieron leer las evaluaciones", re.error);
    reventar("No se pudieron leer los parámetros", rr.error);

    // La tabla de camisetas llegó después que el resto del esquema. Una escuela
    // que ya venía trabajando y todavía no ha vuelto a correr schema.sql tiene
    // que poder seguir evaluando igual que ayer: se entra con el pedido vacío y
    // el aviso aparece recién cuando alguien intenta guardar una camiseta, con
    // el mensaje que dice qué correr. Cualquier otro error de esa lectura sí se
    // levanta, porque ahí sí hay algo roto.
    const sinTablaCamisetas = Boolean(rc.error && esTablaAusente(rc.error.message));
    if (!sinTablaCamisetas) reventar("No se pudieron leer las camisetas", rc.error);

    // La fila 1 de `rubrica` guarda la configuración completa. Si viene en el
    // formato antiguo —una sola rúbrica— se migra al leerla.
    const configuracion = migrarConfiguracion(rr.data?.datos);
    return {
      jugadores: (rj.data ?? []).map((f) => f.datos as Jugador),
      evaluaciones: migrarEvaluaciones(
        (re.data ?? []).map((f) => f.datos as Evaluacion),
        configuracion,
      ),
      camisetas: sinTablaCamisetas ? [] : (rc.data ?? []).map((f) => f.datos as Camiseta),
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
    const { data, error } = await db().from("jugadores").delete().eq("id", id).select("id");
    reventar("No se pudo eliminar el jugador", error);
    reventarSiNoBorro("el jugador", data);
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
    const { data, error } = await db().from("evaluaciones").delete().eq("id", id).select("id");
    reventar("No se pudo eliminar la evaluación", error);
    reventarSiNoBorro("la evaluación", data);
  },

  async guardarCamiseta(camiseta) {
    // `temporada`, `categoria` y `numero` salen del jsonb a columnas propias
    // porque sobre esas tres está el índice único del esquema: es la base, y no
    // la pantalla, la que garantiza que dos niños de la misma categoría no
    // terminen con el mismo dorsal aunque dos entrenadores los inscriban al
    // mismo tiempo desde teléfonos distintos.
    const { error } = await db()
      .from("camisetas")
      .upsert({
        id: camiseta.id,
        jugador_id: camiseta.jugadorId,
        temporada: camiseta.temporada,
        categoria: camiseta.categoria,
        numero: camiseta.numero,
        datos: camiseta,
        actualizado_en: new Date().toISOString(),
      });
    reventar("No se pudo guardar la camiseta", error);
  },

  async eliminarCamiseta(id) {
    const { error } = await db().from("camisetas").delete().eq("id", id);
    reventar("No se pudo eliminar la camiseta", error);
  },

  async guardarConfiguracion(configuracion) {
    // Mismo silencio que en el borrado: si la política no deja actualizar la
    // rúbrica, el upsert vuelve sin error y sin haber cambiado nada.
    const { data, error } = await db()
      .from("rubrica")
      .upsert({ id: 1, datos: configuracion, actualizado_en: new Date().toISOString() })
      .select("id");
    reventar("No se pudieron guardar los parámetros", error);
    if (!data || data.length === 0) {
      throw new Error(
        "No se guardaron los parámetros: editar las pautas está reservado al administrador del club.",
      );
    }
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
    for (const c of backup.camisetas) await this.guardarCamiseta(c);
  },
};
