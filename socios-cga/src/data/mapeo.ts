/**
 * Traducción entre los objetos de la aplicación y las filas de PostgreSQL.
 *
 * En la base las columnas son de verdad —`rut`, `fecha_nacimiento`, `monto`— y
 * no un bloque JSON opaco. Cuesta este archivo de ida y vuelta, y a cambio la
 * secretaría del club puede abrir la tabla en Supabase, ordenar por apellido,
 * corregir un teléfono o bajar un CSV sin que nadie le explique nada, que era
 * justamente lo que se pidió: datos de fácil manejo.
 *
 * Dos detalles que se repiten:
 *   · Las fechas vacías viajan como `null`; PostgreSQL rechaza `''` en `date`.
 *   · Al leer, todo campo de texto ausente vuelve como `""`, para que los
 *     formularios de React nunca reciban `null` y salten a modo no controlado.
 */
import type { Aviso, Inscripcion, Pago, Persona, Plan, Vinculo } from "../domain/types";

type Fila = Record<string, unknown>;

const t = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const n = (v: unknown): number => (typeof v === "number" ? v : Number(v) || 0);
const b = (v: unknown): boolean => v === true;
/** Fecha vacía → null, para las columnas `date` de PostgreSQL. */
const f = (v: string): string | null => (v ? v : null);

export const personas = {
  aFila(p: Persona): Fila {
    return {
      id: p.id,
      rut: p.rut || null,
      documento: p.documento,
      nombres: p.nombres,
      apellidos: p.apellidos,
      fecha_nacimiento: f(p.fechaNacimiento),
      sexo: p.sexo,
      email: p.email,
      telefono: p.telefono,
      direccion: p.direccion,
      comuna: p.comuna,
      socio: p.socio,
      numero_socio: p.numeroSocio,
      categoria_socio: p.categoriaSocio,
      fecha_ingreso: f(p.fechaIngreso),
      contacto_emergencia: p.contactoEmergencia,
      telefono_emergencia: p.telefonoEmergencia,
      observaciones_salud: p.observacionesSalud,
      prevision: p.prevision,
      autoriza_imagen: p.autorizaImagen,
      activo: p.activo,
      notas: p.notas,
      creado_en: p.creadoEn || new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    };
  },
  deFila(r: Fila): Persona {
    return {
      id: t(r.id),
      rut: t(r.rut),
      documento: t(r.documento),
      nombres: t(r.nombres),
      apellidos: t(r.apellidos),
      fechaNacimiento: t(r.fecha_nacimiento),
      sexo: t(r.sexo) as Persona["sexo"],
      email: t(r.email),
      telefono: t(r.telefono),
      direccion: t(r.direccion),
      comuna: t(r.comuna),
      socio: b(r.socio),
      numeroSocio: t(r.numero_socio),
      categoriaSocio: t(r.categoria_socio) as Persona["categoriaSocio"],
      fechaIngreso: t(r.fecha_ingreso),
      contactoEmergencia: t(r.contacto_emergencia),
      telefonoEmergencia: t(r.telefono_emergencia),
      observacionesSalud: t(r.observaciones_salud),
      prevision: t(r.prevision),
      autorizaImagen: b(r.autoriza_imagen),
      activo: b(r.activo),
      notas: t(r.notas),
      creadoEn: t(r.creado_en),
      actualizadoEn: t(r.actualizado_en),
    };
  },
};

export const vinculos = {
  aFila(v: Vinculo): Fila {
    return {
      id: v.id,
      persona_id: v.personaId,
      adulto_id: v.adultoId,
      tipo: v.tipo,
      pagador: v.pagador,
      contacto_principal: v.contactoPrincipal,
      notas: v.notas,
    };
  },
  deFila(r: Fila): Vinculo {
    return {
      id: t(r.id),
      personaId: t(r.persona_id),
      adultoId: t(r.adulto_id),
      tipo: t(r.tipo) as Vinculo["tipo"],
      pagador: b(r.pagador),
      contactoPrincipal: b(r.contacto_principal),
      notas: t(r.notas),
    };
  },
};

