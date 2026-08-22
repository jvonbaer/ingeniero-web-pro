import type {
  CategoriaRubrica,
  Configuracion,
  Evaluacion,
  Jugador,
  Nivel,
  Pauta,
  ResultadoCategoria,
  ResultadoEvaluacion,
} from "./types";

/** Escala de niveles. El corte se lee de mayor a menor. */
export const NIVELES: Nivel[] = [
  { id: "excelente", etiqueta: "Excelente", min: 90 },
  { id: "avanzado", etiqueta: "Avanzado", min: 75 },
  { id: "intermedio", etiqueta: "Intermedio", min: 60 },
  { id: "desarrollo", etiqueta: "En desarrollo", min: 40 },
  { id: "inicial", etiqueta: "Inicial", min: 0 },
];

export function nivelDe(puntaje: number | null): Nivel | null {
  if (puntaje === null || Number.isNaN(puntaje)) return null;
  return NIVELES.find((n) => puntaje >= n.min) ?? NIVELES[NIVELES.length - 1];
}

/** Convierte un valor de la escala (1..escalaMax) a puntaje 0-100. */
export function aCien(valor: number, escalaMax: number): number {
  if (escalaMax <= 0) return 0;
  return (valor / escalaMax) * 100;
}

export function indicadoresActivos(categoria: CategoriaRubrica) {
  return categoria.indicadores.filter((i) => i.activo);
}

/**
 * Calcula el puntaje de una categoría promediando sólo los indicadores
 * respondidos. Si el entrenador deja preguntas en blanco, la categoría se
 * calcula con lo que sí contestó en vez de castigar el promedio con ceros.
 */
export function puntajeCategoria(
  evaluacion: Evaluacion,
  categoria: CategoriaRubrica,
): { puntaje: number | null; respondidos: number; total: number } {
  const activos = indicadoresActivos(categoria);
  const escala = evaluacion.escalaMax || 5;
  let suma = 0;
  let respondidos = 0;

  for (const ind of activos) {
    const valor = evaluacion.puntajes[ind.id];
    if (typeof valor === "number" && valor > 0) {
      suma += aCien(valor, escala);
      respondidos += 1;
    }
  }

  return {
    puntaje: respondidos === 0 ? null : Math.round(suma / respondidos),
    respondidos,
    total: activos.length,
  };
}

/**
 * Resultado completo de una evaluación medida contra una pauta.
 *
 * Los sub-puntos que la evaluación trae pero que no existen en la pauta se
 * ignoran; los que existen y no fueron respondidos no penalizan. De ahí que una
 * evaluación de hace un año —o levantada con otra pauta— siga siendo comparable
 * con la de hoy: se la vuelve a medir contra la pauta con la que se está
 * mirando, y cada eje se promedia con lo que sí tiene.
 */
export function calcular(
  evaluacion: Evaluacion,
  pauta: Pauta,
): ResultadoEvaluacion {
  const categorias: ResultadoCategoria[] = pauta.categorias.map((cat) => {
    const { puntaje, respondidos, total } = puntajeCategoria(evaluacion, cat);
    return {
      categoriaId: cat.id,
      nombre: cat.nombre,
      icono: cat.icono,
      descripcion: cat.descripcion,
      puntaje,
      respondidos,
      total,
      nivel: nivelDe(puntaje),
    };
  });

  let sumaPonderada = 0;
  let sumaPesos = 0;
  for (const cat of pauta.categorias) {
    const res = categorias.find((c) => c.categoriaId === cat.id);
    if (res && res.puntaje !== null) {
      const peso = cat.peso > 0 ? cat.peso : 1;
      sumaPonderada += res.puntaje * peso;
      sumaPesos += peso;
    }
  }

  const general = sumaPesos === 0 ? null : Math.round(sumaPonderada / sumaPesos);

  const totalPreguntas = categorias.reduce((a, c) => a + c.total, 0);
  const totalRespondidas = categorias.reduce((a, c) => a + c.respondidos, 0);

  return {
    evaluacion,
    categorias,
    general,
    nivel: nivelDe(general),
    completitud: totalPreguntas === 0 ? 0 : totalRespondidas / totalPreguntas,
  };
}

/* ---------- Resolución de pautas ---------- */

/**
 * Pauta que le corresponde a una categoría de edad. Esto es lo que hace
 * automática la selección: la aplicación no le pregunta al entrenador qué pauta
 * usar, la deduce de la categoría del jugador.
 */
