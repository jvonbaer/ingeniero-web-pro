/**
 * Quién está usando la aplicación cuando NO hay base compartida.
 *
 * En la nube la identidad es de verdad: cada persona entra con su cuenta y la
 * base firma cada fila con el correo del token, sin que el navegador pueda
 * intervenir. Trabajando sólo contra este computador no existe esa garantía —no
 * hay servidor que verifique nada—, así que lo que se pide acá es un nombre
 * para saber quién estaba en el teclado, y la bitácora lo marca como lo que es:
 * una anotación sin cuenta detrás.
 *
 * Vale para un computador de prueba o para seguir trabajando con internet
 * caído. Para el registro de verdad del club, la base compartida no es un lujo.
 */
const CLAVE = "cga.operador";

export function operadorActual(): string {
  try {
    return localStorage.getItem(CLAVE)?.trim() ?? "";
  } catch {
    return ""; // localStorage bloqueado
  }
}

export function guardarOperador(nombre: string) {
  try {
    localStorage.setItem(CLAVE, nombre.trim());
  } catch {
    /* sin localStorage se sigue trabajando, pero sin recordar el nombre */
  }
}

export function borrarOperador() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada que hacer */
  }
}

/** Cómo aparece en la bitácora. El paréntesis es parte del dato, no adorno. */
export function etiquetaOperador(): string {
  const nombre = operadorActual();
  return nombre ? `${nombre} (sin cuenta, en este computador)` : "sin identificar";
}
