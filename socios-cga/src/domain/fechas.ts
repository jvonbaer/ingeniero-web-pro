/**
 * Fechas en horario local, sin librerías.
 *
 * Todas las fechas del sistema se guardan como texto `aaaa-mm-dd`. Se evita
 * `new Date("2026-03-01")` a secas porque el navegador lo interpreta en UTC y en
 * Chile devuelve el día anterior: una cuota que vence el 1 aparecería venciendo
 * el 28. Por eso todo pasa por `desdeISO`, que arma la fecha en horario local.
 */

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function hoyISO(): string {
  return aISO(new Date());
}

export function aISO(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function desdeISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return null;
  const fecha = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** `2026-03-01` → `1 de marzo de 2026`. */
export function formatoLargo(iso: string): string {
  const f = desdeISO(iso);
  if (!f) return "—";
  return `${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
}

/** `2026-03-01` → `01-03-2026`, para tablas y listas. */
export function formatoCorto(iso: string): string {
  const f = desdeISO(iso);
  if (!f) return "—";
  const dia = String(f.getDate()).padStart(2, "0");
  const mes = String(f.getMonth() + 1).padStart(2, "0");
  return `${dia}-${mes}-${f.getFullYear()}`;
}

export function sumarDias(iso: string, dias: number): string {
  const f = desdeISO(iso);
  if (!f) return iso;
  f.setDate(f.getDate() + dias);
  return aISO(f);
}

/**
 * Suma meses cuidando los fines de mes: al 31 de enero más un mes le
 * corresponde el 28 (o 29) de febrero, no el 3 de marzo, que es lo que hace
 * `setMonth` por su cuenta.
 */
export function sumarMeses(iso: string, meses: number): string {
  const f = desdeISO(iso);
  if (!f) return iso;
  const dia = f.getDate();
  f.setDate(1);
  f.setMonth(f.getMonth() + meses);
  const ultimoDelMes = new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate();
  f.setDate(Math.min(dia, ultimoDelMes));
  return aISO(f);
}

/** Días calendario entre dos fechas: positivo si `hasta` viene después. */
export function diasEntre(desde: string, hasta: string): number {
  const a = desdeISO(desde);
  const b = desdeISO(hasta);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Edad cumplida a la fecha indicada (por omisión, hoy). */
export function edad(fechaNacimiento: string, referencia = hoyISO()): number | null {
  const nac = desdeISO(fechaNacimiento);
  const ref = desdeISO(referencia);
  if (!nac || !ref) return null;
  let años = ref.getFullYear() - nac.getFullYear();
  const cumpleEsteAño = new Date(ref.getFullYear(), nac.getMonth(), nac.getDate());
  if (ref < cumpleEsteAño) años--;
  return años;
}

export function esMenorDeEdad(fechaNacimiento: string, referencia = hoyISO()): boolean {
  const e = edad(fechaNacimiento, referencia);
  return e !== null && e < 18;
}

/** "en 5 días", "hoy", "hace 3 días" — para las listas de cobranza. */
export function enPalabras(dias: number): string {
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  if (dias === -1) return "ayer";
  if (dias > 0) return `en ${dias} días`;
  return `hace ${Math.abs(dias)} días`;
}