export function pautaDeCategoria(configuracion: Configuracion, categoria: string): Pauta {
  const id = configuracion.asignaciones[categoria] ?? configuracion.pautaPorDefecto;
  return (
    configuracion.pautas.find((p) => p.id === id) ??
    configuracion.pautas.find((p) => p.id === configuracion.pautaPorDefecto) ??
    configuracion.pautas[0]
  );
}

/**
 * Pauta con la que se debe leer una evaluación ya registrada: la que quedó
 * guardada en ella. Si esa pauta se eliminó, se cae a la de la categoría actual
 * del jugador, que es lo más parecido que hay.
 */
export function pautaDeEvaluacion(
  configuracion: Configuracion,
  evaluacion: Evaluacion,
  jugador?: Jugador,
): Pauta {
  const propia = configuracion.pautas.find((p) => p.id === evaluacion.pautaId);
  if (propia) return propia;
  return pautaDeCategoria(configuracion, jugador?.categoria ?? "");
}

export function pautaPorId(configuracion: Configuracion, id: string): Pauta | undefined {
  return configuracion.pautas.find((p) => p.id === id);
}

/** Categorías de edad que hoy apuntan a una pauta. */
export function categoriasDePauta(configuracion: Configuracion, pautaId: string): string[] {
  return Object.entries(configuracion.asignaciones)
    .filter(([, id]) => id === pautaId)
    .map(([categoria]) => categoria);
}

/** Evaluaciones de un jugador, de la más reciente a la más antigua. */
export function historial(
  evaluaciones: Evaluacion[],
  jugadorId: string,
  soloFinalizadas = true,
): Evaluacion[] {
  return evaluaciones
    .filter((e) => e.jugadorId === jugadorId)
    .filter((e) => (soloFinalizadas ? e.estado === "finalizada" : true))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
}

export function delta(actual: number | null, previo: number | null): number | null {
  if (actual === null || previo === null) return null;
  return actual - previo;
}

export function formatoDelta(d: number | null): string {
  if (d === null) return "—";
  if (d === 0) return "=";
  return d > 0 ? `+${d}` : `${d}`;
}

export function claseDelta(d: number | null): string {
  if (d === null || d === 0) return "delta delta--igual";
  return d > 0 ? "delta delta--sube" : "delta delta--baja";
}

/* ---------- Utilidades de jugador ---------- */

export function nombreCompleto(j: Jugador): string {
  return `${j.nombre} ${j.apellido}`.trim();
}

export function iniciales(j: Jugador): string {
  return `${j.nombre.charAt(0)}${j.apellido.charAt(0)}`.toUpperCase();
}

export function edadEn(fechaNacimiento: string, referencia: string): number | null {
  if (!fechaNacimiento) return null;
  const nac = new Date(`${fechaNacimiento}T00:00:00`);
  const ref = new Date(`${referencia}T00:00:00`);
  if (Number.isNaN(nac.getTime()) || Number.isNaN(ref.getTime())) return null;
  let edad = ref.getFullYear() - nac.getFullYear();
  const m = ref.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < nac.getDate())) edad -= 1;
  return edad;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function fechaLarga(iso: string): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return iso;
  return `${d} de ${MESES[m - 1]}, ${a}`;
}

/** "20 MAY 2024" — formato corto para la leyenda del gráfico. */
export function fechaCompacta(iso: string): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return iso;
  return `${d} ${MESES[m - 1].slice(0, 3).toUpperCase()} ${a}`;
}

export function fechaCorta(iso: string): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function hoyISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function temporadaDe(iso: string): string {
  return (iso || hoyISO()).slice(0, 4);
}

/**
 * Código de seguimiento: CGA-F-<año de nacimiento, 2 dígitos>-<correlativo>.
 * Se calcula sobre los códigos existentes para no repetir.
 */
export function generarCodigo(fechaNacimiento: string, existentes: string[]): string {
  const anio = fechaNacimiento ? fechaNacimiento.slice(2, 4) : "00";
  const prefijo = `CGA-F-${anio}-`;
  const usados = existentes
    .filter((c) => c.startsWith(prefijo))
    .map((c) => Number.parseInt(c.slice(prefijo.length), 10))
    .filter((n) => !Number.isNaN(n));
  const siguiente = (usados.length ? Math.max(...usados) : 0) + 1;
  return `${prefijo}${String(siguiente).padStart(3, "0")}`;
}

export function nuevoId(prefijo: string): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefijo}_${Date.now().toString(36)}${rnd}`;
}
