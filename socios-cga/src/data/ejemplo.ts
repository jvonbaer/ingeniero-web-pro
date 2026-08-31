/**
 * Datos de ejemplo para probar la aplicación sin escribir nada.
 *
 * Las fechas se calculan a partir del día en que se cargan, no están escritas a
 * mano: así el ejemplo siempre muestra un caso por vencer dentro de los cinco
 * días, uno ya vencido y varios al día, que es justo lo que hay que ver para
 * entender la pantalla de cobranzas.
 *
 * Retrata el cruce que pidió el club: dos hermanos en actividades distintas,
 * ambos con su madre como pagadora y su padre como segundo contacto.
 */
import { hoyISO, sumarDias, sumarMeses } from "../domain/fechas";
import type { Backup, Inscripcion, Pago, Persona, Plan, Vinculo } from "../domain/types";

const ahora = new Date().toISOString();

/** Los registros de ejemplo se firman como lo que son, no a nombre de nadie. */
const FIRMA = "datos de ejemplo";

function persona(p: Partial<Persona> & Pick<Persona, "id" | "nombres" | "apellidos">): Persona {
  return {
    rut: "",
    documento: "",
    fechaNacimiento: "",
    sexo: "",
    email: "",
    telefono: "",
    direccion: "",
    comuna: "Temuco",
    socio: false,
    numeroSocio: "",
    categoriaSocio: "",
    fechaIngreso: "",
    contactoEmergencia: "",
    telefonoEmergencia: "",
    observacionesSalud: "",
    prevision: "",
    autorizaImagen: false,
    activo: true,
    notas: "",
    creadoEn: ahora,
    creadoPor: FIRMA,
    actualizadoEn: ahora,
    actualizadoPor: FIRMA,
    ...p,
  };
}

/** Año de nacimiento para que la persona tenga hoy la edad indicada. */
function nacidoHace(años: number, mes: string): string {
  return `${new Date().getFullYear() - años}-${mes}`;
}