export const planes = {
  aFila(p: Plan): Fila {
    return {
      id: p.id,
      nombre: p.nombre,
      tipo: p.tipo,
      rama: p.rama,
      valor: p.valor,
      matricula: p.matricula,
      periodicidad: p.periodicidad,
      cupos: p.cupos,
      vigencia_desde: f(p.vigenciaDesde),
      vigencia_hasta: f(p.vigenciaHasta),
      condiciones: p.condiciones,
      requisitos: p.requisitos,
      descuentos: p.descuentos,
      horarios: p.horarios,
      edad_minima: p.edadMinima,
      edad_maxima: p.edadMaxima,
      activo: p.activo,
      notas: p.notas,
      actualizado_en: new Date().toISOString(),
    };
  },
  deFila(r: Fila): Plan {
    const d = (r.descuentos ?? {}) as Partial<Plan["descuentos"]>;
    return {
      id: t(r.id),
      nombre: t(r.nombre),
      tipo: t(r.tipo) as Plan["tipo"],
      rama: t(r.rama) as Plan["rama"],
      valor: n(r.valor),
      matricula: n(r.matricula),
      periodicidad: t(r.periodicidad) as Plan["periodicidad"],
      cupos: r.cupos == null ? null : n(r.cupos),
      vigenciaDesde: t(r.vigencia_desde),
      vigenciaHasta: t(r.vigencia_hasta),
      condiciones: t(r.condiciones),
      requisitos: t(r.requisitos),
      descuentos: {
        hermanos: n(d.hermanos),
        socio: n(d.socio),
        pagoAnual: n(d.pagoAnual),
      },
      horarios: Array.isArray(r.horarios) ? (r.horarios as Plan["horarios"]) : [],
      edadMinima: r.edad_minima == null ? null : n(r.edad_minima),
      edadMaxima: r.edad_maxima == null ? null : n(r.edad_maxima),
      activo: b(r.activo),
      notas: t(r.notas),
    };
  },
};

export const inscripciones = {
  aFila(i: Inscripcion): Fila {
    return {
      id: i.id,
      persona_id: i.personaId,
      plan_id: i.planId,
      pagador_id: i.pagadorId,
      fecha_inicio: f(i.fechaInicio),
      fecha_termino: f(i.fechaTermino),
      valor: i.valor,
      descuento_motivo: i.descuentoMotivo,
      periodicidad: i.periodicidad,
      estado: i.estado,
      canal_aviso: i.canalAviso,
      dias_aviso: i.diasAviso,
      matricula_pagada: i.matriculaPagada,
      notas: i.notas,
      creado_en: i.creadoEn || new Date().toISOString(),
    };
  },
  deFila(r: Fila): Inscripcion {
    return {
      id: t(r.id),
      personaId: t(r.persona_id),
      planId: t(r.plan_id),
      pagadorId: t(r.pagador_id),
      fechaInicio: t(r.fecha_inicio),
      fechaTermino: t(r.fecha_termino),
      valor: n(r.valor),
      descuentoMotivo: t(r.descuento_motivo),
      periodicidad: t(r.periodicidad) as Inscripcion["periodicidad"],
      estado: t(r.estado) as Inscripcion["estado"],
      canalAviso: t(r.canal_aviso) as Inscripcion["canalAviso"],
      diasAviso: n(r.dias_aviso),
      matriculaPagada: b(r.matricula_pagada),
      notas: t(r.notas),
      creadoEn: t(r.creado_en),
    };
  },
};

export const pagos = {
  aFila(p: Pago): Fila {
    return {
      id: p.id,
      inscripcion_id: p.inscripcionId,
      persona_id: p.personaId,
      monto: p.monto,
      fecha: f(p.fecha),
      periodo_desde: f(p.periodoDesde),
      periodo_hasta: f(p.periodoHasta),
      medio: p.medio,
      concepto: p.concepto,
      comprobante: p.comprobante,
      registrado_por: p.registradoPor,
      notas: p.notas,
      creado_en: p.creadoEn || new Date().toISOString(),
    };
  },
  deFila(r: Fila): Pago {
    return {
      id: t(r.id),
      inscripcionId: t(r.inscripcion_id),
      personaId: t(r.persona_id),
      monto: n(r.monto),
      fecha: t(r.fecha),
      periodoDesde: t(r.periodo_desde),
      periodoHasta: t(r.periodo_hasta),
      medio: t(r.medio) as Pago["medio"],
      concepto: t(r.concepto) as Pago["concepto"],
      comprobante: t(r.comprobante),
      registradoPor: t(r.registrado_por),
      notas: t(r.notas),
      creadoEn: t(r.creado_en),
    };
  },
};

export const avisos = {
  aFila(a: Aviso): Fila {
    return {
      id: a.id,
      inscripcion_id: a.inscripcionId,
      vence: f(a.vence),
      canal: a.canal,
      destino: a.destino,
      enviado_en: a.enviadoEn || new Date().toISOString(),
      estado: a.estado,
      detalle: a.detalle,
    };
  },
  deFila(r: Fila): Aviso {
    return {
      id: t(r.id),
      inscripcionId: t(r.inscripcion_id),
      vence: t(r.vence),
      canal: t(r.canal) as Aviso["canal"],
      destino: t(r.destino),
      enviadoEn: t(r.enviado_en),
      estado: t(r.estado) as Aviso["estado"],
      detalle: t(r.detalle),
    };
  },
};
