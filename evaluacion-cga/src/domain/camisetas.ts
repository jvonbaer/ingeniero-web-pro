/**
 * Reglas del pedido de camisetas.
 *
 * Todo lo que impide que dos niños de la misma categoría terminen con el mismo
 * número vive acá y no en la pantalla, por una razón concreta: en el modo "este
 * dispositivo" no hay base de datos que valide nada, así que la única defensa
 * es esta. En el modo nube la restricción está además escrita en el esquema
 * (`unique (temporada, categoria, numero)`), y las dos dicen lo mismo.
 */
import type { Camiseta, EstadoPagoCamiseta, Jugador, MedioPagoCamiseta } from "./types";
import { hoyISO, nuevoId } from "./scoring";

/** Rango de dorsales. Noventa y nueve alcanza de sobra para una categoría. */
export const NUMERO_MIN = 1;
export const NUMERO_MAX = 99;

/**
 * Largo máximo del nombre estampado. Doce caracteres es lo que entra sobre el
 * número en una camiseta de niño sin que la letra quede ilegible desde la
 * galería; más largo, el proveedor lo achica y no se lee.
 */
export const LARGO_ESTAMPADO = 12;

/** Lo que acepta una estampadora: letras con tilde, ñ, números y poco más. */
const ESTAMPADO_VALIDO = /^[A-ZÁÉÍÓÚÜÑ0-9 .'-]+$/;

export const TALLAS: { id: string; etiqueta: string; grupo: string }[] = [
  { id: "4", etiqueta: "4 años", grupo: "Infantil" },
  { id: "6", etiqueta: "6 años", grupo: "Infantil" },
  { id: "8", etiqueta: "8 años", grupo: "Infantil" },
  { id: "10", etiqueta: "10 años", grupo: "Infantil" },
  { id: "12", etiqueta: "12 años", grupo: "Infantil" },
  { id: "14", etiqueta: "14 años", grupo: "Infantil" },
  { id: "16", etiqueta: "16 años", grupo: "Infantil" },
  { id: "S", etiqueta: "S", grupo: "Adulto" },
  { id: "M", etiqueta: "M", grupo: "Adulto" },
  { id: "L", etiqueta: "L", grupo: "Adulto" },
  { id: "XL", etiqueta: "XL", grupo: "Adulto" },
  { id: "XXL", etiqueta: "XXL", grupo: "Adulto" },
];

export const MEDIOS_PAGO: { id: MedioPagoCamiseta; etiqueta: string }[] = [
  { id: "", etiqueta: "Sin registrar" },
  { id: "transferencia", etiqueta: "Transferencia" },
  { id: "efectivo", etiqueta: "Efectivo" },
  { id: "webpay", etiqueta: "Webpay" },
  { id: "otro", etiqueta: "Otro" },
];

export const ESTADOS_PAGO: { id: EstadoPagoCamiseta; etiqueta: string }[] = [
  { id: "pendiente", etiqueta: "Sin pagar" },
  { id: "abonado", etiqueta: "Abonado" },
  { id: "pagado", etiqueta: "Pagado" },
];

/* ---------- Cálculos ---------- */

export function saldoDe(camiseta: Camiseta): number {
  return Math.max(0, camiseta.precio - camiseta.abonado);
}

/**
 * El estado de pago no se guarda: se deduce del precio y de lo abonado. Si se
 * guardara, bastaría con corregir un monto para dejarlo mintiendo.
 */
export function estadoPago(camiseta: Camiseta): EstadoPagoCamiseta {
  if (saldoDe(camiseta) === 0) return "pagado";
  return camiseta.abonado > 0 ? "abonado" : "pendiente";
}

export function etiquetaEstado(estado: EstadoPagoCamiseta): string {
  return ESTADOS_PAGO.find((e) => e.id === estado)?.etiqueta ?? estado;
}

export function etiquetaTalla(id: string): string {
  return TALLAS.find((t) => t.id === id)?.etiqueta ?? id;
}

export function etiquetaMedio(id: MedioPagoCamiseta): string {
  return MEDIOS_PAGO.find((m) => m.id === id)?.etiqueta ?? "—";
}

/** Pesos chilenos sin decimales: $12.500. */
export function pesos(monto: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(monto));
}

