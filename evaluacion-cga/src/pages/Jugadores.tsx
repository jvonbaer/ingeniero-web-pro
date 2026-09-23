import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDatos } from "../data/DatosContext";
import { Foto } from "../components/Foto";
import { NivelTexto, Puntaje, Vacio } from "../components/ui";
import {
  calcular,
  fechaCorta,
  historial,
  nombreCompleto,
  pautaDeEvaluacion,
} from "../domain/scoring";
import type { Jugador } from "../domain/types";

export function Jugadores() {
  const { jugadores, evaluaciones, configuracion } = useDatos();
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [verInactivos, setVerInactivos] = useState(false);

  const categorias = useMemo(
    () => [...new Set(jugadores.map((j) => j.categoria))].filter(Boolean).sort(),
    [jugadores],
  );

  const resumenPorJugador = useMemo(() => {
    const mapa = new Map<string, { general: number | null; fecha: string; total: number }>();
    for (const jugador of jugadores) {
      const previas = historial(evaluaciones, jugador.id);
      const ultima = previas[0];
      mapa.set(jugador.id, {
        general: ultima
          ? calcular(ultima, pautaDeEvaluacion(configuracion, ultima, jugador)).general
          : null,
        fecha: ultima?.fecha ?? "",
        total: previas.length,
      });
    }
    return mapa;
  }, [jugadores, evaluaciones, configuracion]);

  /**
   * Evaluaciones a medio llenar: tanto las que quedaron en borrador como las
   * que se finalizaron con indicadores sin responder. Las segundas son la
   * mayoría y hasta ahora no se notaban desde ninguna parte, porque en el
   * historial se ven igual que una completa. Se listan acá para que el
   * entrenador las vea al entrar y pueda ir directo a terminarlas.
   */
  const incompletas = useMemo(() => {
    const porId = new Map(jugadores.map((j) => [j.id, j]));
    const lista: { evaluacionId: string; jugador: Jugador; fecha: string; pct: number; faltan: number }[] = [];
    for (const e of evaluaciones) {
      const jugador = porId.get(e.jugadorId);
      if (!jugador) continue;
      const { categorias } = calcular(e, pautaDeEvaluacion(configuracion, e, jugador));
      const total = categorias.reduce((a, c) => a + c.total, 0);
      const respondidos = categorias.reduce((a, c) => a + c.respondidos, 0);
      if (total === 0 || respondidos >= total) continue;
      lista.push({
        evaluacionId: e.id,
        jugador,
        fecha: e.fecha,
        pct: Math.round((respondidos / total) * 100),
        faltan: total - respondidos,
      });
    }
    return lista.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }, [evaluaciones, jugadores, configuracion]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return jugadores
      .filter((j) => (verInactivos ? true : j.activo))
      .filter((j) => (categoria ? j.categoria === categoria : true))
      .filter((j) =>
        !texto
          ? true
          : `${nombreCompleto(j)} ${j.codigo} ${j.posicion}`.toLowerCase().includes(texto),
      )
      .sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), "es"));
  }, [jugadores, busqueda, categoria, verInactivos]);

  const pendientes = visibles.filter((j) => (resumenPorJugador.get(j.id)?.total ?? 0) === 0).length;

  // Se acotan al filtro activo para que la tarjeta y la lista digan lo mismo.
  const incompletasVisibles = useMemo(() => {
    const ids = new Set(visibles.map((j) => j.id));
    return incompletas.filter((i) => ids.has(i.jugador.id));
  }, [incompletas, visibles]);
  // La lista viene de la más reciente a la más antigua, así que el distintivo
  // de la fila se queda con la primera que aparece de cada jugador y cuenta
  // cuántas tiene: mostrar la más vieja sería lo menos útil.
  const incompletaPorJugador = useMemo(() => {
    const mapa = new Map<string, { pct: number; faltan: number; cuantas: number }>();
    for (const i of incompletasVisibles) {
      const previo = mapa.get(i.jugador.id);
      if (previo) previo.cuantas += 1;
      else mapa.set(i.jugador.id, { pct: i.pct, faltan: i.faltan, cuantas: 1 });
    }
    return mapa;
  }, [incompletasVisibles]);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Escuela de Fútbol CGA</span>
          <h1>Jugadores</h1>
        </div>
        <div className="page-head__acciones">
          <Link to="/jugadores/nuevo" className="btn btn--primario">+ Nuevo jugador</Link>
        </div>
      </div>

      {jugadores.length > 0 && (
        <div className="grid grid--metricas" style={{ marginBottom: 18 }}>
          <Tarjeta rotulo="Jugadores activos" valor={jugadores.filter((j) => j.activo).length} />
          <Tarjeta rotulo="Evaluaciones registradas" valor={evaluaciones.filter((e) => e.estado === "finalizada").length} />
          <Tarjeta rotulo="Sin evaluar todavía" valor={pendientes} destacar={pendientes > 0} />
          <Tarjeta
            rotulo="Evaluaciones incompletas"
            valor={incompletasVisibles.length}
            destacar={incompletasVisibles.length > 0}
          />
        </div>
      )}

      {incompletasVisibles.length > 0 && (
        <div className="aviso aviso--acento" role="status" style={{ marginBottom: 18 }}>
          <strong>
            {incompletasVisibles.length === 1
              ? "Hay 1 evaluación sin completar."
              : `Hay ${incompletasVisibles.length} evaluaciones sin completar.`}
          </strong>{" "}
          Se guardaron con indicadores en blanco. Entre a terminarlas:
          <ul className="lista-limpia" style={{ marginTop: 8 }}>
            {incompletasVisibles.map((i) => (
              <li key={i.evaluacionId} style={{ marginBottom: 4 }}>
                <Link to={`/evaluaciones/${i.evaluacionId}`}>
                  {nombreCompleto(i.jugador)}
                </Link>{" "}
                <span className="jugador-item__meta">
                  {fechaCorta(i.fecha)} · {i.pct}% respondido · faltan {i.faltan}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="filtros">
        <input
          className="input"
          type="search"
          placeholder="Buscar por nombre, código o posición…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar jugador"
        />
        <select
          className="select"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="button"
          className={`btn btn--sm ${verInactivos ? "" : "btn--fantasma"}`}
          onClick={() => setVerInactivos((v) => !v)}
          aria-pressed={verInactivos}
        >
          Incluir retirados
        </button>
      </div>

      {visibles.length === 0 ? (
        <Vacio titulo={jugadores.length === 0 ? "Todavía no hay jugadores" : "Sin resultados"}>
          {jugadores.length === 0 ? (
            <p>
              Cree la primera ficha con <strong>+ Nuevo jugador</strong>, o cargue un respaldo
              desde la sección <Link to="/datos">Datos</Link>.
            </p>
          ) : (
            <p>Pruebe con otro nombre o cambie el filtro de categoría.</p>
          )}
        </Vacio>
      ) : (
        <ul className="lista-limpia">
          {visibles.map((jugador) => (
            <li key={jugador.id}>
              <FilaJugador
                jugador={jugador}
                resumen={resumenPorJugador.get(jugador.id)}
                incompleta={incompletaPorJugador.get(jugador.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Tarjeta({ rotulo, valor, destacar }: { rotulo: string; valor: number; destacar?: boolean }) {
  return (
    <div className="card metrica">
      <div className="card__cuerpo">
        <div className="campo__label metrica__rotulo">{rotulo}</div>
        <div className="puntaje metrica__valor" style={destacar ? { color: "var(--cga-rojo)" } : undefined}>
          {valor}
        </div>
      </div>
    </div>
  );
}

function FilaJugador({
  jugador,
  resumen,
  incompleta,
}: {
  jugador: Jugador;
  resumen?: { general: number | null; fecha: string; total: number };
  incompleta?: { pct: number; faltan: number; cuantas: number };
}) {
  return (
    <Link to={`/jugadores/${jugador.id}`} className="jugador-item">
      <Foto jugador={jugador} mini />
      <div style={{ minWidth: 0 }}>
        <div className="jugador-item__nombre">{nombreCompleto(jugador)}</div>
        <div className="jugador-item__meta">
          <span className="chip" style={{ marginRight: 6 }}>{jugador.codigo}</span>
          {jugador.categoria} · {jugador.posicion}
          {!jugador.activo && " · Retirado"}
          {/* Va como span y no como Link: la fila entera ya es un ancla y
              anidar otra es inválido. El enlace directo está en el aviso de
              arriba; desde acá se entra por la ficha. */}
          {incompleta && (
            <span className="chip chip--rojo" style={{ marginLeft: 6 }}>
              {incompleta.cuantas > 1
                ? `${incompleta.cuantas} incompletas`
                : `Incompleta · ${incompleta.pct}%`}
            </span>
          )}
        </div>
      </div>
      <div className="jugador-item__score">
        <Puntaje valor={resumen?.general ?? null} tamano={26} sufijo={false} />
        <div className="jugador-item__meta">
          {resumen && resumen.total > 0 ? (
            <>
              {resumen.total} {resumen.total === 1 ? "evaluación" : "evaluaciones"} ·{" "}
              {fechaCorta(resumen.fecha)}
            </>
          ) : (
            <NivelTexto nivel={null} />
          )}
        </div>
      </div>
    </Link>
  );
}
