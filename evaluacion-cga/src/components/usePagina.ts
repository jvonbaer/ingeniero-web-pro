import { useEffect } from "react";

/**
 * Fija el tamaño de papel mientras esta pantalla está abierta.
 *
 * `@page` es global al documento y no se puede elegir con un selector, pero la
 * aplicación imprime dos cosas de tamaños distintos —la hoja de terreno en
 * Carta y el informe para los apoderados— y nunca las dos a la vez. Así que
 * cada pantalla declara el suyo al montarse y lo retira al salir.
 *
 * El margen va en cero a propósito: el informe se imprime a sangre, con su
 * franja de color tocando el borde, y la hoja de terreno pone sus propios
 * márgenes en el CSS.
 */
export type TamanoPagina = "letter" | "A4";

export function usePagina(tamano: TamanoPagina) {
  useEffect(() => {
    const estilo = document.createElement("style");
    estilo.dataset.pagina = tamano;
    estilo.textContent = `@page { size: ${tamano} portrait; margin: 0; }`;
    document.head.appendChild(estilo);
    return () => estilo.remove();
  }, [tamano]);
}
