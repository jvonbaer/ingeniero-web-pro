/**
 * El cruce entre personas: quién responde por quién, quién paga y quiénes son
 * hermanos.
 *
 * Todo sale de la lista de vínculos, que es un grafo pequeño. Se recorre en
 * memoria en vez de consultarlo a la base porque un club de este tamaño cabe
 * entero en el navegador y así las pantallas responden al instante, incluso con
 * mala señal.
 */
import type { Persona, Vinculo } from "./types";

/** Los adultos responsables de una persona. */
export function responsablesDe(personaId: string, vinculos: Vinculo[]): Vinculo[] {
  return vinculos.filter((v) => v.personaId === personaId);
}

/** Las personas por las que responde un adulto: sus hijos, pupilos o cargas. */
export function aCargoDe(adultoId: string, vinculos: Vinculo[]): Vinculo[] {
  return vinculos.filter((v) => v.adultoId === adultoId);
}

/**
 * A quién habría que cobrarle. Se prefiere el vínculo marcado como pagador; si
 * no hay ninguno, el contacto principal; si tampoco, el primero registrado.
 */
export function pagadorSugerido(personaId: string, vinculos: Vinculo[]): string {
  const propios = responsablesDe(personaId, vinculos);
  if (propios.length === 0) return personaId; // adulto que se paga solo
  return (
    propios.find((v) => v.pagador)?.adultoId ??
    propios.find((v) => v.contactoPrincipal)?.adultoId ??
    propios[0].adultoId
  );
}

/** Hermanos: quienes comparten al menos un adulto responsable. */
export function hermanosDe(personaId: string, vinculos: Vinculo[]): string[] {
  const adultos = new Set(responsablesDe(personaId, vinculos).map((v) => v.adultoId));
  const hermanos = new Set<string>();
  for (const v of vinculos) {
    if (v.personaId !== personaId && adultos.has(v.adultoId)) hermanos.add(v.personaId);
  }
  return [...hermanos];
}

/**
 * El grupo familiar completo alrededor de una persona: los adultos que
 * responden por ella, los hermanos que comparte con ellos y las demás personas
 * a su cargo si ella misma es el adulto.
 */
export function grupoFamiliar(
  personaId: string,
  vinculos: Vinculo[],
): { adultos: string[]; hermanos: string[]; aCargo: string[] } {
  return {
    adultos: responsablesDe(personaId, vinculos).map((v) => v.adultoId),
    hermanos: hermanosDe(personaId, vinculos),
    aCargo: aCargoDe(personaId, vinculos).map((v) => v.personaId),
  };
}

/** Índice por id, para no recorrer la lista completa en cada fila de una tabla. */
export function indexar(personas: Persona[]): Map<string, Persona> {
  return new Map(personas.map((p) => [p.id, p]));
}

/**
 * Busca por nombre, RUT o número de socio. El RUT se compara sin puntos ni
 * guion, así da igual cómo lo escriba quien busca.
 */
export function coincide(persona: Persona, consulta: string): boolean {
  const q = consulta.trim().toLowerCase();
  if (!q) return true;
  const rutPlano = persona.rut.replace(/[.-]/g, "").toLowerCase();
  const qPlano = q.replace(/[.-]/g, "");
  return (
    `${persona.nombres} ${persona.apellidos}`.toLowerCase().includes(q) ||
    rutPlano.includes(qPlano) ||
    persona.numeroSocio.toLowerCase().includes(q) ||
    persona.email.toLowerCase().includes(q)
  );
}
