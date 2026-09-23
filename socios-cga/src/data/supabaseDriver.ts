import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Backup } from "../domain/types";
import { conexion } from "./conexion";
import * as mapa from "./mapeo";
import { esDesfaseDeReloj, traducirError } from "./mensajes";
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

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function leerTodo() {
  return Promise.all([
    db().from("personas").select("*").order("apellidos", { ascending: true }),
    db().from("vinculos").select("*"),
    db().from("planes").select("*").order("nombre", { ascending: true }),
    db().from("inscripciones").select("*"),
    db().from("pagos").select("*").order("fecha", { ascending: false }),
    db().from("avisos").select("*").order("enviado_en", { ascending: false }).limit(500),
  ]);
}

/**
 * Persistencia compartida en Supabase: la base única que ven todos los
 * computadores del club.
 *
 * Se carga todo de una vez al abrir la aplicación. Con los volúmenes de un club
 * —miles de personas, no millones— son unos pocos cientos de kilobytes, y a
 * cambio los cruces (quién paga por quién, qué debe cada familia) se resuelven
 * en memoria y las pantallas no vuelven a esperar a la red.
 */
export const supabaseDriver: Store = {
  modo: "nube",
  etiqueta: "Base compartida",

  async cargar(): Promise<EstadoDatos> {
    let respuestas = await leerTodo();

    // El token recién firmado puede llegar unos milisegundos antes de que el
    // servicio que lo valida lo dé por vigente, y entonces la primera lectura
    // tras iniciar sesión falla sola. Se reintenta una vez: si era eso, nadie
    // se entera; si era el reloj del computador, vuelve a fallar y el mensaje
    // ya dice qué revisar.
    if (respuestas.some((r) => r.error && esDesfaseDeReloj(r.error.message))) {
      await esperar(1500);
      respuestas = await leerTodo();
    }

    const [rp, rv, rpl, ri, rpa, ra] = respuestas;
    reventar("No se pudieron leer las personas", rp.error);
    reventar("No se pudieron leer los vínculos", rv.error);
    reventar("No se pudieron leer los planes", rpl.error);
    reventar("No se pudieron leer las inscripciones", ri.error);
    reventar("No se pudieron leer los pagos", rpa.error);
    reventar("No se pudieron leer los avisos", ra.error);

    return {
      personas: (rp.data ?? []).map(mapa.personas.deFila),
      vinculos: (rv.data ?? []).map(mapa.vinculos.deFila),
      planes: (rpl.data ?? []).map(mapa.planes.deFila),
      inscripciones: (ri.data ?? []).map(mapa.inscripciones.deFila),
      pagos: (rpa.data ?? []).map(mapa.pagos.deFila),
      avisos: (ra.data ?? []).map(mapa.avisos.deFila),
    };
  },

  async guardarPersona(persona) {
    const { error } = await db().from("personas").upsert(mapa.personas.aFila(persona));
    reventar("No se pudo guardar la persona", error);
  },

  async eliminarPersona(id) {
    // Los vínculos, inscripciones, pagos y avisos se van solos: las claves
    // foráneas del esquema están declaradas `on delete cascade`.
    const { error } = await db().from("personas").delete().eq("id", id);
    reventar("No se pudo eliminar la persona", error);
  },

  async guardarVinculo(vinculo) {
    const { error } = await db().from("vinculos").upsert(mapa.vinculos.aFila(vinculo));
    reventar("No se pudo guardar el vínculo", error);
  },

  async eliminarVinculo(id) {
    const { error } = await db().from("vinculos").delete().eq("id", id);
    reventar("No se pudo eliminar el vínculo", error);
  },

  async guardarPlan(plan) {
    const { error } = await db().from("planes").upsert(mapa.planes.aFila(plan));
    reventar("No se pudo guardar el plan", error);
  },

  async eliminarPlan(id) {
    const { error } = await db().from("planes").delete().eq("id", id);
    reventar("No se pudo eliminar el plan", error);
  },

  async guardarInscripcion(inscripcion) {
    const { error } = await db()
      .from("inscripciones")
      .upsert(mapa.inscripciones.aFila(inscripcion));
    reventar("No se pudo guardar la inscripción", error);
  },

  async eliminarInscripcion(id) {
    const { error } = await db().from("inscripciones").delete().eq("id", id);
    reventar("No se pudo eliminar la inscripción", error);
  },

  async guardarPago(pago) {
    const { error } = await db().from("pagos").upsert(mapa.pagos.aFila(pago));
    reventar("No se pudo registrar el pago", error);
  },

  async eliminarPago(id) {
    const { error } = await db().from("pagos").delete().eq("id", id);
    reventar("No se pudo eliminar el pago", error);
  },

  async guardarAviso(aviso) {
    const { error } = await db().from("avisos").upsert(mapa.avisos.aFila(aviso));
    reventar("No se pudo registrar el aviso", error);
  },

  /**
   * La bitácora no se carga con el resto: crece sin techo y casi nunca se
   * mira, así que se pide sólo cuando alguien abre su pantalla.
   */
  async bitacora(limite = 500) {
    const { data, error } = await db()
      .from("bitacora")
      .select("*")
      .order("ocurrido_en", { ascending: false })
      .limit(limite);
    reventar("No se pudo leer la bitácora", error);
    return (data ?? []).map(mapa.bitacora.deFila);
  },

  /**
   * Importar respeta el orden de las dependencias: primero las personas y los
   * planes, después lo que los referencia. Al revés, la base rechaza las filas
   * por clave foránea.
   */
  async importar(backup: Backup) {
    const porLotes = async (tabla: string, filas: Record<string, unknown>[]) => {
      for (let i = 0; i < filas.length; i += 200) {
        const { error } = await db().from(tabla).upsert(filas.slice(i, i + 200));
        reventar(`No se pudo importar ${tabla}`, error);
      }
    };
    await porLotes("personas", backup.personas.map(mapa.personas.aFila));
    await porLotes("planes", backup.planes.map(mapa.planes.aFila));
    await porLotes("vinculos", backup.vinculos.map(mapa.vinculos.aFila));
    await porLotes("inscripciones", backup.inscripciones.map(mapa.inscripciones.aFila));
    await porLotes("pagos", backup.pagos.map(mapa.pagos.aFila));
    await porLotes("avisos", backup.avisos.map(mapa.avisos.aFila));
  },

  /**
   * El orden es al revés del de importar, y no es casual: `pagos.persona_id` e
   * `inscripciones.pagador_id` son `on delete restrict`, así que empezar por
   * las personas dejaría la base intacta y un error en la pantalla.
   */
  async vaciar() {
    for (const tabla of ["avisos", "pagos", "inscripciones", "vinculos", "personas", "planes"]) {
      const { error } = await db().from(tabla).delete().neq("id", "");
      reventar(`No se pudo vaciar ${tabla}`, error);
    }
  },
};
