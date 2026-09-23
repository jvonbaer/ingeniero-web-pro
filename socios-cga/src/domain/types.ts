/**
 * Modelo de datos del registro de socios del Club Gimnástico Alemán.
 *
 * La idea de fondo: **una sola tabla de personas**. Un niño de la escuela de
 * fútbol, su madre que paga la cuota y el socio vitalicio que juega tenis son
 * todos `Persona`. Lo que los distingue no es su tabla, sino sus relaciones:
 *
 *   Persona  --Vinculo-->  Persona        quién responde y quién paga por quién
 *   Persona  --Inscripcion-->  Plan       en qué está inscrito y a qué precio
 *   Inscripcion  --Pago-->                qué períodos están pagados
 *
 * Así el cruce que pide el club sale solo: desde el niño se llega a los padres,
 * desde el padre se llega a todos los hijos y a todo lo que debe pagar, y desde
 * un plan se llega a todos los inscritos. Si los menores vivieran en una tabla
 * y los apoderados en otra, cada consulta cruzada habría que programarla aparte.
 */

/**
 * Huella de auditoría. La escribe la base de datos, no la aplicación: los
 * disparadores de supabase/schema.sql sacan el nombre del token de la sesión,
 * así que estos campos se leen y no se envían. Son opcionales porque un
 * registro recién armado en pantalla todavía no los tiene.
 */
export interface Huella {
  creadoEn?: string;
  creadoPor?: string;
  actualizadoEn?: string;
  actualizadoPor?: string;
}

/** Ramas deportivas del club. `club` es lo institucional (cuota de socio). */
export type Rama = "club" | "futbol" | "outdoor" | "tenis" | "natacion";

export type TipoPlan = "socio" | "rama" | "escuela" | "actividad";

export type Periodicidad = "mensual" | "trimestral" | "semestral" | "anual" | "unico";

export type TipoVinculo =
  | "madre"
  | "padre"
  | "apoderado"
  | "tutor"
  | "conyuge"
  | "hermano"
  | "otro";

export type CanalAviso = "correo" | "whatsapp" | "ambos";

export type EstadoInscripcion = "activa" | "suspendida" | "terminada";

export type MedioPago =
  | "transferencia"
  | "efectivo"
  | "tarjeta"
  | "webpay"
  | "descuento"
  | "otro";

export type ConceptoPago = "cuota" | "matricula" | "actividad" | "otro";

export type CategoriaSocio = "activo" | "cooperador" | "vitalicio" | "honorario" | "";

/**
 * Una persona: socio, deportista, alumno de escuela, apoderado o pagador.
 * Los campos de salud y emergencia se piden sobre todo para los menores, pero
 * viven en la misma ficha porque un adulto que corre trail también los necesita.
 */
export interface Persona extends Huella {
  id: string;
  /** RUT normalizado `12345678-9`. Vacío para extranjeros sin RUT. */
  rut: string;
  /** Pasaporte o documento del país de origen, cuando no hay RUT. */
  documento: string;
  nombres: string;
  apellidos: string;
  /** ISO `aaaa-mm-dd`. De acá sale la edad y si es menor de edad. */
  fechaNacimiento: string;
  sexo: "F" | "M" | "X" | "";
  email: string;
  /** Formato `+569xxxxxxxx`; es el que usan los avisos por WhatsApp. */
  telefono: string;
  direccion: string;
  comuna: string;

  /** Condición de socio del club, independiente de las ramas donde participe. */
  socio: boolean;
  numeroSocio: string;
  categoriaSocio: CategoriaSocio;
  fechaIngreso: string;

  contactoEmergencia: string;
  telefonoEmergencia: string;
  observacionesSalud: string;
  prevision: string;
  /** Autorización para publicar fotos. Obligatoria de registrar en menores. */
  autorizaImagen: boolean;

  activo: boolean;
  notas: string;
}

/**
 * El cruce entre una persona y el adulto que responde por ella.
 *
 * `pagador` es lo que conecta a quien practica con quien paga: la inscripción
 * guarda a quién se le cobra, y este vínculo explica por qué.
 */
export interface Vinculo extends Huella {
  id: string;
  /** El deportista, socio o alumno. */
  personaId: string;
  /** El adulto responsable. */
  adultoId: string;
  tipo: TipoVinculo;
  pagador: boolean;
  contactoPrincipal: boolean;
  notas: string;
}

export interface Horario {
  /** 1 = lunes … 7 = domingo. */
  dia: number;
  desde: string;
  hasta: string;
  lugar: string;
}

/** Porcentajes de descuento que el club aplica sobre el valor del plan. */
export interface Descuentos {
  hermanos: number;
  socio: number;
  pagoAnual: number;
}

/**
 * Un plan: la cuota de socio, la mensualidad de una rama, el arancel de una
 * escuela o el valor de una actividad puntual (un campeonato, una salida a la
 * montaña). Todos comparten estructura; lo que cambia es `tipo` y la
 * `periodicidad`, que en las actividades es `unico`.
 */