export function backupDeEjemplo(): Backup {
  const hoy = hoyISO();

  const personas: Persona[] = [
    persona({
      id: "per_ej_carolina",
      rut: "13456789-9",
      nombres: "Carolina",
      apellidos: "Meyer Ortiz",
      fechaNacimiento: nacidoHace(42, "04-18"),
      sexo: "F",
      email: "carolina.meyer@ejemplo.cl",
      telefono: "+56 9 8123 4567",
      direccion: "Av. Alemania 1234",
      socio: true,
      numeroSocio: "S-0412",
      categoriaSocio: "activo",
      fechaIngreso: "2016-03-01",
      autorizaImagen: true,
      notas: "Paga las actividades de sus dos hijos.",
    }),
    persona({
      id: "per_ej_rodrigo",
      rut: "12987654-9",
      nombres: "Rodrigo",
      apellidos: "Fuentes Lara",
      fechaNacimiento: nacidoHace(45, "09-02"),
      sexo: "M",
      email: "rodrigo.fuentes@ejemplo.cl",
      telefono: "+56 9 7654 3210",
      direccion: "Av. Alemania 1234",
    }),
    persona({
      id: "per_ej_emilia",
      rut: "24567890-8",
      nombres: "Emilia",
      apellidos: "Fuentes Meyer",
      fechaNacimiento: nacidoHace(9, "07-11"),
      sexo: "F",
      direccion: "Av. Alemania 1234",
      contactoEmergencia: "Carolina Meyer Ortiz",
      telefonoEmergencia: "+56 9 8123 4567",
      observacionesSalud: "Asma leve; usa inhalador antes de entrenar.",
      prevision: "Isapre",
      autorizaImagen: true,
    }),
    persona({
      id: "per_ej_tomas",
      rut: "23456789-6",
      nombres: "Tomás",
      apellidos: "Fuentes Meyer",
      fechaNacimiento: nacidoHace(12, "02-23"),
      sexo: "M",
      direccion: "Av. Alemania 1234",
      contactoEmergencia: "Carolina Meyer Ortiz",
      telefonoEmergencia: "+56 9 8123 4567",
      autorizaImagen: true,
    }),
    persona({
      id: "per_ej_patricia",
      rut: "14222333-3",
      nombres: "Patricia",
      apellidos: "Weber Ríos",
      fechaNacimiento: nacidoHace(48, "11-30"),
      sexo: "F",
      email: "patricia.weber@ejemplo.cl",
      telefono: "+56 9 9111 2222",
      comuna: "Padre Las Casas",
    }),
    persona({
      id: "per_ej_sofia",
      rut: "22111444-2",
      nombres: "Sofía",
      apellidos: "Kunstmann Weber",
      fechaNacimiento: nacidoHace(16, "05-08"),
      sexo: "F",
      comuna: "Padre Las Casas",
      contactoEmergencia: "Patricia Weber Ríos",
      telefonoEmergencia: "+56 9 9111 2222",
    }),
    persona({
      id: "per_ej_ignacio",
      rut: "16333222-1",
      nombres: "Ignacio",
      apellidos: "Bravo Sanhueza",
      fechaNacimiento: nacidoHace(35, "01-14"),
      sexo: "M",
      email: "ignacio.bravo@ejemplo.cl",
      telefono: "+56 9 6543 2109",
      socio: true,
      numeroSocio: "S-0587",
      categoriaSocio: "activo",
      fechaIngreso: "2021-08-15",
    }),
  ];

  const vinculos: Vinculo[] = [
    { id: "vin_ej_1", personaId: "per_ej_emilia", adultoId: "per_ej_carolina", tipo: "madre", pagador: true, contactoPrincipal: true, notas: "" },
    { id: "vin_ej_2", personaId: "per_ej_emilia", adultoId: "per_ej_rodrigo", tipo: "padre", pagador: false, contactoPrincipal: false, notas: "Retira los martes." },
    { id: "vin_ej_3", personaId: "per_ej_tomas", adultoId: "per_ej_carolina", tipo: "madre", pagador: true, contactoPrincipal: true, notas: "" },
    { id: "vin_ej_4", personaId: "per_ej_tomas", adultoId: "per_ej_rodrigo", tipo: "padre", pagador: false, contactoPrincipal: false, notas: "" },
    { id: "vin_ej_5", personaId: "per_ej_sofia", adultoId: "per_ej_patricia", tipo: "madre", pagador: true, contactoPrincipal: true, notas: "" },
  ];

  const planes: Plan[] = [
    {
      id: "pla_ej_socio",
      nombre: "Cuota de socio activo",
      tipo: "socio",
      rama: "club",
      valor: 120_000,
      matricula: 0,
      periodicidad: "anual",
      cupos: null,
      vigenciaDesde: `${new Date().getFullYear()}-01-01`,
      vigenciaHasta: "",
      condiciones:
        "Da derecho a usar las instalaciones del club, a voto en la asamblea y a los valores preferentes de todas las ramas.",
      requisitos: "Ser presentado por un socio activo.",
      descuentos: { hermanos: 0, socio: 0, pagoAnual: 0 },
      horarios: [],
      edadMinima: 18,
      edadMaxima: null,
      activo: true,
      notas: "",
    },
    {
      id: "pla_ej_futbol",
      nombre: "Escuela de Fútbol",
      tipo: "escuela",
      rama: "futbol",
      valor: 28_000,
      matricula: 20_000,
      periodicidad: "mensual",
      cupos: 60,
      vigenciaDesde: `${new Date().getFullYear()}-03-01`,
      vigenciaHasta: `${new Date().getFullYear()}-12-15`,
      condiciones:
        "Dos entrenamientos semanales, uniforme de entrenamiento incluido en la matrícula. La mensualidad se paga dentro de los primeros cinco días. Se puede congelar un mes por lesión, con certificado médico.",
      requisitos: "Certificado de salud compatible con actividad física.",
      descuentos: { hermanos: 20, socio: 10, pagoAnual: 8 },
      horarios: [
        { dia: 2, desde: "18:00", hasta: "19:30", lugar: "Cancha principal" },
        { dia: 4, desde: "18:00", hasta: "19:30", lugar: "Cancha principal" },
      ],
      edadMinima: 5,
      edadMaxima: 14,
      activo: true,
      notas: "",
    },
    {
      id: "pla_ej_tenis",
      nombre: "Tenis — escuela formativa",
      tipo: "escuela",
      rama: "tenis",
      valor: 35_000,
      matricula: 15_000,
      periodicidad: "mensual",
      cupos: 40,
      vigenciaDesde: `${new Date().getFullYear()}-03-01`,
      vigenciaHasta: "",
      condiciones: "Una clase semanal en grupos de seis. Raqueta del club durante el primer trimestre.",
      requisitos: "",
      descuentos: { hermanos: 20, socio: 15, pagoAnual: 10 },
      horarios: [{ dia: 6, desde: "10:00", hasta: "11:30", lugar: "Canchas de tenis" }],
      edadMinima: 6,
      edadMaxima: 17,
      activo: true,
      notas: "",
    },
    {
      id: "pla_ej_natacion",
      nombre: "Natación — nivel intermedio",
      tipo: "escuela",
      rama: "natacion",
      valor: 42_000,
      matricula: 18_000,
      periodicidad: "mensual",
      cupos: 24,
      vigenciaDesde: `${new Date().getFullYear()}-03-01`,
      vigenciaHasta: "",
      condiciones: "Dos sesiones semanales en piscina temperada. Gorro obligatorio.",
      requisitos: "Saber flotar y desplazarse 25 metros.",
      descuentos: { hermanos: 15, socio: 10, pagoAnual: 0 },
      horarios: [
        { dia: 1, desde: "19:00", hasta: "20:00", lugar: "Piscina" },
        { dia: 3, desde: "19:00", hasta: "20:00", lugar: "Piscina" },
      ],
      edadMinima: 4,
      edadMaxima: 17,
      activo: true,
      notas: "",
    },
    {
      id: "pla_ej_trail",
      nombre: "Trail Villarrica — salida de temporada",
      tipo: "actividad",
      rama: "outdoor",
      valor: 25_000,
      matricula: 0,
      periodicidad: "unico",
      cupos: 30,
      vigenciaDesde: hoy,
      vigenciaHasta: sumarDias(hoy, 45),
      condiciones: "Incluye traslado, guía y seguro de la jornada. Cupos por orden de pago.",
      requisitos: "Experiencia previa en cerros; mayores de 16 con autorización del apoderado.",
      descuentos: { hermanos: 0, socio: 20, pagoAnual: 0 },
      horarios: [],
      edadMinima: 16,
      edadMaxima: null,
      activo: true,
      notas: "",
    },
  ];

  // Las inscripciones se arman para que la pantalla de cobranzas muestre los
  // tres estados de una vez: vencida, por vencer dentro de cinco días y al día.
  const inscripciones: Inscripcion[] = [
    {
      id: "ins_ej_emilia_futbol",
      personaId: "per_ej_emilia",
      planId: "pla_ej_futbol",
      pagadorId: "per_ej_carolina",
      fechaInicio: sumarMeses(hoy, -6),
      fechaTermino: "",
      valor: 22_400,
      descuentoMotivo: "20% hermanos",
      periodicidad: "mensual",
      estado: "activa",
      canalAviso: "ambos",
      diasAviso: 5,
      matriculaPagada: true,
      notas: "",
      creadoEn: ahora,
    },
    {
      id: "ins_ej_tomas_tenis",
      personaId: "per_ej_tomas",
      planId: "pla_ej_tenis",
      pagadorId: "per_ej_carolina",
      fechaInicio: sumarMeses(hoy, -4),
      fechaTermino: "",
      valor: 28_000,
      descuentoMotivo: "20% hermanos",
      periodicidad: "mensual",
      estado: "activa",
      canalAviso: "correo",
      diasAviso: 5,
      matriculaPagada: true,
      notas: "",
      creadoEn: ahora,
    },
    {
      id: "ins_ej_sofia_natacion",
      personaId: "per_ej_sofia",
      planId: "pla_ej_natacion",
      pagadorId: "per_ej_patricia",
      fechaInicio: sumarMeses(hoy, -3),
      fechaTermino: "",
      valor: 42_000,
      descuentoMotivo: "",
      periodicidad: "mensual",
      estado: "activa",
      canalAviso: "correo",
      diasAviso: 5,
      matriculaPagada: true,
      notas: "",
      creadoEn: ahora,
    },
    {
      id: "ins_ej_carolina_socio",
      personaId: "per_ej_carolina",
      planId: "pla_ej_socio",
      pagadorId: "per_ej_carolina",
      fechaInicio: sumarMeses(hoy, -11),
      fechaTermino: "",
      valor: 120_000,
      descuentoMotivo: "",
      periodicidad: "anual",
      estado: "activa",
      canalAviso: "correo",
      diasAviso: 15,
      matriculaPagada: true,
      notas: "",
      creadoEn: ahora,
    },
    {
      id: "ins_ej_ignacio_trail",
      personaId: "per_ej_ignacio",
      planId: "pla_ej_trail",
      pagadorId: "per_ej_ignacio",
      fechaInicio: sumarDias(hoy, 4),
      fechaTermino: "",
      valor: 20_000,
      descuentoMotivo: "20% socio del club",
      periodicidad: "unico",
      estado: "activa",
      canalAviso: "whatsapp",
      diasAviso: 5,
      matriculaPagada: true,
      notas: "Cupo reservado hasta el pago.",
      creadoEn: ahora,
    },
  ];

  /**
   * Un pago que cubre `meses` completos y termina el día anterior a
   * `hastaExclusivo`. Se define hacia atrás desde esa fecha —y no hacia
   * adelante desde el inicio— porque lo que el ejemplo necesita fijar es el
   * vencimiento: es lo que se ve en la pantalla de cobranzas.
   */
  function pago(
    id: string,
    inscripcionId: string,
    personaId: string,
    monto: number,
    meses: number,
    hastaExclusivo: string,
  ): Pago {
    const desde = sumarMeses(hastaExclusivo, -meses);
    return {
      id,
      inscripcionId,
      personaId,
      monto,
      fecha: desde,
      periodoDesde: desde,
      periodoHasta: sumarDias(hastaExclusivo, -1),
      medio: "transferencia",
      concepto: "cuota",
      comprobante: "",
      registradoPor: "Secretaría",
      notas: "",
      creadoEn: ahora,
    };
  }

  // El mes de Emilia termina pasado mañana: aparece «por vencer» dentro de los
  // cinco días de aviso. El de Tomás terminó hace una semana: aparece vencido.
  const venceEmilia = sumarDias(hoy, 3);

  const pagos: Pago[] = [
    pago("pag_ej_1", "ins_ej_emilia_futbol", "per_ej_carolina", 22_400, 1, venceEmilia),
    pago("pag_ej_2", "ins_ej_emilia_futbol", "per_ej_carolina", 22_400, 1, sumarMeses(venceEmilia, -1)),
    pago("pag_ej_3", "ins_ej_tomas_tenis", "per_ej_carolina", 28_000, 1, sumarDias(hoy, -6)),
    pago("pag_ej_4", "ins_ej_sofia_natacion", "per_ej_patricia", 42_000, 1, sumarDias(hoy, 26)),
    pago("pag_ej_5", "ins_ej_carolina_socio", "per_ej_carolina", 120_000, 12, sumarDias(hoy, 45)),
  ];

  return {
    formato: "cga-socios",
    version: 1,
    exportadoEn: new Date().toISOString(),
    personas,
    vinculos,
    planes,
    inscripciones,
    pagos,
    avisos: [],
  };
}
