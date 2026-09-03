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

  /**
   * Tarifas vigentes 2026 del Club Gimnástico Alemán, tal como vienen en la
   * planilla oficial. Se cargan como referencia para las pruebas: los valores
   * son los reales, así que quien pruebe ve las cifras que va a usar.
   *
   * Tres cosas quedaron por confirmar con el club y están marcadas en cada
   * plan: los descuentos (la planilla no los detalla), los horarios (indica la
   * frecuencia semanal pero no días ni horas) y la cuota de socio, que no
   * aparece en la lista de tarifas.
   */
  const AVISO_TARIFAS =
    "El club se reserva actualizar y cambiar los valores, por lo que deben " +
    "confirmarse al momento de aplicar algún descuento.";

  const plan = (
    id: string,
    nombre: string,
    tipo: Plan["tipo"],
    rama: Plan["rama"],
    valor: number,
    extra: Partial<Plan> = {},
  ): Plan => ({
    id,
    nombre,
    tipo,
    rama,
    valor,
    matricula: 0,
    periodicidad: "mensual",
    cupos: null,
    vigenciaDesde: "2026-01-01",
    vigenciaHasta: "",
    condiciones: AVISO_TARIFAS,
    requisitos: "",
    descuentos: { hermanos: 0, socio: 0, pagoAnual: 0 },
    horarios: [],
    edadMinima: null,
    edadMaxima: null,
    activo: true,
    notas: "Tarifa pública 2026, según la lista oficial del club.",
    ...extra,
  });

  const planes: Plan[] = [
    // ---------- Piscina ----------
    plan("pla_nat_rama", "Rama Natación", "rama", "natacion", 75_000),
    plan("pla_nat_ini_1", "Escuela natación inicial · 1 vez por semana", "escuela", "natacion", 85_000, {
      condiciones: `Una sesión semanal. ${AVISO_TARIFAS}`,
    }),
    plan("pla_nat_ini_2", "Escuela natación inicial · 2 veces por semana", "escuela", "natacion", 107_000, {
      condiciones: `Dos sesiones semanales. ${AVISO_TARIFAS}`,
    }),
    plan("pla_nat_ini_3", "Escuela natación inicial · 3 veces por semana", "escuela", "natacion", 122_000, {
      condiciones: `Tres sesiones semanales. ${AVISO_TARIFAS}`,
    }),
    plan("pla_nat_gen_1", "Escuela natación general y adultos · 1 vez por semana", "escuela", "natacion", 77_000, {
      condiciones: `Una sesión semanal. ${AVISO_TARIFAS}`,
    }),
    plan("pla_nat_gen_2", "Escuela natación general y adultos · 2 veces por semana", "escuela", "natacion", 96_000, {
      condiciones: `Dos sesiones semanales. ${AVISO_TARIFAS}`,
    }),
    plan("pla_nat_gen_3", "Escuela natación general y adultos · 3 veces por semana", "escuela", "natacion", 111_000, {
      condiciones: `Tres sesiones semanales. ${AVISO_TARIFAS}`,
    }),
    plan("pla_hidro_1", "Hidrogimnasia · 1 vez por semana", "escuela", "natacion", 40_000, {
      condiciones: `Una sesión semanal. ${AVISO_TARIFAS}`,
    }),
    plan("pla_hidro_2", "Hidrogimnasia · 2 veces por semana", "escuela", "natacion", 76_000, {
      condiciones: `Dos sesiones semanales. ${AVISO_TARIFAS}`,
    }),
    plan("pla_hidro_3", "Hidrogimnasia · 3 veces por semana", "escuela", "natacion", 108_000, {
      condiciones: `Tres sesiones semanales. ${AVISO_TARIFAS}`,
    }),

    // ---------- Tenis ----------
    plan("pla_ten_rama", "Rama Tenis", "rama", "tenis", 62_000),
    plan("pla_ten_1", "Escuela Tenis · 1 vez por semana", "escuela", "tenis", 52_000, {
      condiciones: `Una clase semanal. ${AVISO_TARIFAS}`,
    }),
    plan("pla_ten_2", "Escuela Tenis · 2 veces por semana", "escuela", "tenis", 63_000, {
      condiciones: `Dos clases semanales. ${AVISO_TARIFAS}`,
    }),
    plan("pla_ten_3", "Escuela Tenis · 3 veces por semana", "escuela", "tenis", 71_000, {
      condiciones: `Tres clases semanales. ${AVISO_TARIFAS}`,
    }),

    // ---------- Escuela de Fútbol ----------
    plan("pla_fut_fem", "Escuela de Fútbol · Femenino", "escuela", "futbol", 30_000),
    plan("pla_fut_ninos", "Escuela de Fútbol · Niños y mixto", "escuela", "futbol", 50_000, {
      condiciones: `Cinco entrenamientos semanales. ${AVISO_TARIFAS}`,
    }),
    plan("pla_fut_jovenes", "Escuela de Fútbol · Jóvenes", "escuela", "futbol", 50_000, {
      condiciones: `Tres entrenamientos semanales. Categorías nacidos entre 2011 y 2014. ${AVISO_TARIFAS}`,
      edadMinima: 12,
      edadMaxima: 15,
    }),

    // ---------- Multisport ----------
    plan("pla_multi_2", "Multisport · 2 veces por semana", "escuela", "club", 30_000, {
      condiciones: `Acceso a todos los deportes, dos sesiones semanales. ${AVISO_TARIFAS}`,
    }),
    plan("pla_multi_3", "Multisport · 3 veces por semana", "escuela", "club", 40_000, {
      condiciones: `Acceso a todos los deportes, tres sesiones semanales. ${AVISO_TARIFAS}`,
    }),

    // ---------- Espacios sociales y deportivos ----------
    // Se cobran por hora, así que van como actividad puntual: el valor es la
    // tarifa por hora y el monto real se escribe al registrar el pago. El
    // sistema no multiplica horas por tarifa.
    plan("pla_esp_cafe", "Café Haus y Sala Multiuso · por hora", "actividad", "club", 35_000, {
      periodicidad: "unico",
      condiciones: `Arriendo por hora, mínimo dos horas. ${AVISO_TARIFAS}`,
      notas: "Tarifa por hora. Al registrar el pago, escriba el monto total de las horas arrendadas.",
    }),
    plan("pla_esp_cancha_dia", "Cancha de Fútbol · por hora, día", "actividad", "futbol", 40_000, {
      periodicidad: "unico",
      condiciones: `Arriendo por hora en horario diurno. ${AVISO_TARIFAS}`,
      notas: "Tarifa por hora. Al registrar el pago, escriba el monto total de las horas arrendadas.",
    }),
    plan("pla_esp_cancha_noche", "Cancha de Fútbol · por hora, noche", "actividad", "futbol", 45_000, {
      periodicidad: "unico",
      condiciones: `Arriendo por hora en horario nocturno. ${AVISO_TARIFAS}`,
      notas: "Tarifa por hora. Al registrar el pago, escriba el monto total de las horas arrendadas.",
    }),
    plan("pla_esp_gim1", "Gimnasio #1 · por hora", "actividad", "club", 30_000, {
      periodicidad: "unico",
      condiciones: `Arriendo por hora. ${AVISO_TARIFAS}`,
      notas: "Tarifa por hora. Al registrar el pago, escriba el monto total de las horas arrendadas.",
    }),
    plan("pla_esp_gim2", "Gimnasio #2 · por hora", "actividad", "club", 40_000, {
      periodicidad: "unico",
      condiciones: `Arriendo por hora. ${AVISO_TARIFAS}`,
      notas: "Tarifa por hora. Al registrar el pago, escriba el monto total de las horas arrendadas.",
    }),

    // ---------- Cuota de socio ----------
    // No viene en la lista de tarifas 2026. El valor es de referencia, para
    // poder probar la pantalla de socios, y hay que confirmarlo con el club.
    plan("pla_socio", "Cuota de socio activo", "socio", "club", 120_000, {
      periodicidad: "anual",
      condiciones:
        "Da derecho a usar las instalaciones del club y a voto en la asamblea. " +
        "VALOR POR CONFIRMAR: no aparece en la lista de tarifas 2026.",
      edadMinima: 18,
      notas: "Valor de referencia, inventado para poder probar. Confirmar con el club.",
    }),
  ];

  // Las inscripciones se arman para que la pantalla de cobranzas muestre los
  // tres estados de una vez: vencida, por vencer dentro de cinco días y al día.
  const inscripciones: Inscripcion[] = [
    {
      id: "ins_ej_emilia_futbol",
      personaId: "per_ej_emilia",
      planId: "pla_fut_ninos",
      pagadorId: "per_ej_carolina",
      fechaInicio: sumarMeses(hoy, -6),
      fechaTermino: "",
      valor: 50_000,
      descuentoMotivo: "",
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
      planId: "pla_ten_2",
      pagadorId: "per_ej_carolina",
      fechaInicio: sumarMeses(hoy, -4),
      fechaTermino: "",
      valor: 63_000,
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
      id: "ins_ej_sofia_natacion",
      personaId: "per_ej_sofia",
      planId: "pla_nat_gen_2",
      pagadorId: "per_ej_patricia",
      fechaInicio: sumarMeses(hoy, -3),
      fechaTermino: "",
      valor: 96_000,
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
      planId: "pla_socio",
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
      id: "ins_ej_ignacio_cancha",
      personaId: "per_ej_ignacio",
      planId: "pla_esp_cancha_noche",
      pagadorId: "per_ej_ignacio",
      fechaInicio: sumarDias(hoy, 4),
      fechaTermino: "",
      valor: 45_000,
      descuentoMotivo: "",
      periodicidad: "unico",
      estado: "activa",
      canalAviso: "whatsapp",
      diasAviso: 5,
      matriculaPagada: true,
      notas: "Arriendo reservado hasta el pago.",
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
    pago("pag_ej_1", "ins_ej_emilia_futbol", "per_ej_carolina", 50_000, 1, venceEmilia),
    pago("pag_ej_2", "ins_ej_emilia_futbol", "per_ej_carolina", 50_000, 1, sumarMeses(venceEmilia, -1)),
    pago("pag_ej_3", "ins_ej_tomas_tenis", "per_ej_carolina", 63_000, 1, sumarDias(hoy, -6)),
    pago("pag_ej_4", "ins_ej_sofia_natacion", "per_ej_patricia", 96_000, 1, sumarDias(hoy, 26)),
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
