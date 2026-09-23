/**
 * Traduce los errores que devuelve Supabase a algo que un entrenador pueda
 * accionar desde la cancha.
 *
 * Lo que llega crudo son cadenas en inglés pensadas para quien programa —"JWT
 * issued at future", "Invalid API key"—. Mostrarlas tal cual deja a quien las
 * lee sin nada que hacer, que es justo lo contrario de lo que necesita alguien
 * de pie en un entrenamiento con el teléfono en la mano.
 */

/**
 * El token dice haber sido emitido en un instante que, para el servidor que lo
 * verifica, todavía no llega.
 *
 * Pasa por dos motivos, y desde afuera no se distinguen: o el reloj del
 * teléfono está adelantado, o los dos servicios de Supabase —el que firma el
 * token y el que lo valida— tienen unos milisegundos de diferencia entre sí. Lo
 * segundo se resuelve reintentando; lo primero, corrigiendo la hora del
 * aparato.
 */
export function esDesfaseDeReloj(mensaje: string): boolean {
  return /issued at future|used before issued|clock skew|iat/i.test(mensaje);
}

export function esSesionVencida(mensaje: string): boolean {
  return /jwt expired|token is expired|invalid refresh token/i.test(mensaje);
}

/** La tabla no existe: falta correr —o volver a correr— supabase/schema.sql. */
export function esTablaAusente(mensaje: string): boolean {
  return /does not exist|could not find the table/i.test(mensaje);
}

export function traducirError(mensaje: string): string {
  if (esDesfaseDeReloj(mensaje)) {
    return (
      "La hora de este dispositivo no coincide con la del servidor, así que rechaza la sesión. " +
      "Revise que la fecha y la hora del teléfono estén en automático, y vuelva a entrar."
    );
  }
  if (esSesionVencida(mensaje)) {
    return "La sesión caducó. Toque «Salir» y vuelva a entrar con su correo y su clave.";
  }
  if (/invalid api key|no api key/i.test(mensaje)) {
    return (
      "El proyecto rechaza la clave de la aplicación. Revise la conexión en Datos → Revisar la instalación."
    );
  }
  if (/failed to fetch|networkerror|load failed/i.test(mensaje)) {
    return "No hay conexión con el servidor. Revise la señal e inténtelo de nuevo.";
  }
  // El índice único del pedido de camisetas. Salta cuando dos entrenadores
  // asignan el mismo dorsal al mismo tiempo desde teléfonos distintos: la
  // pantalla de cada uno validó contra lo que había cargado, y la base es la
  // que se entera del choque.
  if (/camisetas_numero_unico|camisetas_jugador_unico/i.test(mensaje)) {
    const porJugador = /camisetas_jugador_unico/i.test(mensaje);
    return porJugador
      ? "Ese jugador ya tiene una camiseta inscrita en esta temporada. Recargue la lista para verla."
      : "Ese número ya lo tomó otra persona en esta categoría mientras usted lo escribía. Recargue la lista y elija otro.";
  }
  if (esTablaAusente(mensaje)) {
    return (
      "Faltan tablas en la base de datos. Corra el archivo supabase/schema.sql en el SQL Editor de Supabase."
    );
  }
  return mensaje;
}
