/**
 * Iconos de categoría.
 *
 * Se dibujan a mano en lugar de usar emoji por dos razones: el emoji cambia de
 * forma y de color en cada sistema operativo, y varios de los candidatos obvios
 * (el escudo, por ejemplo) se pintan en azul — un color que la identidad del CGA
 * reserva en exclusiva a la rama de Natación. Estos heredan `currentColor`, así
 * que siempre quedan dentro de la paleta.
 */

export const ICONOS_DISPONIBLES = [
  { clave: "balon", etiqueta: "Balón" },
  { clave: "correr", etiqueta: "Correr" },
  { clave: "brujula", etiqueta: "Brújula" },
  { clave: "diana", etiqueta: "Diana" },
  { clave: "equipo", etiqueta: "Equipo" },
  { clave: "escudo", etiqueta: "Escudo" },
  { clave: "estrella", etiqueta: "Estrella" },
  { clave: "reloj", etiqueta: "Reloj" },
] as const;

const TRAZOS: Record<string, React.ReactNode> = {
  balon: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.2l4.2 3-1.6 4.9H9.4L7.8 10.2z" />
      <path d="M12 3v4.2M4.1 9.6l3.7.6M6.6 19.3l2.8-4.2M17.4 19.3l-2.8-4.2M19.9 9.6l-3.7.6" />
    </>
  ),
  correr: (
    <>
      <circle cx="14.6" cy="4.7" r="1.9" />
      <path d="M13.2 8.4L9.5 10l-1.7 4.1M13.2 8.4l3.1 2.4 1.1 3.4M13.2 8.4l-1 5.2 3 2.6.6 4.6M12.2 13.6l-3.6 2.2-2.4 3.6M4.4 9.9l3.4-1" />
    </>
  ),
  brujula: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.6 8.4l-1.9 5.3-5.3 1.9 1.9-5.3z" />
    </>
  ),
  diana: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  equipo: (
    <>
      <circle cx="9" cy="8" r="2.9" />
      <path d="M3.6 19.4c0-3 2.4-5.2 5.4-5.2s5.4 2.2 5.4 5.2" />
      <path d="M16.1 5.6a2.9 2.9 0 010 5.6M17 14.6c2.1.6 3.4 2.4 3.4 4.8" />
    </>
  ),
  escudo: (
    <>
      <path d="M12 2.9l7.4 2.6v6.1c0 4.3-3 8.1-7.4 9.5-4.4-1.4-7.4-5.2-7.4-9.5V5.5z" />
      <path d="M8.7 11.9l2.3 2.4 4.3-4.6" />
    </>
  ),
  estrella: (
    <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.3 1.2 6.1L12 17.1l-5.5 2.9 1.2-6.1L3.2 9.6l6.1-.8z" />
  ),
  reloj: (
    <>
      <circle cx="12" cy="13.2" r="7.9" />
      <path d="M12 8.8v4.4l2.9 1.8M9.4 2.6h5.2M18.9 6.1l1.6-1.6" />
    </>
  ),
};

interface Props {
  nombre: string;
  tamano?: number;
  className?: string;
}

export function Icono({ nombre, tamano = 18, className = "" }: Props) {
  const trazo = TRAZOS[nombre];

  // Si la categoría trae un icono que no está en el set —por ejemplo, porque el
  // entrenador escribió un emoji a mano— se muestra tal cual en vez de perderlo.
  if (!trazo) {
    return (
      <span className={className} style={{ fontSize: tamano, lineHeight: 1 }} aria-hidden="true">
        {nombre}
      </span>
    );
  }

  return (
    <svg
      className={`icono ${className}`}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {trazo}
    </svg>
  );
}