/** Temporada en curso, en años. Es lo que el club usa para nombrar el pedido. */
export function temporadaActual(): string {
  return hoyISO().slice(0, 4);
}

/**
 * La temporada que viene. El club arma el pedido en diciembre para la que
 * empieza en marzo, así que tiene que poder elegirla antes de que exista.
 */
export function temporadaSiguiente(): string {
  return String(Number(temporadaActual()) + 1);
}

/** Temporadas con pedidos, de la más nueva a la más antigua, incluida la actual. */
export function temporadasDe(camisetas: Camiseta[]): string[] {
  const set = new Set(camisetas.map((c) => c.temporada).filter(Boolean));
  set.add(temporadaActual());
  return [...set].sort().reverse();
}

/* ---------- Números ---------- */

/**
 * Qué número tiene tomado quién, dentro de una temporada y una categoría.
 * Es la estructura sobre la que se apoyan la validación y el mapa de números.
 */
export function ocupacionDe(
  camisetas: Camiseta[],
  temporada: string,
  categoria: string,
): Map<number, Camiseta> {
  const mapa = new Map<number, Camiseta>();
  for (const c of camisetas) {
    if (c.temporada === temporada && c.categoria === categoria) mapa.set(c.numero, c);
  }
  return mapa;
}

export function numerosLibres(
  camisetas: Camiseta[],
  temporada: string,
  categoria: string,
): number[] {
  const tomados = ocupacionDe(camisetas, temporada, categoria);
  const libres: number[] = [];
  for (let n = NUMERO_MIN; n <= NUMERO_MAX; n += 1) if (!tomados.has(n)) libres.push(n);
  return libres;
}

/**
 * Número propuesto al inscribir a un jugador.
 *
 * Primero se respeta el dorsal que ya trae su ficha —normalmente es el que usa
 * en los partidos y el que el niño va a pedir—, y sólo si está tomado se
 * ofrece el menor libre. Devuelve `null` cuando la categoría está llena.
 */
export function sugerirNumero(
  camisetas: Camiseta[],
  temporada: string,
  jugador: Jugador,
): number | null {
  const tomados = ocupacionDe(camisetas, temporada, jugador.categoria);
  const preferido = Number.parseInt(jugador.dorsal, 10);
  if (
    Number.isInteger(preferido) &&
    preferido >= NUMERO_MIN &&
    preferido <= NUMERO_MAX &&
    !tomados.has(preferido)
  ) {
    return preferido;
  }
  for (let n = NUMERO_MIN; n <= NUMERO_MAX; n += 1) if (!tomados.has(n)) return n;
  return null;
}

export function camisetaDe(
  camisetas: Camiseta[],
  jugadorId: string,
  temporada: string,
): Camiseta | undefined {
  return camisetas.find((c) => c.jugadorId === jugadorId && c.temporada === temporada);
}

/** Todo lo que ese jugador ha pedido, de la temporada más nueva a la más vieja. */
export function historialDe(camisetas: Camiseta[], jugadorId: string): Camiseta[] {
  return camisetas
    .filter((c) => c.jugadorId === jugadorId)
    .sort((a, b) => b.temporada.localeCompare(a.temporada));
}

/**
 * ¿Este pedido manda sobre el dorsal de la ficha del jugador?
 *
 * Sólo el de la temporada más nueva. Sin esta comprobación, corregir una
 * camiseta de hace dos años le cambiaría al niño el número que usa hoy.
 */
export function mandaSobreElDorsal(camisetas: Camiseta[], camiseta: Camiseta): boolean {
  return !camisetas.some(
    (c) =>
      c.jugadorId === camiseta.jugadorId &&
      c.id !== camiseta.id &&
      c.temporada > camiseta.temporada,
  );
}

/* ---------- Texto ---------- */

/**
 * Deja el nombre como se va a estampar: mayúsculas, sin espacios de sobra y
 * cortado al largo que entra en la espalda. Se aplica mientras se escribe, así
 * el entrenador ve exactamente lo que va a salir impreso y no se lleva la
 * sorpresa después.
 */
export function normalizarEstampado(texto: string): string {
  return texto.toUpperCase().replace(/\s+/g, " ").replace(/^\s/, "").slice(0, LARGO_ESTAMPADO);
}

