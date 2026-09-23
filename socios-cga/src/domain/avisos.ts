/**
 * A quién avisar de una renovación, por dónde y con qué texto.
 *
 * El aviso viaja al pagador, no al deportista: el niño de ocho años de la
 * escuela de fútbol no tiene correo, y quien tiene que reaccionar es su madre.
 * Si el pagador no dejó correo, se cae al contacto principal del vínculo, que
 * suele ser el otro progenitor.
 */
import { formatoPesos } from "./cobros";
import { formatoLargo } from "./fechas";
import type { Inscripcion, Persona, Plan, Vinculo, Aviso } from "./types";
import { nombreCompleto } from "./types";
import { responsablesDe } from "./familia";

export interface Destinatario {
  persona: Persona | null;
  nombre: string;
  email: string;
  telefono: string;
  /** Por qué se eligió a esta persona: se muestra en la pantalla de cobranza. */
  motivo: string;
}

export function destinatarioDe(
  inscripcion: Inscripcion,
  personas: Map<string, Persona>,
  vinculos: Vinculo[],
): Destinatario {
  const pagador = personas.get(inscripcion.pagadorId) ?? null;
  if (pagador && (pagador.email || pagador.telefono)) {
    return {
      persona: pagador,
      nombre: nombreCompleto(pagador),
      email: pagador.email,
      telefono: pagador.telefono,
      motivo: pagador.id === inscripcion.personaId ? "Paga su propia cuota" : "Pagador registrado",
    };
  }

  const respaldo = responsablesDe(inscripcion.personaId, vinculos)
    .map((v) => personas.get(v.adultoId))
    .find((p) => p && (p.email || p.telefono));

  if (respaldo) {
    return {
      persona: respaldo,
      nombre: nombreCompleto(respaldo),
      email: respaldo.email,
      telefono: respaldo.telefono,
      motivo: "El pagador no tiene contacto; se usa el del adulto responsable",
    };
  }

  return {
    persona: pagador,
    nombre: pagador ? nombreCompleto(pagador) : "Sin pagador asignado",
    email: "",
    telefono: "",
    motivo: "Sin correo ni teléfono registrado",
  };
}

/** `+56 9 1234 5678`, `912345678` o `56912345678` → `56912345678`. */
export function normalizarTelefono(telefono: string): string {
  const digitos = telefono.replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.startsWith("56")) return digitos;
  if (digitos.length === 9) return `56${digitos}`;
  if (digitos.length === 8) return `569${digitos}`;
  return digitos;
}

export interface MensajeAviso {
  asunto: string;
  cuerpo: string;
}

export function mensajeRenovacion(
  destinatario: Destinatario,
  socio: Persona | undefined,
  plan: Plan | undefined,
  inscripcion: Inscripcion,
  vence: string,
  dias: number,
): MensajeAviso {
  const quien = nombreCompleto(socio);
  const porQuien =
    socio && destinatario.persona && socio.id === destinatario.persona.id
      ? "su participación"
      : `la participación de ${quien}`;
  const cuando =
    dias < 0
      ? `venció el ${formatoLargo(vence)}`
      : dias === 0
        ? `vence hoy, ${formatoLargo(vence)}`
        : `vence el ${formatoLargo(vence)}, en ${dias} días`;

  const asunto = `CGA · ${plan?.nombre ?? "Inscripción"} — ${dias < 0 ? "cuota vencida" : "renovación próxima"}`;

  const cuerpo = [
    `Estimado/a ${destinatario.nombre.split(" ")[0] || destinatario.nombre}:`,
    "",
    `Le escribimos del Club Gimnástico Alemán para recordarle que ${porQuien} en ` +
      `${plan?.nombre ?? "su plan"} ${cuando}.`,
    "",
    `Plan: ${plan?.nombre ?? "—"}`,
    `Valor del período: ${formatoPesos(inscripcion.valor)}`,
    `Vencimiento: ${formatoLargo(vence)}`,
    "",
    "Puede renovar en la secretaría del club o por transferencia, indicando el nombre",
    "de quien participa. Si ya realizó el pago, le pedimos disculpas y le agradecemos",
    "hacernos llegar el comprobante para registrarlo.",
    "",
    "Un saludo cordial,",
    "Club Gimnástico Alemán · Temuco",
  ].join("\n");

  return { asunto, cuerpo };
}

export function enlaceCorreo(destino: string, mensaje: MensajeAviso): string {
  const params = new URLSearchParams({ subject: mensaje.asunto, body: mensaje.cuerpo });
  return `mailto:${destino}?${params.toString().replace(/\+/g, "%20")}`;
}

export function enlaceWhatsApp(telefono: string, mensaje: MensajeAviso): string {
  const numero = normalizarTelefono(telefono);
  const texto = `${mensaje.asunto}\n\n${mensaje.cuerpo}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/**
 * ¿Ya se avisó de este vencimiento? Evita que el envío automático diario mande
 * el mismo correo cinco veces en los cinco días previos.
 */
export function yaAvisado(avisos: Aviso[], inscripcionId: string, vence: string): Aviso | undefined {
  return avisos.find(
    (a) => a.inscripcionId === inscripcionId && a.vence === vence && a.estado !== "error",
  );
}
