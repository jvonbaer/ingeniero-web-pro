import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDatos } from "../data/DatosContext";
import { Escudo, MarcaDeAgua } from "../components/Marca";
import { RadarChart, type SerieRadar } from "../components/RadarChart";
import { Icono } from "../components/Iconos";
import { Delta } from "../components/ui";
import {
  calcular,
  delta,
  edadEn,
  fechaCompacta,
  fechaCorta,
  fechaLarga,
  historial,
  nombreCompleto,
} from "../domain/scoring";

const COLORES_SERIE = ["var(--serie-1)", "var(--serie-2)", "var(--serie-3)"];
const VALORES_CLUB = ["Trabajo en equipo", "Disciplina", "Respeto", "Pasión", "Superación"];
const ANCHO_HOJA = 794; // A4 vertical a 96 dpi (794 × 1123)

export function Informe() {
  const { evaluacionId = "" } = useParams();
  const { jugadores, evaluaciones, rubrica } = useDatos();
  const marco = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);

  const evaluacion = useMemo(
    () => evaluaciones.find((e) => e.id === evaluacionId),
    [evaluaciones, evaluacionId],
  );
  const jugador = useMemo(
    () => jugadores.find((j) => j.id === evaluacion?.jugadorId),
    [jugadores, evaluacion],
  );

  /** En pantalla la hoja se reduce para caber; al imprimir vuelve a tamaño real. */
  useEffect(() => {
    const ajustar = () => {
      const ancho = marco.current?.clientWidth ?? ANCHO_HOJA;
      setEscala(Math.min(1, ancho / ANCHO_HOJA));
    };
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);

  const previas = useMemo(
    () => (evaluacion ? historial(evaluaciones, evaluacion.jugadorId) : []),
    [evaluaciones, evaluacion],
  );

  if (!evaluacion || !jugador) {
    return <p className="vacio">No encontramos esa evaluación.</p>;
  }

  const actual = calcular(evaluacion, rubrica);
  const comparadas = [
    evaluacion,
    ...previas.filter((e) => e.id !== evaluacion.id && e.fecha <= evaluacion.fecha),
  ].slice(0, 3);
  const resultados = comparadas.map((e) => calcular(e, rubrica));
  const previo = resultados[1] ?? null;

  const ejes = rubrica.categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    icono: c.icono,
    descripcion: c.descripcion,
  }));

  const series: SerieRadar[] = resultados.map((r, i) => ({
    id: r.evaluacion.id,
    etiqueta: fechaCompacta(r.evaluacion.fecha),
    color: COLORES_SERIE[i],
    valores: ejes.map((eje) => r.categorias.find((c) => c.categoriaId === eje.id)?.puntaje ?? null),
    rellena: i === 0,
    discontinua: i === 2,
  }));

  const asunto = `Informe de evaluación — ${nombreCompleto(jugador)} (${jugador.codigo})`;
  const cuerpo = [
    `Estimado apoderado de ${nombreCompleto(jugador)}:`,
    "",
    `Adjuntamos el informe de evaluación de habilidades correspondiente al ${fechaLarga(evaluacion.fecha)}.`,
    `Puntaje general: ${actual.general}/100 — Nivel ${actual.nivel?.etiqueta ?? ""}.`,
    "",
    "Quedamos atentos a sus consultas.",
    "",
    "Escuela de Fútbol — Club Gimnástico Alemán, Temuco",
  ].join("\n");
  const mailto = `mailto:${encodeURIComponent(jugador.apoderado.email)}?subject=${encodeURIComponent(
    asunto,
  )}&body=${encodeURIComponent(cuerpo)}`;

  return (
    <>
      <div className="page-head no-print">
        <div>
          <span className="eyebrow">Informe para apoderados</span>
          <h1 style={{ fontSize: 26 }}>{nombreCompleto(jugador)}</h1>
        </div>
        <div className="page-head__acciones">
          <Link to={`/jugadores/${jugador.id}`} className="btn btn--fantasma">Volver a la ficha</Link>
          {jugador.apoderado.email && (
            <a href={mailto} className="btn btn--fantasma">Escribir al apoderado</a>
          )}
          <button type="button" className="btn btn--primario" onClick={() => window.print()}>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      <div className="aviso aviso--acento no-print">
        En el cuadro de impresión elija <strong>Destino: Guardar como PDF</strong>,{" "}
        <strong>Orientación: vertical</strong> y active <strong>Gráficos de fondo</strong>.
        El informe está diseñado para una hoja A4 vertical.
      </div>

      {evaluacion.estado === "borrador" && (
        <div className="aviso no-print">
          Esta evaluación todavía es un <strong>borrador</strong>. Termínela antes de enviarla a los
          padres. <Link to={`/evaluaciones/${evaluacion.id}`}>Retomar la evaluación</Link>
        </div>
      )}

      <div className="informe-marco" ref={marco}>
        <div
          className="informe"
          style={{ transform: `scale(${escala})`, marginBottom: (escala - 1) * 1123 }}
        >
          <MarcaDeAgua />

          <header className="informe__header">
            <div className="informe__header-fila">
              <div className="informe__marca">
                <Escudo tamano={44} />
                <div>
                  <div className="informe__marca-titulo">Escuela de Fútbol</div>
                  <div className="informe__marca-lema">
                    Formamos jugadores, formamos personas
                  </div>
                </div>
              </div>
              <div className="informe__fecha">
                <span>Fecha de evaluación</span>
                <strong>{fechaLarga(evaluacion.fecha)}</strong>
              </div>
            </div>

            <div className="informe__titulo">
              <h1>Evaluación de Habilidades</h1>
              <p>Desarrollando talento, construyendo futuro</p>
            </div>
          </header>

          <div className="informe__cuerpo">
            <section className="informe__identidad">
              <div className="informe__foto">
                {jugador.fotoDataUrl ? (
                  <img src={jugador.fotoDataUrl} alt={nombreCompleto(jugador)} />
                ) : (
                  <span className="foto__vacia">SIN FOTO</span>
                )}
                {jugador.dorsal && <span className="informe__dorsal">#{jugador.dorsal}</span>}
              </div>

              <div className="informe__perfil">
                <h2 className="informe__nombre">{nombreCompleto(jugador)}</h2>
                <div className="informe__chips">
                  <span className="informe__chip informe__chip--acento">{jugador.categoria}</span>
                  <span className="informe__chip">{jugador.posicion}</span>
                  <span className="informe__chip informe__chip--codigo">{jugador.codigo}</span>
                </div>

                <dl className="informe__datos">
                  <DatoInforme
                    rotulo="Nacimiento"
                    valor={`${fechaCorta(jugador.fechaNacimiento)} · ${
                      edadEn(jugador.fechaNacimiento, evaluacion.fecha) ?? "—"
                    } años`}
                  />
                  <DatoInforme rotulo="Pie hábil" valor={jugador.pieHabil} />
                  <DatoInforme
                    rotulo="Altura"
                    valor={jugador.alturaCm ? `${jugador.alturaCm} cm` : "—"}
                  />
                  <DatoInforme rotulo="En la escuela desde" valor={fechaCorta(jugador.ingreso)} />
                  <DatoInforme rotulo="Entrenador" valor={evaluacion.entrenador || "—"} />
                  <DatoInforme rotulo="Temporada" valor={evaluacion.temporada} />
                </dl>
              </div>

              <div className="informe__panel-oscuro">
                <span className="informe__panel-rotulo">Puntaje general</span>
                <span className="puntaje informe__panel-puntaje">
                  {actual.general}
                  <small>/100</small>
                </span>
                <span className="informe__panel-rotulo">Nivel actual</span>
                <span className="nivel informe__panel-nivel">
                  {actual.nivel?.etiqueta ?? "—"}
                </span>
                {previo && (
                  <span className="informe__panel-delta">
                    <Delta valor={delta(actual.general, previo.general)} /> respecto de la
                    evaluación anterior
                  </span>
                )}
              </div>
            </section>

            <section className="informe__bloque">
              <div className="informe__bloque-cabecera">
                <h3 className="informe__bloque-titulo">Comparativo de evaluaciones</h3>
                <ul className="informe__leyenda">
                  {series.map((s) => (
                    <li key={s.id}>
                      <span
                        className={`informe__leyenda-linea${
                          s.discontinua ? " informe__leyenda-linea--corte" : ""
                        }`}
                        style={{ color: s.color }}
                      />
                      {s.etiqueta}
                    </li>
                  ))}
                </ul>
              </div>
              <RadarChart
                ejes={ejes}
                series={series}
                ancho={766}
                alto={367}
                radio={108}
                mostrarLeyenda={false}
              />
            </section>

            <section className="informe__bloque">
              <h3 className="informe__bloque-titulo">Niveles de evaluación por categoría</h3>
              <table className="informe__tabla">
                <tbody>
                  {actual.categorias.map((cat) => {
                    const d = previo
                      ? delta(
                          cat.puntaje,
                          previo.categorias.find((c) => c.categoriaId === cat.categoriaId)
                            ?.puntaje ?? null,
                        )
                      : null;
                    return (
                      <tr key={cat.categoriaId}>
                        <td className="informe__tabla-icono">
                          <Icono nombre={cat.icono} tamano={16} />
                        </td>
                        <td className="informe__tabla-nombre">{cat.nombre}</td>
                        <td className="informe__tabla-desc">{cat.descripcion}</td>
                        <td className="informe__tabla-barra">
                          <span className="informe__pista">
                            <span
                              className="informe__relleno"
                              style={{ width: `${cat.puntaje ?? 0}%` }}
                            />
                          </span>
                        </td>
                        <td className="informe__tabla-valor">
                          {cat.puntaje ?? "—"}<small>/100</small>
                        </td>
                        <td className="informe__tabla-delta"><Delta valor={d} /></td>
                        <td className="informe__tabla-nivel">
                          <span className={`nivel nivel--${cat.nivel?.id ?? "inicial"}`}>
                            {cat.nivel?.etiqueta ?? "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            <section className="informe__fila-inferior">
              <div className="informe__caja">
                <h3 className="informe__bloque-titulo">Observaciones del entrenador</h3>
                <p className="informe__observaciones">
                  {evaluacion.observaciones || "Sin observaciones registradas en esta evaluación."}
                </p>
              </div>

              <div className="informe__caja">
                <h3 className="informe__bloque-titulo">Próximos objetivos</h3>
                <ul className="informe__objetivos">
                  {evaluacion.objetivos.length > 0 ? (
                    evaluacion.objetivos.map((o) => <li key={o}>{o}</li>)
                  ) : (
                    <li>Se definirán en la próxima sesión de trabajo.</li>
                  )}
                </ul>
              </div>
            </section>
          </div>

          <footer className="informe__pie">
            <div className="informe__lema">
              Tu esfuerzo de hoy <strong>es tu éxito de mañana</strong>
            </div>
            <div className="informe__valores">
              {VALORES_CLUB.map((valor) => (
                <span key={valor}>{valor}</span>
              ))}
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

function DatoInforme({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="informe__dato">
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