export interface Plan extends Huella {
  id: string;
  nombre: string;
  tipo: TipoPlan;
  rama: Rama;
  /** Valor de cada período, en pesos. */
  valor: number;
  /** Matrícula o inscripción que se paga una sola vez al entrar. */
  matricula: number;
  periodicidad: Periodicidad;
  /** Máximo de inscritos. `null` = sin tope. */
  cupos: number | null;
  vigenciaDesde: string;
  vigenciaHasta: string;
  /** Texto libre: qué incluye, reglas de asistencia, implementos, congelamiento. */
  condiciones: string;
  requisitos: string;
  descuentos: Descuentos;
  horarios: Horario[];
  edadMinima: number | null;
  edadMaxima: number | null;
  activo: boolean;
  notas: string;
}

/**
 * La inscripción de una persona en un plan.
 *
 * `valor` y `periodicidad` son una **copia** de los del plan al momento de
 * inscribir, no una referencia. Es deliberado: cuando el club sube la
 * mensualidad en marzo, quien se inscribió en enero conserva lo que se le
 * prometió hasta que alguien decida cambiárselo a mano.
 */
export interface Inscripcion extends Huella {
  id: string;
  personaId: string;
  planId: string;
  /** A quién se le cobra. Puede ser la misma persona si es adulto. */
  pagadorId: string;
  fechaInicio: string;
  /** Vacío mientras siga vigente. */
  fechaTermino: string;
  valor: number;
  descuentoMotivo: string;
  periodicidad: Periodicidad;
  estado: EstadoInscripcion;
  canalAviso: CanalAviso;
  /** Cuántos días antes del vencimiento avisar. El club pidió 5 como mínimo. */
  diasAviso: number;
  matriculaPagada: boolean;
  notas: string;
}

/**
 * Un pago recibido. Cubre un período concreto (`periodoDesde` → `periodoHasta`),
 * y de ahí sale el próximo vencimiento: no se guarda una fecha de vencimiento
 * suelta que haya que recordar actualizar, se deduce de lo que está pagado.
 */
export interface Pago extends Huella {
  id: string;
  inscripcionId: string;
  /** Quién pagó. Normalmente el pagador de la inscripción. */
  personaId: string;
  monto: number;
  fecha: string;
  periodoDesde: string;
  periodoHasta: string;
  medio: MedioPago;
  concepto: ConceptoPago;
  comprobante: string;
  registradoPor: string;
  notas: string;
}

/** Registro de los avisos de renovación ya enviados, para no repetirlos. */
export interface Aviso {
  id: string;
  inscripcionId: string;
  /** Vencimiento al que corresponde el aviso. */
  vence: string;
  canal: CanalAviso | "manual";
  destino: string;
  enviadoEn: string;
  estado: "enviado" | "error" | "manual";
  detalle: string;
}

export type AccionBitacora = "creó" | "modificó" | "eliminó";

/**
 * Una línea de la bitácora: quién hizo qué, sobre qué registro y cuándo.
 * En la base compartida la escriben los disparadores y no se puede corregir ni
 * borrar desde la aplicación; en el modo de este computador la escribe el
 * propio programa, con el nombre que se haya configurado.
 */
export interface EntradaBitacora {
  id: string;
  ocurridoEn: string;
  usuario: string;
  accion: AccionBitacora;
  tabla: string;
  registroId: string;
  descripcion: string;
  /** Campo por campo, lo que había antes y lo que quedó después. */
  cambios: Record<string, { antes: unknown; despues: unknown }> | null;
}

export const TABLAS_BITACORA: { id: string; nombre: string }[] = [
  { id: "personas", nombre: "Personas" },
  { id: "vinculos", nombre: "Vínculos" },
  { id: "planes", nombre: "Planes" },
  { id: "inscripciones", nombre: "Inscripciones" },
  { id: "pagos", nombre: "Pagos" },
];

