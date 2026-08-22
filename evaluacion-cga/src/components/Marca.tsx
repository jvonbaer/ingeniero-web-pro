import { useEffect, useId, useState } from "react";

/**
 * Escudo del Club Gimnástico Alemán: la cruz de las cuatro F —Frisch, Fromm,
 * Fröhlich, Frei, el Turnerkreuz de los clubes de gimnasia alemanes— dentro del
 * anillo.
 *
 * La geometría está reconstruida a mano desde el logotipo oficial, no es una
 * imagen incrustada: así se puede pintar en color, en blanco sobre los fondos
 * oscuros y en negro para fotocopias, y se imprime como vector.
 *
 * Si el club entrega el archivo vectorial original, déjelo en `public/brand/`
 * con uno de estos nombres y se usa ese en vez del dibujo:
 *   · escudo-cga.svg         (versión a color)
 *   · escudo-cga-blanco.svg  (para fondos oscuros)
 *   · escudo-cga-negro.svg   (monocromo)
 */

export type VarianteEscudo = "color" | "blanco" | "negro";

/** Mitad del ancho del canal blanco que separa las cuatro F. */
const CANAL = 1.7;
/** Los brazos se dibujan largos y el disco los recorta: así siguen la curva. */
const LARGO = 95;

const CUADRANTES = [
  "", // superior derecho, tal como está definido
  "translate(100,0) scale(-1,1)", // superior izquierdo
  "translate(0,100) scale(1,-1)", // inferior derecho
  "translate(100,100) scale(-1,-1)", // inferior izquierdo
];

const ARCHIVOS: Record<VarianteEscudo, string> = {
  color: "escudo-cga.svg",
  blanco: "escudo-cga-blanco.svg",
  negro: "escudo-cga-negro.svg",
};

function colores(variante: VarianteEscudo) {
  if (variante === "blanco") return { anillo: "var(--cga-blanco)", cruz: "var(--cga-blanco)" };
  if (variante === "negro") return { anillo: "var(--carbon-900)", cruz: "var(--carbon-900)" };
  return { anillo: "var(--cga-gris)", cruz: "var(--cga-rojo)" };
}

interface EscudoProps {
  tamano?: number;
  variante?: VarianteEscudo;
  /** Deja el escudo sin colores propios para que herede el del contenedor. */
  heredarColor?: boolean;
  /** Ocupa todo el contenedor en vez de un tamaño fijo. */
  fluido?: boolean;
}

/** El dibujo en sí, sin la búsqueda del archivo oficial. */
export function EscudoDibujado({
  tamano = 40,
  variante = "color",
  heredarColor = false,
  fluido = false,
}: EscudoProps) {
  const id = useId();
  const disco = `disco-${id}`;
  const { anillo, cruz } = colores(variante);

  return (
    <svg
      width={fluido ? "100%" : tamano}
      height={fluido ? "100%" : tamano}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Club Gimnástico Alemán"
      style={{ display: "block", flex: "none" }}
    >
      <defs>
        <clipPath id={disco}>
          <circle cx="50" cy="50" r="39.4" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${disco})`} fill={heredarColor ? "currentColor" : cruz}>
        {CUADRANTES.map((transformacion) => (
          <g key={transformacion || "base"} transform={transformacion || undefined}>
            {/* Asta vertical, pegada al canal central */}
            <rect x={50 + CANAL} y="0" width="11.6" height={48.3} />
            {/* Brazo largo, pegado al canal horizontal */}
            <rect x={61.8 + CANAL} y="38.9" width={LARGO} height="9.4" />
            {/* Brazo corto, más arriba */}
            <rect x={61.8 + CANAL} y="24.3" width={LARGO} height="9.4" />
          </g>
        ))}
      </g>

      <circle
        cx="50"
        cy="50"
        r="44.2"
        fill="none"
        stroke={heredarColor ? "currentColor" : anillo}
        strokeWidth="3.6"
      />
    </svg>
  );
}

// La comprobación del archivo oficial se hace una vez por variante y por carga:
// en el informe hay varios escudos y no tiene sentido que cada uno lo pida.
const comprobado: Partial<Record<VarianteEscudo, boolean>> = {};
const enCurso: Partial<Record<VarianteEscudo, Promise<boolean>>> = {};

function rutaDe(variante: VarianteEscudo) {
  return `${import.meta.env.BASE_URL}brand/${ARCHIVOS[variante]}`;
}

function comprobarArchivo(variante: VarianteEscudo): Promise<boolean> {
  enCurso[variante] ??= new Promise<boolean>((resolver) => {
    const img = new Image();
    img.onload = () => resolver(true);
    img.onerror = () => resolver(false);
    img.src = rutaDe(variante);
  }).then((existe) => {
    comprobado[variante] = existe;
    return existe;
  });
  return enCurso[variante]!;
}

export function Escudo({ tamano = 40, variante = "color" }: EscudoProps) {
  const [oficial, setOficial] = useState<boolean | null>(comprobado[variante] ?? null);

  useEffect(() => {
    if (comprobado[variante] === undefined) void comprobarArchivo(variante).then(setOficial);
    else setOficial(comprobado[variante]!);
  }, [variante]);

  if (oficial) {
    return (
      <img
        src={rutaDe(variante)}
        width={tamano}
        height={tamano}
        alt="Escudo del Club Gimnástico Alemán"
        style={{ display: "block", objectFit: "contain", flex: "none" }}
      />
    );
  }

  return <EscudoDibujado tamano={tamano} variante={variante} />;
}

/**
 * Marca de agua circular difusa, recortada en la esquina inferior derecha:
 * 75-80 % del lienzo, opacidad 8-10 %. Elemento obligatorio del sistema CGA, no
 * decorativo opcional.
 */
export function MarcaDeAgua() {
  return (
    <div className="marca-agua" aria-hidden="true">
      <EscudoDibujado fluido variante="negro" heredarColor />
    </div>
  );
}
