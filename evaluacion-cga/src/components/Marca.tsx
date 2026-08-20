/**
 * Marca circular del club.
 *
 * Es un sustituto: el escudo oficial del CGA no viene con este repositorio. Para
 * usar el real, deje el archivo en `public/escudo-cga.svg` (o .png) — el
 * componente lo toma automáticamente y sólo cae en el dibujo de abajo si no lo
 * encuentra. Ver README, sección "Poner el escudo oficial".
 */
import { useEffect, useState } from "react";

const RUTA_ESCUDO = `${import.meta.env.BASE_URL}escudo-cga.svg`;

// La comprobación se hace una vez por carga y el resultado se comparte: en el
// informe hay varios escudos y no tiene sentido que cada uno pida el archivo.
let existeEscudo: boolean | null = null;
let comprobacion: Promise<boolean> | null = null;

function comprobarEscudo(): Promise<boolean> {
  comprobacion ??= new Promise<boolean>((resolver) => {
    const img = new Image();
    img.onload = () => resolver(true);
    img.onerror = () => resolver(false);
    img.src = RUTA_ESCUDO;
  }).then((existe) => {
    existeEscudo = existe;
    return existe;
  });
  return comprobacion;
}

export function Escudo({ tamano = 40 }: { tamano?: number }) {
  const [existe, setExiste] = useState<boolean | null>(existeEscudo);

  useEffect(() => {
    if (existeEscudo === null) void comprobarEscudo().then(setExiste);
  }, []);

  if (existe) {
    return (
      <img
        src={RUTA_ESCUDO}
        width={tamano}
        height={tamano}
        alt="Escudo del Club Gimnástico Alemán"
        style={{ display: "block", objectFit: "contain" }}
      />
    );
  }

  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Club Gimnástico Alemán"
    >
      <circle cx="50" cy="50" r="47" fill="#1C1C1C" stroke="#C8102E" strokeWidth="5" />
      <circle cx="50" cy="44" r="20" fill="none" stroke="#EAAA00" strokeWidth="3.5" />
      <path
        d="M50 30 L61 38 L57 51 L43 51 L39 38 Z"
        fill="#EAAA00"
      />
      <text
        x="50"
        y="79"
        textAnchor="middle"
        fontFamily="Barlow Condensed, sans-serif"
        fontSize="20"
        fontWeight="800"
        letterSpacing="2"
        fill="#FFFFFF"
      >
        CGA
      </text>
    </svg>
  );
}

/**
 * Marca de agua circular difusa, recortada en la esquina inferior derecha:
 * 75-80 % del lienzo, opacidad 8-10 %. Elemento obligatorio del sistema CGA, no
 * decorativo opcional.
 */
export function MarcaDeAgua() {
  return (
    <div className="marca-agua" aria-hidden="true">
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#1C1C1C" strokeWidth="6" />
        <circle cx="50" cy="50" r="33" fill="none" stroke="#1C1C1C" strokeWidth="2.5" />
        <circle cx="50" cy="42" r="17" fill="none" stroke="#1C1C1C" strokeWidth="3" />
        <path d="M50 29 L60 36 L56 48 L44 48 L40 36 Z" fill="#1C1C1C" />
        <text
          x="50"
          y="76"
          textAnchor="middle"
          fontFamily="Barlow Condensed, sans-serif"
          fontSize="18"
          fontWeight="800"
          letterSpacing="3"
          fill="#1C1C1C"
        >
          CGA
        </text>
      </svg>
    </div>
  );
}
