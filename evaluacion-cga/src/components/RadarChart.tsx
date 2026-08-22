export interface EjeRadar {
  id: string;
  nombre: string;
  icono: string;
  descripcion?: string;
}

export interface SerieRadar {
  id: string;
  etiqueta: string;
  color: string;
  /** Un valor 0-100 por eje, en el mismo orden que `ejes`. */
  valores: (number | null)[];
  discontinua?: boolean;
  rellena?: boolean;
}

interface Props {
  ejes: EjeRadar[];
  series: SerieRadar[];
  /** Ancho del lienzo, en unidades del viewBox (1 unidad = 1 px si no se escala). */
  ancho?: number;
  /** Alto del lienzo. Por omisión, 78 % del ancho. */
  alto?: number;
  /** Radio de la malla. Por omisión, 30 % del lado menor. */
  radio?: number;
  mostrarLeyenda?: boolean;
  mostrarDescripciones?: boolean;
  /** Serie de la que se toman los puntajes rotulados junto a cada eje. */
  serieDestacada?: number;
}

const ANILLOS = [20, 40, 60, 80, 100];

function punto(cx: number, cy: number, radio: number, indice: number, total: number) {
  const angulo = (-90 + (360 / total) * indice) * (Math.PI / 180);
  return { x: cx + radio * Math.cos(angulo), y: cy + radio * Math.sin(angulo), angulo };
}

