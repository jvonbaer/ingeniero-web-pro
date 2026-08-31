/**
 * Qué debe cada quién y cuándo.
 *
 * Regla central: **el vencimiento no se guarda, se deduce de los pagos**. Una
 * inscripción vence al día siguiente del último período pagado; si todavía no
 * hay pagos, vence el día en que empezó. Guardar además una fecha de
 * vencimiento suelta obligaría a mantener dos verdades sincronizadas, y basta
 * con que alguien corrija un pago para que queden diciendo cosas distintas.
 */
import { diasEntre, hoyISO, sumarDias, sumarMeses } from "./fechas";
import type { Descuentos, Inscripcion, Pago, Plan } from "./types";
import { mesesDe } from "./types";

export type ClaseCobro =
  | "al-dia"
  | "por-vencer"
  | "vencida"
  | "pagada"
  | "suspendida"
  | "terminada";

export interface EstadoCobro {
  clase: ClaseCobro;
  etiqueta: string;
  /** Fecha en que hay que volver a pagar. Vacío si ya no corresponde cobrar. */
  vence: string;
  /** Días hasta el vencimiento: negativo si ya pasó. */
  dias: number;
  /** Verdadero cuando corresponde avisar al pagador. */
  avisar: boolean;
}

export function formatoPesos(monto: number): string {
  return `$${Math.round(monto).toLocaleString("es-CL")}`;
}

/** Pagos que cubren período (la matrícula no corre la fecha de renovación). */
function pagosDePeriodo(pagos: Pago[], inscripcionId: string): Pago[] {
  return pagos.filter(
    (p) => p.inscripcionId === inscripcionId && p.concepto !== "matricula" && p.periodoHasta,
  );
}

/** Último día cubierto por los pagos de una inscripción, o vacío si no hay. */
export function cubiertoHasta(inscripcion: Inscripcion, pagos: Pago[]): string {
  const propios = pagosDePeriodo(pagos, inscripcion.id);
  if (propios.length === 0) return "";
  return propios.reduce((max, p) => (p.periodoHasta > max ? p.periodoHasta : max), "");
}

/**
 * El período que toca cobrar ahora. Sirve para rellenar el formulario de pago
 * sin que nadie tenga que calcular fechas a mano.
 */
export function siguientePeriodo(inscripcion: Inscripcion, pagos: Pago[]): {
  desde: string;
  hasta: string;
} {
  const hasta = cubiertoHasta(inscripcion, pagos);
  const desde = hasta ? sumarDias(hasta, 1) : inscripcion.fechaInicio;
  const meses = mesesDe(inscripcion.periodicidad);
  if (meses === 0) return { desde, hasta: desde };
  return { desde, hasta: sumarDias(sumarMeses(desde, meses), -1) };
}

export function estadoCobro(
  inscripcion: Inscripcion,
  pagos: Pago[],
  hoy = hoyISO(),
): EstadoCobro {
  if (inscripcion.estado === "terminada") {
    return { clase: "terminada", etiqueta: "Terminada", vence: "", dias: 0, avisar: false };
  }
  if (inscripcion.estado === "suspendida") {
    return { clase: "suspendida", etiqueta: "Suspendida", vence: "", dias: 0, avisar: false };
  }

  const cubierto = cubiertoHasta(inscripcion, pagos);

  // Actividad puntual: se paga una vez y queda saldada, no vuelve a vencer.
  if (inscripcion.periodicidad === "unico") {
    if (cubierto) {
      return { clase: "pagada", etiqueta: "Pagada", vence: "", dias: 0, avisar: false };
    }
    const dias = diasEntre(hoy, inscripcion.fechaInicio);
    return {
      clase: dias < 0 ? "vencida" : "por-vencer",
      etiqueta: dias < 0 ? "Impaga" : "Por pagar",
      vence: inscripcion.fechaInicio,
      dias,
      avisar: dias <= inscripcion.diasAviso,
    };
  }

  const vence = cubierto ? sumarDias(cubierto, 1) : inscripcion.fechaInicio;
  const dias = diasEntre(hoy, vence);

  if (dias < 0) {
    return { clase: "vencida", etiqueta: "Vencida", vence, dias, avisar: true };
  }
  if (dias <= inscripcion.diasAviso) {
    return { clase: "por-vencer", etiqueta: "Por vencer", vence, dias, avisar: true };
  }
  return { clase: "al-dia", etiqueta: "Al día", vence, dias, avisar: false };
}

