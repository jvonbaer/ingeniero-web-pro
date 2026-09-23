/**
 * RUT chileno: limpieza, dígito verificador y formato.
 *
 * El RUT es la llave con la que el club evita tener a la misma persona dos
 * veces —"Ma. José Pérez" y "María José Perez" son la misma señora— y con la
 * que cruza al niño con quien lo paga. Por eso se valida al escribirlo: un
 * dígito verificador malo es casi siempre un dígito tecleado de más o de menos,
 * y detectarlo ahí evita una ficha duplicada que después nadie desenreda.
 */

/** Deja sólo dígitos y la K final, en mayúscula. */
export function limpiarRut(valor: string): string {
  return valor.replace(/[^0-9kK]/g, "").toUpperCase();
}

/** Dígito verificador por módulo 11. */
export function digitoVerificador(cuerpo: string): string {
  let suma = 0;
  let factor = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return "0";
  if (resto === 10) return "K";
  return String(resto);
}

export function rutValido(valor: string): boolean {
  const limpio = limpiarRut(valor);
  if (limpio.length < 7 || limpio.length > 9) return false;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  if (!/^\d+$/.test(cuerpo)) return false;
  return digitoVerificador(cuerpo) === dv;
}

/** Forma canónica que se guarda en la base: `12345678-9`, sin puntos. */
export function normalizarRut(valor: string): string {
  const limpio = limpiarRut(valor);
  if (limpio.length < 2) return "";
  return `${limpio.slice(0, -1)}-${limpio.slice(-1)}`;
}

/** Forma legible para la pantalla: `12.345.678-9`. */
export function formatearRut(valor: string): string {
  const limpio = limpiarRut(valor);
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}
