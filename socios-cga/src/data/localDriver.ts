import { motivoParaNoEliminar } from "../domain/cobros";
import type { Aviso, Backup, Inscripcion, Pago, Persona, Plan, Vinculo } from "../domain/types";
import { idbGet, idbSet } from "./idb";
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
} as const;

type Coleccion = keyof typeof K;

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

export const localDriver: Store = {
  modo: "local",
  etiqueta: "Este computador",

  async cargar(): Promise<EstadoDatos> {
    const [personas, vinculos, planes, inscripciones, pagos, avisos] = await Promise.all([
      leer<Persona>("personas"),
      leer<Vinculo>("vinculos"),
      leer<Plan>("planes"),
      leer<Inscripcion>("inscripciones"),
      leer<Pago>("pagos"),
      leer<Aviso>("avisos"),
    ]);
    return { personas, vinculos, planes, inscripciones, pagos, avisos };
  },

  guardarPersona: (persona) => guardarEn("personas", persona),

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
    const [vinculos, inscripciones, pagos, avisos] = await Promise.all([
      leer<Vinculo>("vinculos"),
      leer<Inscripcion>("inscripciones"),
      leer<Pago>("pagos"),
      leer<Aviso>("avisos"),
    ]);

    const motivo = motivoParaNoEliminar(id, inscripciones, pagos);
    if (motivo) throw new Error(`No se puede eliminar esta ficha. ${motivo}`);

    const suyas = new Set(inscripciones.filter((i) => i.personaId === id).map((i) => i.id));
    await Promise.all([
      borrarDe<Persona>("personas", id),
      idbSet(K.vinculos, vinculos.filter((v) => v.personaId !== id && v.adultoId !== id)),
      idbSet(K.inscripciones, inscripciones.filter((i) => !suyas.has(i.id))),
      idbSet(K.pagos, pagos.filter((p) => !suyas.has(p.inscripcionId))),
      idbSet(K.avisos, avisos.filter((a) => !suyas.has(a.inscripcionId))),
    ]);
  },

  guardarVinculo: (vinculo) => guardarEn("vinculos", vinculo),
  eliminarVinculo: (id) => borrarDe<Vinculo>("vinculos", id),

  guardarPlan: (plan) => guardarEn("planes", plan),
  eliminarPlan: (id) => borrarDe<Plan>("planes", id),

  guardarInscripcion: (inscripcion) => guardarEn("inscripciones", inscripcion),

  async eliminarInscripcion(id) {
    const [pagos, avisos] = await Promise.all([leer<Pago>("pagos"), leer<Aviso>("avisos")]);
    await Promise.all([
      borrarDe<Inscripcion>("inscripciones", id),
      idbSet(K.pagos, pagos.filter((p) => p.inscripcionId !== id)),
      idbSet(K.avisos, avisos.filter((a) => a.inscripcionId !== id)),
    ]);
  },

  guardarPago: (pago) => guardarEn("pagos", pago),
  eliminarPago: (id) => borrarDe<Pago>("pagos", id),

  guardarAviso: (aviso) => guardarEn("avisos", aviso),

  async importar(backup: Backup) {
    await Promise.all([
      idbSet(K.personas, backup.personas),
      idbSet(K.vinculos, backup.vinculos),
      idbSet(K.planes, backup.planes),
      idbSet(K.inscripciones, backup.inscripciones),
      idbSet(K.pagos, backup.pagos),
      idbSet(K.avisos, backup.avisos),
    ]);
  },

  async vaciar() {
    await this.importar({ ...estadoVacio(), formato: "cga-socios", version: 1, exportadoEn: "" });
  },
};