/**
 * Otros niños de la misma categoría que eligieron el mismo nombre. No es un
 * error —hay dos Matías en casi toda escuela— pero hay que avisarlo antes de
 * mandar el pedido, o llegan dos camisetas iguales y nadie sabe cuál es cuál.
 */
export function estampadosRepetidos(
  camisetas: Camiseta[],
  camiseta: Camiseta,
): Camiseta[] {
  const nombre = camiseta.nombreEstampado.trim();
  if (!nombre) return [];
  return camisetas.filter(
    (c) =>
      c.id !== camiseta.id &&
      c.temporada === camiseta.temporada &&
      c.categoria === camiseta.categoria &&
      c.nombreEstampado.trim() === nombre,
  );
}

/* ---------- Validación ---------- */

export interface ProblemasCamiseta {
  jugadorId?: string;
  numero?: string;
  nombreEstampado?: string;
  talla?: string;
  precio?: string;
  abonado?: string;
}

/**
 * Revisa un pedido contra el resto. `camisetas` es la lista completa: la propia
 * se descarta por id, así la misma función sirve para inscribir y para editar.
 */
export function validarCamiseta(
  camiseta: Camiseta,
  camisetas: Camiseta[],
): ProblemasCamiseta {
  const problemas: ProblemasCamiseta = {};
  const otras = camisetas.filter((c) => c.id !== camiseta.id);

  if (!camiseta.jugadorId) {
    problemas.jugadorId = "Elija a qué jugador corresponde.";
  } else if (
    otras.some((c) => c.jugadorId === camiseta.jugadorId && c.temporada === camiseta.temporada)
  ) {
    problemas.jugadorId = `Este jugador ya tiene camiseta inscrita en la temporada ${camiseta.temporada}.`;
  }

  if (!Number.isInteger(camiseta.numero)) {
    problemas.numero = "Escriba un número entero.";
  } else if (camiseta.numero < NUMERO_MIN || camiseta.numero > NUMERO_MAX) {
    problemas.numero = `El número va del ${NUMERO_MIN} al ${NUMERO_MAX}.`;
  } else {
    const dueno = otras.find(
      (c) =>
        c.temporada === camiseta.temporada &&
        c.categoria === camiseta.categoria &&
        c.numero === camiseta.numero,
    );
    if (dueno) {
      problemas.numero = `El ${camiseta.numero} ya está tomado en ${camiseta.categoria} (${
        dueno.nombreEstampado || "otro jugador"
      }).`;
    }
  }

  const estampado = camiseta.nombreEstampado.trim();
  if (!estampado) {
    problemas.nombreEstampado = "Escriba el nombre que va estampado.";
  } else if (estampado.length > LARGO_ESTAMPADO) {
    problemas.nombreEstampado = `No puede pasar de ${LARGO_ESTAMPADO} caracteres.`;
  } else if (!ESTAMPADO_VALIDO.test(estampado)) {
    problemas.nombreEstampado = "Sólo letras, números, espacios, punto, guion y apóstrofo.";
  }

  if (!camiseta.talla) {
    problemas.talla = "Elija una talla.";
  } else if (!TALLAS.some((t) => t.id === camiseta.talla)) {
    problemas.talla = "Esa talla no está en el catálogo.";
  }

  if (!Number.isFinite(camiseta.precio) || camiseta.precio < 0) {
    problemas.precio = "El precio no puede ser negativo.";
  }

  if (!Number.isFinite(camiseta.abonado) || camiseta.abonado < 0) {
    problemas.abonado = "Lo abonado no puede ser negativo.";
  } else if (camiseta.abonado > camiseta.precio) {
    problemas.abonado = "Lo abonado no puede superar el precio.";
  }

  return problemas;
}

export function hayProblemas(problemas: ProblemasCamiseta): boolean {
  return Object.keys(problemas).length > 0;
}

/* ---------- Resumen del pedido ---------- */

export interface ResumenPedido {
  inscritos: number;
  pagados: number;
  abonados: number;
  pendientes: number;
  entregadas: number;
  /** Suma de los precios: lo que vale el pedido completo. */
  total: number;
  recaudado: number;
  porCobrar: number;
  porTalla: { talla: string; cantidad: number }[];
  porCategoria: { categoria: string; cantidad: number }[];
}

