import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useDatos } from "../data/DatosContext";
import { Foto } from "../components/Foto";
import { RadarChart, type SerieRadar } from "../components/RadarChart";
import { BarraCategoria, Delta, NivelTexto, Puntaje, Vacio } from "../components/ui";
import {
  calcular,
  delta,
  edadEn,
  fechaCompacta,
  fechaCorta,
  fechaLarga,
  historial,
  hoyISO,
  nombreCompleto,
} from "../domain/scoring";

const COLORES_SERIE = [
  "var(--serie-1)",
  "var(--serie-2)",
  "var(--serie-3)",
];

export function JugadorFicha() {
  const { id = "" } = useParams();
  const { jugadores, evaluaciones, rubrica, eliminarEvaluacion } = useDatos();

  const jugador = useMemo(() => jugadores.find((j) => j.id === id), [jugadores, id]);
  const finalizadas = useMemo(() => historial(evaluaciones, id), [evaluaciones, id]);
  const borradores = useMemo(
    () => evaluaciones.filter((e) => e.jugadorId === id && e.estado === "borrador"),
    [evaluaciones, id],
  );

  const resultados = useMemo(
    () => finalizadas.map((e) => calcular(e, rubrica)),
    [finalizadas, rubrica],
  );

  if (!jugador) return <p className="vacio">No encontramos ese jugador.</p>;

  const actual = resultados[0] ?? null;
  const previo = resultados[1] ?? null;

  const ejes = rubrica.categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    icono: c.icono,
    descripcion: c.descripcion,
  }));

  const series: SerieRadar[] = resultados.slice(0, 3).map((r, i) => ({
    id: r.evaluacion.id,
    etiqueta: fechaCompacta(r.evaluacion.fecha),
    color: COLORES_SERIE[i],
    valores: ejes.map(
      (eje) => r.categorias.find((c) => c.categoriaId === eje.id)?.puntaje ?? null,
    ),
    rellena: i === 0,
    discontinua: i === 2,
  }));

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Ficha del jugador · {jugador.codigo}</span>
          <h1>{nombreCompleto(jugador)}</h1>
        </div>
        <div className="page-head__acciones">
          <Link to={`/jugadores/${jugador.id}/editar`} className="btn btn--fantasma">Editar ficha</Link>
          <Link to={`/jugadores/${jugador.id}/evaluar`} className="btn btn--primario">
            Nueva evaluación
          </Link>
        </div>
      </div>

      {borradores.length > 0 && (
        <div className="aviso" role="status">
          <strong>Hay {borradores.length === 1 ? "una evaluación" : `${borradores.length} evaluaciones`} sin terminar.</strong>{" "}
          {borradores.map((b) => (
            <Link key={b.id} to={`/evaluaciones/${b.id}`} style={{ marginRight: 10 }}>
              Retomar la del {fechaCorta(b.fecha)}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid--ficha">
        <div style={{ display: "grid", gap: 16 }}>
          <div className="card">
            <div className="card__cuerpo">
              <Foto jugador={jugador} />
              <dl className="datos-ficha">
                <Dato rotulo="Categoría" valor={jugador.categoria} />
                <Dato rotulo="Posición" valor={jugador.posicion} />
                <Dato rotulo="Pie hábil" valor={jugador.pieHabil} />
                <Dato
                  rotulo="Fecha de nacimiento"
                  valor={`${fechaCorta(jugador.fechaNacimiento)} (${
                    edadEn(jugador.fechaNacimiento, hoyISO()) ?? "—"
                  } años)`}
                />
                <Dato rotulo="Altura" valor={jugador.alturaCm ? `${jugador.alturaCm} cm` : "—"} />
                <Dato rotulo="Dorsal" valor={jugador.dorsal || "—"} />
                <Dato rotulo="En la escuela desde" valor={fechaCorta(jugador.ingreso)} />
                <Dato rotulo="Apoderado" valor={jugador.apoderado.nombre || "—"} />
                <Dato rotulo="Contacto" valor={jugador.apoderado.email || jugador.apoderado.telefono || "—"} />
              </dl>
            </div>
          </div>

          {actual && (
            <div className="card card--oscura">
              <div className="card__cuerpo">
                <div className="campo__label" style={{ color: "var(--gris-100)" }}>
                  Puntaje general
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span className="puntaje" style={{ fontSize: 54, color: "var(--rama-futbol)" }}>
                    {actual.general}
                    <small style={{ color: "var(--gris-200)" }}>/100</small>
                  </span>
                  {previo && <Delta valor={delta(actual.general, previo.general)} />}
                </div>
                <div style={{ marginTop: 4 }}>
                  <NivelTexto nivel={actual.nivel} />
                </div>
                <p style={{ margin: "10px 0 0", fontSize: 13, color: "var(--gris-100)" }}>
                  Última evaluación: {fechaLarga(actual.evaluacion.fecha)}
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {resultados.length === 0 ? (
            <div className="card">
              <div className="card__cuerpo">
                <Vacio titulo="Sin evaluaciones todavía">
                  <p>
                    Cuando registre la primera evaluación aparecerá aquí la tela de araña y el
                    informe para los padres.
                  </p>
                  <Link to={`/jugadores/${jugador.id}/evaluar`} className="btn btn--primario">
                    Evaluar ahora
                  </Link>
                </Vacio>
              </div>
            </div>
          ) : (
            <>
              <div className="card">
                <h2 className="card__titulo">Comparativo de evaluaciones</h2>
                <div className="card__cuerpo">
                  <RadarChart ejes={ejes} series={series} ancho={700} alto={560} />
                </div>
              </div>

              <div className="card">
                <h2 className="card__titulo">Niveles por categoría</h2>
                <div className="card__cuerpo">
                  {actual.categorias.map((cat) => (
                    <BarraCategoria
                      key={cat.categoriaId}
                      resultado={cat}
                      deltaValor={
                        previo
                          ? delta(
                              cat.puntaje,
                              previo.categorias.find((c) => c.categoriaId === cat.categoriaId)
                                ?.puntaje ?? null,
                            )
                          : null
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="card">
                <h2 className="card__titulo">Historial</h2>
                <div className="tabla-scroll">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Entrenador</th>
                        <th className="num">General</th>
                        <th>Nivel</th>
                        <th className="num">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.map((r, i) => (
                        <tr key={r.evaluacion.id}>
                          <td>{fechaCorta(r.evaluacion.fecha)}</td>
                          <td>{r.evaluacion.entrenador || "—"}</td>
                          <td className="num">
                            <Puntaje valor={r.general} tamano={19} sufijo={false} />{" "}
                            {i + 1 < resultados.length && (
                              <Delta valor={delta(r.general, resultados[i + 1].general)} />
                            )}
                          </td>
                          <td><NivelTexto nivel={r.nivel} /></td>
                          <td className="num">
                            <Link to={`/informe/${r.evaluacion.id}`} className="btn btn--fantasma btn--sm">
                              Informe
                            </Link>{" "}
                            <button
                              type="button"
                              className="btn btn--fantasma btn--sm"
                              onClick={() => {
                                if (window.confirm("¿Eliminar esta evaluación del historial?")) {
                                  void eliminarEvaluacion(r.evaluacion.id);
                                }
                              }}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Dato({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="dato">
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
