import type {
  Aviso,
  Backup,
  EntradaBitacora,
  Huella,
  Inscripcion,
  Pago,
  Persona,
  Plan,
  Vinculo,
} from "../domain/types";
import { motivoParaNoEliminar } from "../domain/cobros";
import { nombreCompleto } from "../domain/types";
import { idbGet, idbSet } from "./idb";
import { tarifasDelClub } from "./tarifas";
import { etiquetaOperador } from "./operador";
import { estadoVacio, type EstadoDatos, type Store } from "./store";

/**
 * Persistencia en este computador. No requiere configurar nada y sirve para
 * probar la aplicación o para seguir trabajando si se cae internet, pero los
 * datos no salen de este navegador: para que todos los computadores vean lo
 * mismo hay que configurar la nube (Datos → Conexión con la nube).
 */

const K = {
  personas: "personas",
  vinculos: "vinculos",
  planes: "planes",
  inscripciones: "inscripciones",
  pagos: "pagos",
  avisos: "avisos",
  bitacora: "bitacora",
} as const;

/**
 * Marca de que este navegador ya se estrenó. Existe para no resucitar las
 * tarifas después de un «Borrar todo»: quien borró todo quiso dejarlo vacío.
 */
const K_ESTRENADO = "estrenado";

type Coleccion = keyof typeof K;

/** La bitácora local no crece para siempre: se guardan las últimas entradas. */
const TOPE_BITACORA = 3000;

async function leer<T>(coleccion: Coleccion): Promise<T[]> {
  return (await idbGet<T[]>(K[coleccion])) ?? [];
}

async function guardarEn<T extends { id: string }>(coleccion: Coleccion, registro: T) {
  const lista = await leer<T>(coleccion);
  const i = lista.findIndex((x) => x.id === registro.id);
  if (i >= 0) lista[i] = registro;
  else lista.push(registro);
  await idbSet(K[coleccion], lista);
}

async function borrarDe<T extends { id: string }>(coleccion: Coleccion, id: string) {
  const lista = (await leer<T>(coleccion)).filter((x) => x.id !== id);
  await idbSet(K[coleccion], lista);
}

/* ========================================================================== */
/*  Huella y bitácora                                                         */
/* ========================================================================== */

/**
 * Firma el registro con el nombre configurado en este computador. El autor
 * original no se reescribe nunca, igual que en la base compartida.
 */
function sellar<T extends Huella>(registro: T, previo: T | undefined): T {
  const ahora = new Date().toISOString();
  return {
    ...registro,
    creadoEn: previo?.creadoEn ?? registro.creadoEn ?? ahora,
    creadoPor: previo?.creadoPor ?? etiquetaOperador(),
    actualizadoEn: ahora,
    actualizadoPor: etiquetaOperador(),
  };
}

/** Campos que cambiaron, sin contar las propias marcas de auditoría. */
function diferencias<T extends object>(
  antes: T,
  despues: T,
): EntradaBitacora["cambios"] {
  const omitir = new Set(["creadoEn", "creadoPor", "actualizadoEn", "actualizadoPor"]);
  const cambios: Record<string, { antes: unknown; despues: unknown }> = {};
  for (const clave of new Set([...Object.keys(antes), ...Object.keys(despues)])) {
    if (omitir.has(clave)) continue;
    const a = (antes as Record<string, unknown>)[clave];
    const d = (despues as Record<string, unknown>)[clave];
    if (JSON.stringify(a) !== JSON.stringify(d)) cambios[clave] = { antes: a, despues: d };
  }
  return Object.keys(cambios).length > 0 ? cambios : null;
}