/** Corta un texto en líneas de a lo más `max` caracteres, sin partir palabras. */
function envolver(texto: string, max: number): string[] {
  const palabras = texto.split(" ");
  const lineas: string[] = [];
  let actual = "";
  for (const palabra of palabras) {
    if (!actual) actual = palabra;
    else if (`${actual} ${palabra}`.length <= max) actual += ` ${palabra}`;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

/**
 * Gráfico de tela de araña. Se dibuja como SVG plano —sin librerías ni canvas—
 * para que el navegador lo lleve al PDF como vector: se imprime nítido a
 * cualquier tamaño y pesa unos pocos kilobytes.
 */
export function RadarChart({
  ejes,
  series,
  ancho = 720,
  alto: altoProp,
  radio: radioProp,
  mostrarLeyenda = true,
  mostrarDescripciones = true,
  serieDestacada = 0,
}: Props) {
  const n = ejes.length;
  if (n < 3) {
    return (
      <p className="vacio">
        Se necesitan al menos 3 categorías activas para dibujar la tela de araña.
      </p>
    );
  }

  const alto = altoProp ?? Math.round(ancho * 0.78);
  const cx = ancho / 2;
  const cy = alto / 2 + (mostrarLeyenda ? 10 : 0);
  const radio = radioProp ?? Math.min(ancho, alto) * 0.3;
  const radioEtiqueta = radio + 26;

  const escala = (valor: number) => (Math.max(0, Math.min(100, valor)) / 100) * radio;

  const poligono = (valores: (number | null)[]) =>
    valores
      .map((v, i) => {
        const p = punto(cx, cy, escala(v ?? 0), i, n);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(" ");

  const mallaAnillo = (nivel: number) =>
    Array.from({ length: n }, (_, i) => {
      const p = punto(cx, cy, escala(nivel), i, n);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ");

  const destacada = series[serieDestacada];

  return (
    <svg
      className="radar"
      viewBox={`0 0 ${ancho} ${alto}`}
      width="100%"
      role="img"
      aria-label={`Gráfico de tela de araña con ${n} categorías y ${series.length} evaluaciones comparadas.`}
    >
      {mostrarLeyenda && (
        <g className="radar__leyenda">
          {series.map((s, i) => {
            // El ancho por entrada se reparte sobre el lienzo completo, para que
            // tres fechas quepan sin salirse por el borde derecho.
            const paso = (ancho - 16) / series.length;
            const x = 8 + i * paso;
            return (
              <g key={s.id} transform={`translate(${x}, 14)`}>
                <line
                  x1="0" y1="0" x2="22" y2="0"
                  stroke={s.color}
                  strokeWidth={s.discontinua ? 2 : 3}
                  strokeDasharray={s.discontinua ? "5 4" : undefined}
                  strokeLinecap="round"
                />
                <text x="28" y="4" className="radar__leyenda-texto">
                  {s.etiqueta}
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* Malla */}
      <g>
        {ANILLOS.map((nivel) => (
          <polygon
            key={nivel}
            points={mallaAnillo(nivel)}
            fill="none"
            stroke="var(--borde)"
            strokeWidth={nivel === 100 ? 1.4 : 1}
          />
        ))}
        {ejes.map((eje, i) => {
          const p = punto(cx, cy, radio, i, n);
          return (
            <line key={eje.id} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--borde)" strokeWidth="1" />
          );
        })}
        {ANILLOS.map((nivel) => (
          <text
            key={`r${nivel}`}
            x={cx + 5}
            y={cy - escala(nivel) + 4}
            className="radar__anillo-texto"
            stroke="var(--cga-blanco)"
            strokeWidth="2.5"
            paintOrder="stroke"
          >
            {nivel}
          </text>
        ))}
      </g>

      {/* Series, de la más antigua a la más reciente para que la actual quede arriba */}
      <g>
        {[...series].reverse().map((s) => (
          <polygon
            key={s.id}
            points={poligono(s.valores)}
            fill={s.rellena ? s.color : "none"}
            fillOpacity={s.rellena ? 0.17 : 0}
            stroke={s.color}
            strokeWidth={s.discontinua ? 2 : 2.8}
            strokeDasharray={s.discontinua ? "6 5" : undefined}
            strokeLinejoin="round"
          />
        ))}
        {destacada?.valores.map((v, i) => {
          if (v === null) return null;
          const p = punto(cx, cy, escala(v), i, n);
          return (
            <circle
              key={ejes[i].id}
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill={destacada.color}
              stroke="var(--cga-blanco)"
              strokeWidth="1.6"
            />
          );
        })}
      </g>

      {/* Rótulos de cada eje */}
      <g>
        {ejes.map((eje, i) => {
          const p = punto(cx, cy, radioEtiqueta, i, n);
          const cos = Math.cos(p.angulo);
          const anclaje = cos > 0.15 ? "start" : cos < -0.15 ? "end" : "middle";
          const valor = destacada?.valores[i] ?? null;
          const arriba = Math.sin(p.angulo) < -0.5;
          const y0 = arriba ? p.y - 34 : p.y + 6;
          // El ancho de la descripción sale del espacio que realmente queda entre
          // el rótulo y el borde del lienzo, no de un número fijo: así el mismo
          // gráfico se ve bien en la ficha (ancho) y en el informe (angosto).
          // Arriba y abajo el texto va centrado y sobra ancho, pero falta alto;
          // a los costados ocurre lo contrario.
          const espacio =
            anclaje === "middle" ? ancho - 20 : (anclaje === "start" ? ancho - p.x : p.x) - 10;
          const anchoLinea = Math.max(14, Math.min(38, Math.floor(espacio / 4.6)));
          const maxLineas = anclaje === "middle" ? 2 : 4;
          const lineas = mostrarDescripciones && eje.descripcion
            ? envolver(eje.descripcion, anchoLinea).slice(0, maxLineas)
            : [];

          return (
            <g key={eje.id}>
              <text x={p.x} y={y0} textAnchor={anclaje} className="radar__eje-nombre">
                {eje.nombre.toUpperCase()}
              </text>
              <text x={p.x} y={y0 + 21} textAnchor={anclaje} className="radar__eje-valor">
                {valor === null ? "—" : valor}
                <tspan className="radar__eje-valor-sufijo">{valor === null ? "" : "/100"}</tspan>
              </text>
              {lineas.map((linea, k) => (
                <text
                  key={linea}
                  x={p.x}
                  y={y0 + 37 + k * 11}
                  textAnchor={anclaje}
                  className="radar__eje-desc"
                >
                  {linea}
                </text>
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
