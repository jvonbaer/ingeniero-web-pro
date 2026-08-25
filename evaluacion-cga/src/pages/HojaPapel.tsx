import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useDatos } from "../data/DatosContext";
import { Escudo } from "../components/Marca";
import { Icono } from "../components/Iconos";
import {
  gruposDe,
  indicadoresActivos,
  nombreCompleto,
  pautaDeCategoria,
  pautaPorId,
} from "../domain/scoring";

const VALORES_CLUB = ["Trabajo en equipo", "Disciplina", "Respeto", "Pasión", "Superación"];

/** Renglón en blanco para escribir a mano. */
function Campo({ rotulo, valor, ancho }: { rotulo: string; valor?: string; ancho?: string }) {
  return (
    <div className="hoja__campo" style={ancho ? { flexBasis: ancho } : undefined}>
      <span className="hoja__campo-rotulo">{rotulo}</span>
      <span className="hoja__campo-linea">{valor ?? ""}</span>
    </div>
  );
}

function Renglones({ cantidad }: { cantidad: number }) {
  return (
    <div className="hoja__renglones">
      {Array.from({ length: cantidad }, (_, i) => (
        <span key={i} className="hoja__renglon" />
      ))}
    </div>
  );
}

/**
 * Hoja de evaluación para llenar a mano.
 *
 * Existe porque en la cancha se cae el internet, se acaba la batería o la tablet
 * se queda en el auto. El entrenador imprime la pauta, evalúa con lápiz, y
 * después transcribe los números en la aplicación —hay una vista compacta para
 * eso— y adjunta la foto de la hoja como respaldo.
 *
 * Es un documento que fluye, no un lienzo de medida fija como el informe: una
 * pauta con muchos sub-puntos ocupa dos hojas antes que salir apretada o
 * cortada.
 */
export function HojaPapel() {
  const { pautaId = "", jugadorId } = useParams();
  const { configuracion, jugadores } = useDatos();

  const jugador = useMemo(
    () => jugadores.find((j) => j.id === jugadorId),
    [jugadores, jugadorId],
  );

  const pauta = useMemo(() => {
    if (jugador) return pautaDeCategoria(configuracion, jugador.categoria);
    return pautaPorId(configuracion, pautaId) ?? configuracion.pautas[0];
  }, [configuracion, pautaId, jugador]);

  if (!pauta) return <p className="vacio">No encontramos esa pauta.</p>;

  const opciones = Array.from({ length: pauta.escalaMax }, (_, i) => i + 1);
  const totalSubpuntos = pauta.categorias.reduce((a, c) => a + indicadoresActivos(c).length, 0);

  return (
    <>
      <div className="page-head no-print">
        <div>
          <span className="eyebrow">Hoja para llenar a mano</span>
          <h1 style={{ fontSize: 26 }}>Pauta {pauta.nombre}</h1>
        </div>
        <div className="page-head__acciones">
          <Link
            to={jugador ? `/jugadores/${jugador.id}` : "/parametros"}
            className="btn btn--fantasma"
          >
            Volver
          </Link>
          <button type="button" className="btn btn--primario" onClick={() => window.print()}>
            Imprimir hoja
          </button>
        </div>
      </div>

      <div className="aviso aviso--acento no-print">
        Imprima en <strong>A4 vertical</strong>. Son {totalSubpuntos} sub-puntos, así que según la
        pauta puede ocupar dos hojas. Cuando termine de evaluar en la cancha, transcriba los números
        desde <strong>Nueva evaluación</strong> —tiene una vista que muestra todo en una pantalla— y
        adjunte la foto de la hoja como respaldo.
      </div>

      <div className="hoja">
        <header className="hoja__cabecera">
          <div className="hoja__marca">
            <Escudo tamano={42} />
            <div>
              <div className="hoja__marca-titulo">Escuela de Fútbol</div>
              <div className="hoja__marca-lema">Club Gimnástico Alemán · Temuco</div>
            </div>
          </div>
          <div className="hoja__titulo">
            <h2>Hoja de evaluación</h2>
            <p>Pauta {pauta.nombre} · v{pauta.version}</p>
          </div>
        </header>

        <section className="hoja__datos">
          <Campo rotulo="Jugador" valor={jugador ? nombreCompleto(jugador) : undefined} ancho="46%" />
          <Campo rotulo="Código" valor={jugador?.codigo} ancho="24%" />
          <Campo rotulo="Categoría" valor={jugador?.categoria} ancho="20%" />
          <Campo rotulo="Fecha" ancho="26%" />
          <Campo rotulo="Evaluador" ancho="40%" />
          <Campo rotulo="Temporada" ancho="20%" />
        </section>

        <p className="hoja__instruccion">
          Marque con una <strong>X</strong> el casillero que corresponda en cada sub-punto.
          {pauta.etiquetasEscala.map((etiqueta, i) => (
            <span key={etiqueta} className="hoja__escala-ref">
              <b>{i + 1}</b> {etiqueta}
            </span>
          ))}
          Deje en blanco lo que no alcanzó a observar: no cuenta en contra.
        </p>

        {pauta.categorias.map((categoria, iCat) => {
          const grupos = gruposDe(categoria);
          if (grupos.length === 0) return null;
          return (
            <section key={categoria.id} className="hoja__categoria">
              <h3 className="hoja__categoria-titulo">
                <Icono nombre={categoria.icono} tamano={17} />
                {iCat + 1}. {categoria.nombre}
                <span className="hoja__categoria-desc">{categoria.descripcion}</span>
              </h3>

              {grupos.map((grupo, iGrupo) => (
                <div key={grupo.nombre || `grupo-${iGrupo}`} className="hoja__grupo">
                  {grupo.nombre && (
                    <h4 className="hoja__grupo-titulo">
                      {iCat + 1}.{iGrupo + 1} {grupo.nombre}
                    </h4>
                  )}
                  <table className="hoja__tabla">
                    <tbody>
                      {grupo.indicadores.map((indicador) => (
                        <tr key={indicador.id}>
                          <td className="hoja__subpunto">
                            <b>{indicador.nombre}</b>
                            {indicador.etiquetas && (
                              <span>{indicador.etiquetas.join(" · ")}</span>
                            )}
                            {!indicador.etiquetas && indicador.ayuda && (
                              <span>{indicador.ayuda}</span>
                            )}
                          </td>
                          <td className="hoja__casilleros">
                            {opciones.map((valor) => (
                              <span key={valor} className="hoja__casillero">{valor}</span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="hoja__promedio">
                    Promedio <span className="hoja__linea"></span> / {pauta.escalaMax}
                  </p>
                </div>
              ))}
            </section>
          );
        })}

        <section className="hoja__categoria">
          <h3 className="hoja__categoria-titulo">Observaciones del entrenador</h3>
          <Renglones cantidad={5} />
        </section>

        <section className="hoja__categoria">
          <h3 className="hoja__categoria-titulo">Próximos objetivos</h3>
          <Renglones cantidad={3} />
        </section>

        <footer className="hoja__pie">
          <div className="hoja__firma">
            <span className="hoja__campo-linea" />
            <span className="hoja__campo-rotulo">Firma del evaluador</span>
          </div>
          <div className="hoja__valores">
            {VALORES_CLUB.map((valor) => (
              <span key={valor}>{valor}</span>
            ))}
          </div>
        </footer>
      </div>
    </>
  );
}
