import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDatos } from "../data/DatosContext";
import { Foto } from "../components/Foto";
import { NivelTexto, Puntaje, Vacio } from "../components/ui";
import { calcular, fechaCorta, historial, nombreCompleto } from "../domain/scoring";
import type { Jugador } from "../domain/types";

export function Jugadores() {
  const { jugadores, evaluaciones, rubrica } = useDatos();
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
        general: ultima ? calcular(ultima, rubrica).general : null,
        fecha: ultima?.fecha ?? "",
        total: previas.length,
      });
    }
    return mapa;
  }, [jugadores, evaluaciones, rubrica]);

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
              <FilaJugador jugador={jugador} resumen={resumenPorJugador.get(jugador.id)} />
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
}: {
  jugador: Jugador;
  resumen?: { general: number | null; fecha: string; total: number };
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
