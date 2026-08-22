import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDatos } from "../data/DatosContext";
import { EntradaFoto } from "../components/Foto";
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
  pautaDeCategoria,
  pautaDeEvaluacion,
} from "../domain/scoring";

const COLORES_SERIE = [
  "var(--serie-1)",
  "var(--serie-2)",
  "var(--serie-3)",
];

export function JugadorFicha() {
  const { id = "" } = useParams();
  const { jugadores, evaluaciones, configuracion, eliminarEvaluacion, guardarJugador } = useDatos();
  const [estadoFoto, setEstadoFoto] = useState<string | null>(null);

  const jugador = useMemo(() => jugadores.find((j) => j.id === id), [jugadores, id]);
  const finalizadas = useMemo(() => historial(evaluaciones, id), [evaluaciones, id]);
  const borradores = useMemo(
    () => evaluaciones.filter((e) => e.jugadorId === id && e.estado === "borrador"),
    [evaluaciones, id],
  );

  /**
   * El historial se lee con la pauta de la evaluación más reciente: es la vara
   * con la que se está midiendo hoy al jugador. Las evaluaciones anteriores se
   * vuelven a medir contra ella, así la tela de araña compara manzanas con
   * manzanas aunque el niño haya cambiado de categoría por el camino.
   */
  const pautaVigente = useMemo(() => {
    const ultima = finalizadas[0];
    return ultima
      ? pautaDeEvaluacion(configuracion, ultima, jugador)
      : pautaDeCategoria(configuracion, jugador?.categoria ?? "");
  }, [configuracion, finalizadas, jugador]);

  const resultados = useMemo(
    () => finalizadas.map((e) => calcular(e, pautaVigente)),
    [finalizadas, pautaVigente],
  );

  const conOtraPauta = useMemo(
    () => finalizadas.filter((e) => e.pautaId !== pautaVigente.id).length,
    [finalizadas, pautaVigente],
  );

  if (!jugador) return <p className="vacio">No encontramos ese jugador.</p>;

  const ficha = jugador;

  /**
   * La foto se guarda en el momento, sin pasar por el formulario ni por un botón
   * de confirmar: el entrenador la toma en la cancha y queda en la ficha.
   */
  async function guardarFoto(fotoDataUrl: string | null) {
    setEstadoFoto("Guardando…");
    try {
      await guardarJugador({ ...ficha, fotoDataUrl });
      setEstadoFoto(fotoDataUrl ? "Foto guardada en la ficha." : "Foto quitada de la ficha.");
    } catch {
      setEstadoFoto(null); // el error ya se muestra en la barra superior
    }
  }

  const actual = resultados[0] ?? null;
  const previo = resultados[1] ?? null;

  const ejes = pautaVigente.categorias.map((c) => ({
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
          <Link
            to={`/hoja/${pautaVigente.id}/${jugador.id}`}
            className="btn btn--fantasma"
            title="Imprimir la pauta para evaluarlo a mano en la cancha"
          >
            Hoja en papel
          </Link>
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
              <EntradaFoto
                valor={jugador.fotoDataUrl}
                onCambio={(v) => void guardarFoto(v)}
                nombre={nombreCompleto(jugador)}
                mensaje={estadoFoto}
              />
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
                <h2 className="card__titulo">
                  Comparativo de evaluaciones
                  <span className="chip chip--acento" style={{ marginLeft: "auto" }}>
                    Pauta {pautaVigente.nombre}
                  </span>
                </h2>
                <div className="card__cuerpo">
                  <RadarChart ejes={ejes} series={series} ancho={700} alto={560} />
                  {conOtraPauta > 0 && (
                    <p className="campo__ayuda" style={{ marginTop: 4 }}>
                      {conOtraPauta === 1
                        ? "Una evaluación anterior se hizo con otra pauta"
                        : `${conOtraPauta} evaluaciones anteriores se hicieron con otra pauta`}
                      . Se vuelven a medir con la pauta actual, así que los sub-puntos que ya no
                      existen no cuentan y los que se agregaron aparecen vacíos.
                    </p>
                  )}
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