async function anotar(
  accion: EntradaBitacora["accion"],
  tabla: string,
  registroId: string,
  descripcion: string,
  cambios: EntradaBitacora["cambios"] = null,
) {
  const lista = await leer<EntradaBitacora>("bitacora");
  lista.push({
    id: `bit_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    ocurridoEn: new Date().toISOString(),
    usuario: etiquetaOperador(),
    accion,
    tabla,
    registroId,
    descripcion,
    cambios,
  });
  await idbSet(K.bitacora, lista.slice(-TOPE_BITACORA));
}

/** Nombre de una persona guardada, para que la bitácora no muestre sólo ids. */
async function nombreDe(personaId: string): Promise<string> {
  const persona = (await leer<Persona>("personas")).find((p) => p.id === personaId);
  return persona ? nombreCompleto(persona) : personaId;
}

/**
 * Guarda un registro y anota el hecho. Si no cambió nada, no anota: una
 * bitácora llena de líneas que no dicen nada esconde las que sí importan.
 */
async function guardarYAnotar<T extends { id: string } & Huella>(
  coleccion: Coleccion,
  registro: T,
  etiqueta: (r: T) => Promise<string> | string,
): Promise<void> {
  const previo = (await leer<T>(coleccion)).find((x) => x.id === registro.id);
  const sellado = sellar(registro, previo);
  await guardarEn(coleccion, sellado);

  const cambios = previo ? diferencias(previo, sellado) : null;
  if (previo && !cambios) return;
  await anotar(previo ? "modificó" : "creó", coleccion, registro.id, await etiqueta(sellado), cambios);
}

export const localDriver: Store = {
  modo: "local",
  etiqueta: "Este computador",

  /**
   * La primera vez que la aplicación se abre en un computador, deja cargadas
   * las tarifas del club.
   *
   * Sin esto, quien entra se encuentra con Planes vacío y no puede inscribir a
   * nadie —hay que elegir un plan para hacerlo— sin antes descubrir por su
   * cuenta el botón «Cargar ejemplo» en otra pantalla. La familia inventada
   * sigue detrás de ese botón; lo que se siembra acá son sólo los precios.
   */
  async cargar(): Promise<EstadoDatos> {
    const [personas, vinculos, planes, inscripciones, pagos, avisos, estrenado] =
      await Promise.all([
        leer<Persona>("personas"),
        leer<Vinculo>("vinculos"),
        leer<Plan>("planes"),
        leer<Inscripcion>("inscripciones"),
        leer<Pago>("pagos"),
        leer<Aviso>("avisos"),
        idbGet<boolean>(K_ESTRENADO),
      ]);

    if (!estrenado && planes.length === 0 && personas.length === 0) {
      const tarifas = tarifasDelClub();
      await Promise.all([idbSet(K.planes, tarifas), idbSet(K_ESTRENADO, true)]);
      await anotar(
        "creó",
        "sistema",
        "tarifas",
        `Cargó las ${tarifas.length} tarifas del club al abrir por primera vez`,
      );
      return { personas, vinculos, planes: tarifas, inscripciones, pagos, avisos };
    }

    return { personas, vinculos, planes, inscripciones, pagos, avisos };
  },

  guardarPersona: (persona) => guardarYAnotar("personas", persona, nombreCompleto),

  /**
   * Al borrar una persona se van con ella sus vínculos, inscripciones y pagos.
   * En la nube lo hace la propia base con `on delete cascade`; acá hay que
   * escribirlo.
   *
   * La negativa a borrar a quien tiene historia contable también se repite acá,
   * y no sólo en la pantalla: en la nube la impone la base, y si este driver no
   * la impusiera, el mismo botón haría cosas distintas según dónde se estén
   * guardando los datos.
   */
  async eliminarPersona(id) {
    const [personas, vinculos, inscripciones, pagos, avisos] = await Promise.all([
      leer<Persona>("personas"),
      leer<Vinculo>("vinculos"),
      leer<Inscripcion>("inscripciones"),
      leer<Pago>("pagos"),
      leer<Aviso>("avisos"),
    ]);

    const motivo = motivoParaNoEliminar(id, inscripciones, pagos);
    if (motivo) throw new Error(`No se puede eliminar esta ficha. ${motivo}`);

    const persona = personas.find((p) => p.id === id);
    const suyas = new Set(inscripciones.filter((i) => i.personaId === id).map((i) => i.id));
    await Promise.all([
      borrarDe<Persona>("personas", id),
      idbSet(K.vinculos, vinculos.filter((v) => v.personaId !== id && v.adultoId !== id)),
      idbSet(K.inscripciones, inscripciones.filter((i) => !suyas.has(i.id))),
      idbSet(K.pagos, pagos.filter((p) => !suyas.has(p.inscripcionId))),
      idbSet(K.avisos, avisos.filter((a) => !suyas.has(a.inscripcionId))),
    ]);
    await anotar("eliminó", "personas", id, nombreCompleto(persona));
  },

  guardarVinculo: (vinculo) =>
    guardarYAnotar("vinculos", vinculo, async (v) => `${await nombreDe(v.personaId)} · ${v.tipo}`),

  async eliminarVinculo(id) {
    const vinculo = (await leer<Vinculo>("vinculos")).find((v) => v.id === id);
    await borrarDe<Vinculo>("vinculos", id);
    await anotar(
      "eliminó",
      "vinculos",
      id,
      vinculo ? `${await nombreDe(vinculo.personaId)} · ${vinculo.tipo}` : id,
    );
  },

  guardarPlan: (plan) => guardarYAnotar("planes", plan, (p) => p.nombre),

  async eliminarPlan(id) {
    const plan = (await leer<Plan>("planes")).find((p) => p.id === id);
    await borrarDe<Plan>("planes", id);
    await anotar("eliminó", "planes", id, plan?.nombre ?? id);
  },

  guardarInscripcion: (inscripcion) =>
    guardarYAnotar("inscripciones", inscripcion, async (i) => {
      const planes = await leer<Plan>("planes");
      const plan = planes.find((p) => p.id === i.planId);
      return `${await nombreDe(i.personaId)} en ${plan?.nombre ?? i.planId}`;
    }),

  async eliminarInscripcion(id) {
    const [inscripciones, pagos, avisos, planes] = await Promise.all([
      leer<Inscripcion>("inscripciones"),
      leer<Pago>("pagos"),
      leer<Aviso>("avisos"),
      leer<Plan>("planes"),
    ]);
    const inscripcion = inscripciones.find((i) => i.id === id);
    await Promise.all([
      borrarDe<Inscripcion>("inscripciones", id),
      idbSet(K.pagos, pagos.filter((p) => p.inscripcionId !== id)),
      idbSet(K.avisos, avisos.filter((a) => a.inscripcionId !== id)),
    ]);
    const plan = planes.find((p) => p.id === inscripcion?.planId);
    await anotar(
      "eliminó",
      "inscripciones",
      id,
      inscripcion ? `${await nombreDe(inscripcion.personaId)} en ${plan?.nombre ?? ""}` : id,
    );
  },

  guardarPago: (pago) =>
    guardarYAnotar("pagos", pago, async (p) => {
      const inscripcion = (await leer<Inscripcion>("inscripciones")).find(
        (i) => i.id === p.inscripcionId,
      );
      const quien = inscripcion ? await nombreDe(inscripcion.personaId) : p.inscripcionId;
      return `$${p.monto.toLocaleString("es-CL")} · ${quien}`;
    }),

  async eliminarPago(id) {
    const pago = (await leer<Pago>("pagos")).find((p) => p.id === id);
    await borrarDe<Pago>("pagos", id);
    await anotar("eliminó", "pagos", id, pago ? `$${pago.monto.toLocaleString("es-CL")}` : id);
  },

  guardarAviso: (aviso) => guardarEn("avisos", aviso),

  async bitacora(limite = 500) {
    const lista = await leer<EntradaBitacora>("bitacora");
    return lista.slice(-limite).reverse();
  },

  async importar(backup: Backup) {
    await Promise.all([
      idbSet(K.personas, backup.personas),
      idbSet(K.vinculos, backup.vinculos),
      idbSet(K.planes, backup.planes),
      idbSet(K.inscripciones, backup.inscripciones),
      idbSet(K.pagos, backup.pagos),
      idbSet(K.avisos, backup.avisos),
    ]);
    await anotar(
      "modificó",
      "sistema",
      "respaldo",
      `Cargó un respaldo con ${backup.personas.length} personas y ${backup.pagos.length} pagos`,
    );
  },

  async vaciar() {
    await Promise.all([
      idbSet(K_ESTRENADO, true),
      idbSet(K.personas, []),
      idbSet(K.vinculos, []),
      idbSet(K.planes, []),
      idbSet(K.inscripciones, []),
      idbSet(K.pagos, []),
      idbSet(K.avisos, []),
    ]);
    // La bitácora sobrevive al borrado a propósito: es la única forma de saber
    // después que alguien borró todo, y cuándo.
    await anotar("eliminó", "sistema", "todo", "Borró todos los datos de este computador");
  },
};

/** Un estado vacío, para cuando haga falta partir de cero en memoria. */
export const sinDatos = estadoVacio;