/** Nombre legible de un campo, para no mostrar `periodo_hasta` en pantalla. */
const CAMPOS: Record<string, string> = {
  activo: "Participa en el club",
  apellidos: "Apellidos",
  autoriza_imagen: "Autoriza imagen",
  canal_aviso: "Canal del aviso",
  categoria_socio: "Categoría de socio",
  comprobante: "Comprobante",
  comuna: "Comuna",
  concepto: "Concepto",
  condiciones: "Condiciones",
  contacto_emergencia: "Contacto de emergencia",
  contacto_principal: "Contacto principal",
  cupos: "Cupos",
  descuento_motivo: "Descuento",
  descuentos: "Descuentos",
  direccion: "Dirección",
  dias_aviso: "Días de aviso",
  documento: "Documento",
  edad_maxima: "Edad máxima",
  edad_minima: "Edad mínima",
  email: "Correo",
  estado: "Estado",
  fecha: "Fecha",
  fecha_inicio: "Fecha de inicio",
  fecha_ingreso: "Fecha de ingreso",
  fecha_nacimiento: "Fecha de nacimiento",
  fecha_termino: "Fecha de término",
  horarios: "Horarios",
  matricula: "Matrícula",
  matricula_pagada: "Matrícula pagada",
  medio: "Medio de pago",
  monto: "Monto",
  nombre: "Nombre",
  nombres: "Nombres",
  notas: "Notas",
  numero_socio: "Número de socio",
  observaciones_salud: "Observaciones de salud",
  pagador: "Es quien paga",
  pagador_id: "Pagador",
  periodicidad: "Periodicidad",
  periodo_desde: "Período desde",
  periodo_hasta: "Período hasta",
  plan_id: "Plan",
  prevision: "Previsión",
  registrado_por: "Recibido por",
  requisitos: "Requisitos",
  rut: "RUT",
  sexo: "Sexo",
  socio: "Es socio",
  telefono: "Teléfono",
  telefono_emergencia: "Teléfono de emergencia",
  tipo: "Tipo",
  valor: "Valor",
  vigencia_desde: "Vigente desde",
  vigencia_hasta: "Vigente hasta",
};

export function nombreCampo(campo: string): string {
  return CAMPOS[campo] ?? campo.replace(/_/g, " ");
}

export function nombreTabla(tabla: string): string {
  // «sistema» no es una tabla: son los movimientos que tocan todo de una vez,
  // como cargar un respaldo o vaciar la base. No se ofrece como filtro, pero
  // tiene que leerse bien cuando aparece en la lista.
  if (tabla === "sistema") return "el sistema";
  return TABLAS_BITACORA.find((t) => t.id === tabla)?.nombre ?? tabla;
}

export interface Backup {
  formato: "cga-socios";
  version: 1;
  exportadoEn: string;
  personas: Persona[];
  vinculos: Vinculo[];
  planes: Plan[];
  inscripciones: Inscripcion[];
  pagos: Pago[];
  avisos: Aviso[];
}

export const RAMAS: { id: Rama; nombre: string }[] = [
  { id: "club", nombre: "Club (institucional)" },
  { id: "futbol", nombre: "Fútbol" },
  { id: "outdoor", nombre: "Outdoor & Trail" },
  { id: "tenis", nombre: "Tenis" },
  { id: "natacion", nombre: "Natación" },
];

export const TIPOS_PLAN: { id: TipoPlan; nombre: string; ayuda: string }[] = [
  { id: "socio", nombre: "Cuota de socio", ayuda: "Membresía del club" },
  { id: "rama", nombre: "Rama deportiva", ayuda: "Participación regular en una rama" },
  { id: "escuela", nombre: "Escuela deportiva", ayuda: "Formativa, con matrícula y arancel" },
  { id: "actividad", nombre: "Actividad puntual", ayuda: "Campeonato, salida, clínica" },
];

export const PERIODICIDADES: { id: Periodicidad; nombre: string; meses: number }[] = [
  { id: "mensual", nombre: "Mensual", meses: 1 },
  { id: "trimestral", nombre: "Trimestral", meses: 3 },
  { id: "semestral", nombre: "Semestral", meses: 6 },
  { id: "anual", nombre: "Anual", meses: 12 },
  { id: "unico", nombre: "Pago único", meses: 0 },
];

export const TIPOS_VINCULO: { id: TipoVinculo; nombre: string }[] = [
  { id: "madre", nombre: "Madre" },
  { id: "padre", nombre: "Padre" },
  { id: "apoderado", nombre: "Apoderado/a" },
  { id: "tutor", nombre: "Tutor/a legal" },
  { id: "conyuge", nombre: "Cónyuge o pareja" },
  { id: "hermano", nombre: "Hermano/a" },
  { id: "otro", nombre: "Otro" },
];

export const MEDIOS_PAGO: { id: MedioPago; nombre: string }[] = [
  { id: "transferencia", nombre: "Transferencia" },
  { id: "efectivo", nombre: "Efectivo" },
  { id: "tarjeta", nombre: "Tarjeta" },
  { id: "webpay", nombre: "Webpay / link de pago" },
  { id: "descuento", nombre: "Descuento por planilla" },
  { id: "otro", nombre: "Otro" },
];

export const DIAS_SEMANA = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function nombreCompleto(p: Persona | undefined | null): string {
  if (!p) return "—";
  return `${p.nombres} ${p.apellidos}`.trim() || "Sin nombre";
}

export function nombreRama(rama: Rama): string {
  return RAMAS.find((r) => r.id === rama)?.nombre ?? rama;
}

export function nombrePeriodicidad(p: Periodicidad): string {
  return PERIODICIDADES.find((x) => x.id === p)?.nombre ?? p;
}

export function mesesDe(p: Periodicidad): number {
  return PERIODICIDADES.find((x) => x.id === p)?.meses ?? 1;
}