/**
 * Valor de un plan con los descuentos marcados aplicados.
 *
 * Los descuentos se suman antes de aplicarse (20 % de hermano + 10 % de socio =
 * 30 %), que es como los explica el club, y no se encadenan uno sobre el otro.
 * El tope de 100 % evita que una combinación mal cargada devuelva un valor
 * negativo.
 */
export function valorConDescuentos(
  plan: Plan,
  aplicar: { hermanos?: boolean; socio?: boolean; pagoAnual?: boolean },
): { valor: number; porcentaje: number; motivo: string } {
  const partes: { activo: boolean; pct: number; texto: string }[] = [
    { activo: !!aplicar.hermanos, pct: plan.descuentos.hermanos, texto: "hermanos" },
    { activo: !!aplicar.socio, pct: plan.descuentos.socio, texto: "socio del club" },
    { activo: !!aplicar.pagoAnual, pct: plan.descuentos.pagoAnual, texto: "pago anual" },
  ].filter((p) => p.activo && p.pct > 0);

  const porcentaje = Math.min(100, partes.reduce((s, p) => s + p.pct, 0));
  const motivo = partes.map((p) => `${p.pct}% ${p.texto}`).join(" + ");
  return { valor: Math.round(plan.valor * (1 - porcentaje / 100)), porcentaje, motivo };
}

export function descuentosVacios(): Descuentos {
  return { hermanos: 0, socio: 0, pagoAnual: 0 };
}

/** Cuánto lleva pagado una inscripción, en total. */
export function totalPagado(inscripcionId: string, pagos: Pago[]): number {
  return pagos
    .filter((p) => p.inscripcionId === inscripcionId)
    .reduce((suma, p) => suma + p.monto, 0);
}

/**
 * Cuánto suma al mes lo que paga una persona. Las periodicidades distintas de
 * la mensual se prorratean, para poder comparar en una sola cifra lo que un
 * apoderado desembolsa por dos hijos en escuelas con planes diferentes.
 */
export function cargaMensual(inscripciones: Inscripcion[]): number {
  return inscripciones
    .filter((i) => i.estado === "activa" && i.periodicidad !== "unico")
    .reduce((suma, i) => suma + i.valor / mesesDe(i.periodicidad), 0);
}

/**
 * Por qué no se puede eliminar la ficha de una persona, o `null` si sí se puede.
 *
 * Quien pagó algo, o a quien se le cobra lo de otro, tiene historia contable
 * colgando: borrarlo dejaría pagos sin quién los hizo y cuotas sin quién las
 * debe. La base lo impide por su cuenta —las claves foráneas de `pagos` y de
 * `inscripciones.pagador_id` son `on delete restrict`—, así que sin esta
 * comprobación la aplicación mostraría un error de PostgreSQL en vez de
 * explicar qué pasa y qué hacer en su lugar.
 */
export function motivoParaNoEliminar(
  personaId: string,
  inscripciones: Inscripcion[],
  pagos: Pago[],
): string | null {
  const pagosHechos = pagos.filter((p) => p.personaId === personaId).length;
  const aCargo = inscripciones.filter(
    (i) => i.pagadorId === personaId && i.personaId !== personaId,
  ).length;

  if (aCargo > 0) {
    return (
      `Figura como pagador de ${aCargo} ${aCargo === 1 ? "inscripción" : "inscripciones"} de otras ` +
      "personas. Antes de eliminarla hay que asignarles otro pagador."
    );
  }
  if (pagosHechos > 0) {
    return (
      `Tiene ${pagosHechos} ${pagosHechos === 1 ? "pago registrado" : "pagos registrados"} a su ` +
      "nombre, que son parte de la contabilidad del club y no se pueden borrar con la ficha."
    );
  }
  return null;
}
