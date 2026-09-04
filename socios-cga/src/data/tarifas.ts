import type { Plan } from "../domain/types";

/**
 * Las tarifas del club, tal como vienen en su lista oficial.
 *
 * Viven aparte de los datos de ejemplo a propósito: la familia inventada sirve
 * para practicar y se carga sólo si alguien la pide, pero los planes son la
 * referencia real de precios y tienen que estar desde el primer momento. Sin
 * ellos no se puede inscribir a nadie, y quien abre la aplicación por primera
 * vez se encontraría con una pantalla vacía sin saber qué le falta.
 *
 * Los valores son los de la lista vigente 2026, sin redondear ni interpretar.
 */
/*
 * Tres cosas quedaron por confirmar con el club y están marcadas en cada plan:
 * los descuentos (la planilla no los detalla), los horarios (indica la
 * frecuencia semanal pero no los días ni las horas) y la cuota de socio, que no
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

export function tarifasDelClub(): Plan[] {
  return [
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
}