export function resumenPedido(camisetas: Camiseta[]): ResumenPedido {
  const porTalla = new Map<string, number>();
  const porCategoria = new Map<string, number>();
  const resumen: ResumenPedido = {
    inscritos: camisetas.length,
    pagados: 0,
    abonados: 0,
    pendientes: 0,
    entregadas: 0,
    total: 0,
    recaudado: 0,
    porCobrar: 0,
    porTalla: [],
    porCategoria: [],
  };

  for (const c of camisetas) {
    const estado = estadoPago(c);
    if (estado === "pagado") resumen.pagados += 1;
    else if (estado === "abonado") resumen.abonados += 1;
    else resumen.pendientes += 1;
    if (c.entregada) resumen.entregadas += 1;
    resumen.total += c.precio;
    resumen.recaudado += c.abonado;
    resumen.porCobrar += saldoDe(c);
    porTalla.set(c.talla, (porTalla.get(c.talla) ?? 0) + 1);
    porCategoria.set(c.categoria, (porCategoria.get(c.categoria) ?? 0) + 1);
  }

  // Las tallas se ordenan como el catálogo y no alfabéticamente: el proveedor
  // espera 4, 6, 8, 10 y no 10, 12, 14, 4.
  const orden = TALLAS.map((t) => t.id);
  resumen.porTalla = [...porTalla.entries()]
    .map(([talla, cantidad]) => ({ talla, cantidad }))
    .sort((a, b) => orden.indexOf(a.talla) - orden.indexOf(b.talla));
  resumen.porCategoria = [...porCategoria.entries()]
    .map(([categoria, cantidad]) => ({ categoria, cantidad }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria, "es", { numeric: true }));

  return resumen;
}

/* ---------- Creación ---------- */

/** Camiseta en blanco para un jugador, con el número ya propuesto. */
export function nuevaCamiseta(
  jugador: Jugador,
  temporada: string,
  camisetas: Camiseta[],
  precioSugerido: number,
): Camiseta {
  const ahora = new Date().toISOString();
  return {
    id: nuevoId("cam"),
    jugadorId: jugador.id,
    temporada,
    categoria: jugador.categoria,
    numero: sugerirNumero(camisetas, temporada, jugador) ?? NUMERO_MIN,
    nombreEstampado: normalizarEstampado(jugador.nombre),
    talla: "",
    precio: precioSugerido,
    abonado: 0,
    medioPago: "",
    fechaPago: "",
    comprobante: "",
    entregada: false,
    fechaEntrega: "",
    notas: "",
    creadaEn: ahora,
    actualizadaEn: ahora,
  };
}

function moda(camisetas: Camiseta[], temporada: string): number {
  const cuenta = new Map<number, number>();
  for (const c of camisetas) {
    if (c.temporada === temporada && c.precio > 0) {
      cuenta.set(c.precio, (cuenta.get(c.precio) ?? 0) + 1);
    }
  }
  let habitual = 0;
  let veces = 0;
  for (const [precio, n] of cuenta) {
    if (n > veces) {
      habitual = precio;
      veces = n;
    }
  }
  return habitual;
}

/**
 * Precio que se propone al inscribir: el que más se repite en la temporada.
 *
 * Se usa la moda y no el último cargado porque una beca o un precio especial no
 * tiene por qué arrastrar al siguiente niño. Y cuando la temporada recién parte
 * —no hay ninguna camiseta todavía— se hereda el de la última que sí tuvo
 * precios: dejarlo en cero haría que el primer pedido del año naciera entero
 * como «pagado», que es exactamente lo que no debe pasar.
 */
export function precioHabitual(camisetas: Camiseta[], temporada: string): number {
  const propio = moda(camisetas, temporada);
  if (propio > 0) return propio;
  for (const anterior of temporadasDe(camisetas)) {
    if (anterior === temporada) continue;
    const heredado = moda(camisetas, anterior);
    if (heredado > 0) return heredado;
  }
  return 0;
}

/** Camiseta que el club regala o cubre: no hay nada que cobrar. */
export function sinCosto(camiseta: Camiseta): boolean {
  return camiseta.precio === 0;
}
