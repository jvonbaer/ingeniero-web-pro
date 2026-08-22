import { useMemo, useState } from "react";
import { useDatos } from "../data/DatosContext";
import { Campo } from "../components/ui";
import { Icono, ICONOS_DISPONIBLES } from "../components/Iconos";
import { CATEGORIAS_EDAD, CONFIGURACION_BASE } from "../config/pautas";
import { hoyISO, indicadoresActivos, nuevoId } from "../domain/scoring";
import type { CategoriaRubrica, Configuracion, Pauta } from "../domain/types";

export function Parametros() {
  const { configuracion, evaluaciones, guardarConfiguracion } = useDatos();
  const [borrador, setBorrador] = useState<Configuracion>(configuracion);
  const [pautaEditada, setPautaEditada] = useState<string>(
    configuracion.pautas[0]?.id ?? "",
  );
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [nuevoEntrenador, setNuevoEntrenador] = useState("");

  const sucio = JSON.stringify(borrador) !== JSON.stringify(configuracion);
  const pauta = borrador.pautas.find((p) => p.id === pautaEditada) ?? borrador.pautas[0];

  /** Cuántas evaluaciones ya registradas se levantaron con cada pauta. */
  const usoPorPauta = useMemo(() => {
    const cuenta: Record<string, number> = {};
    for (const e of evaluaciones) cuenta[e.pautaId] = (cuenta[e.pautaId] ?? 0) + 1;
    return cuenta;
  }, [evaluaciones]);

  function editarPauta(cambios: Partial<Pauta>) {
    setBorrador((c) => ({
      ...c,
      pautas: c.pautas.map((p) => (p.id === pauta.id ? { ...p, ...cambios } : p)),
    }));
  }

  function editarCategoria(id: string, cambios: Partial<CategoriaRubrica>) {
    editarPauta({
      categorias: pauta.categorias.map((c) => (c.id === id ? { ...c, ...cambios } : c)),
    });
  }

  function editarIndicador(
    categoriaId: string,
    indicadorId: string,
    cambios: Partial<CategoriaRubrica["indicadores"][number]>,
  ) {
    editarPauta({
      categorias: pauta.categorias.map((c) =>
        c.id !== categoriaId
          ? c
          : {
              ...c,
              indicadores: c.indicadores.map((i) =>
                i.id === indicadorId ? { ...i, ...cambios } : i,
              ),
            },
      ),
    });
  }

  function agregarIndicador(categoriaId: string) {
    editarPauta({
      categorias: pauta.categorias.map((c) =>
        c.id !== categoriaId
          ? c
          : {
              ...c,
              indicadores: [
                ...c.indicadores,
                { id: nuevoId("ind"), nombre: "Nuevo sub-punto", ayuda: "", activo: true },
              ],
            },
      ),
    });
  }

  function agregarCategoria() {
    editarPauta({
      categorias: [
        ...pauta.categorias,
        {
          id: nuevoId("cat"),
          nombre: "Nueva categoría",
          descripcion: "",
          icono: "estrella",
          peso: 1,
          indicadores: [
            { id: nuevoId("ind"), nombre: "Nuevo sub-punto", ayuda: "", activo: true },
          ],
        },
      ],
    });
  }

  function quitarCategoria(id: string) {
    if (!window.confirm("¿Quitar esta categoría de las próximas evaluaciones con esta pauta?")) {
      return;
    }
    editarPauta({ categorias: pauta.categorias.filter((c) => c.id !== id) });
  }

  function nuevaPauta(desde?: Pauta) {
    const id = nuevoId("pauta");
    const copia: Pauta = desde
      ? { ...structuredClone(desde), id, nombre: `${desde.nombre} (copia)`, version: 1 }
      : {
          id,
          nombre: "Pauta nueva",
          descripcion: "",
          version: 1,
          actualizadaEn: hoyISO(),
          escalaMax: 5,
          etiquetasEscala: ["Inicial", "En progreso", "Aceptable", "Bueno", "Destacado"],
          categorias: [],
        };
    setBorrador((c) => ({ ...c, pautas: [...c.pautas, copia] }));
    setPautaEditada(id);
  }

  function eliminarPauta() {
    if (borrador.pautas.length <= 1) return;
    const usadas = usoPorPauta[pauta.id] ?? 0;
    const seguro = window.confirm(
      usadas > 0
        ? `Hay ${usadas} evaluaciones hechas con "${pauta.nombre}". No se borran, pero pasarán a leerse con la pauta de la categoría del jugador. ¿Continuar?`
        : `¿Eliminar la pauta "${pauta.nombre}"?`,
    );
    if (!seguro) return;

    const quedan = borrador.pautas.filter((p) => p.id !== pauta.id);
    const reemplazo =
      borrador.pautaPorDefecto === pauta.id ? quedan[0].id : borrador.pautaPorDefecto;

    setBorrador((c) => ({
      ...c,
      pautas: quedan,
      pautaPorDefecto: reemplazo,
      asignaciones: Object.fromEntries(
        Object.entries(c.asignaciones).map(([cat, id]) => [cat, id === pauta.id ? reemplazo : id]),
      ),
    }));
    setPautaEditada(quedan[0].id);
  }

  function agregarEntrenador() {
    const limpio = nuevoEntrenador.trim();
    if (!limpio || borrador.entrenadores.includes(limpio)) return;
    setBorrador((c) => ({ ...c, entrenadores: [...c.entrenadores, limpio] }));
    setNuevoEntrenador("");
  }

  async function guardar() {
    setGuardando(true);
    try {
      // Sólo sube de versión la pauta que efectivamente cambió: así el número de
      // versión sigue diciendo algo sobre esa pauta y no sobre el archivo entero.
      const pautas = borrador.pautas.map((p) => {
        const previa = configuracion.pautas.find((x) => x.id === p.id);
        const cambio = !previa || JSON.stringify({ ...previa, version: 0, actualizadaEn: "" }) !==
          JSON.stringify({ ...p, version: 0, actualizadaEn: "" });
        return cambio ? { ...p, version: (previa?.version ?? 0) + 1, actualizadaEn: hoyISO() } : p;
      });
      await guardarConfiguracion({ ...borrador, pautas, actualizadaEn: hoyISO() });
      setBorrador({ ...borrador, pautas, actualizadaEn: hoyISO() });
      setAviso("Parámetros guardados.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">
            {borrador.pautas.length} {borrador.pautas.length === 1 ? "pauta" : "pautas"} ·{" "}
            {borrador.entrenadores.length} evaluadores
          </span>
          <h1>Parámetros de evaluación</h1>
        </div>
        <div className="page-head__acciones">
          <button
            type="button"
            className="btn btn--fantasma"
            onClick={() => {
              if (window.confirm("¿Descartar los cambios y volver a los parámetros de fábrica?")) {
                setBorrador(CONFIGURACION_BASE);
                setPautaEditada(CONFIGURACION_BASE.pautas[0].id);
              }
            }}
          >
            Restaurar de fábrica
          </button>
          <button
            type="button"
            className="btn btn--primario"
            onClick={() => void guardar()}
            disabled={!sucio || guardando}
          >
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {aviso && <div className="aviso aviso--ok">{aviso}</div>}
      {sucio && (
        <div className="aviso">
          Hay cambios sin guardar. Nada de esto afecta a las {evaluaciones.length} evaluaciones ya
          registradas: cada una conserva la pauta y la versión con la que se levantó, y los
          sub-puntos que agregue o desactive <strong>no alteran los puntajes históricos</strong>.
        </div>
      )}

      {/* ---------- Evaluadores ---------- */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="card__titulo">Cuerpo técnico</h2>
        <div className="card__cuerpo">
          <p className="campo__ayuda" style={{ marginBottom: 12 }}>
            Este es el listado que aparece al empezar una evaluación. Elegir de una lista en vez de
            escribir el nombre evita que la misma persona quede registrada de tres formas distintas.
          </p>

          <ul className="lista-limpia" style={{ marginBottom: 14 }}>
            {borrador.entrenadores.map((nombre) => (
              <li key={nombre} className="fila-simple">
                <span className="fila-simple__texto">{nombre}</span>
                <button
                  type="button"
                  className="btn btn--fantasma btn--sm"
                  onClick={() =>
                    setBorrador((c) => ({
                      ...c,
                      entrenadores: c.entrenadores.filter((n) => n !== nombre),
                    }))
                  }
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>

          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <input
              className="input"
              style={{ flex: "1 1 220px", width: "auto" }}
              value={nuevoEntrenador}
              placeholder="Nombre y apellido"
              aria-label="Nuevo evaluador"
              onChange={(e) => setNuevoEntrenador(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregarEntrenador();
                }
              }}
            />
            <button
              type="button"
              className="btn btn--fantasma"
              onClick={agregarEntrenador}
              disabled={!nuevoEntrenador.trim()}
            >
              Agregar evaluador
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Asignación por categoría ---------- */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="card__titulo">Qué pauta usa cada categoría</h2>
        <div className="card__cuerpo">
          <p className="campo__ayuda" style={{ marginBottom: 14 }}>
            Al abrir una evaluación, la aplicación mira la categoría del jugador y levanta la pauta
            asignada aquí. El entrenador no tiene que elegirla ni puede equivocarse.
          </p>

          <div className="asignaciones">
            {CATEGORIAS_EDAD.map((categoria) => (
              <label key={categoria} className="asignacion">
                <span className="asignacion__categoria">{categoria}</span>
                <select
                  className="select"
                  value={borrador.asignaciones[categoria] ?? borrador.pautaPorDefecto}
                  onChange={(e) =>
                    setBorrador((c) => ({
                      ...c,
                      asignaciones: { ...c.asignaciones, [categoria]: e.target.value },
                    }))
                  }
                >
                  {borrador.pautas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <Campo
            label="Pauta por defecto"
            ayuda="Se usa si aparece una categoría que no está en el listado de arriba."
          >
            <select
              className="select"
              value={borrador.pautaPorDefecto}
              onChange={(e) => setBorrador((c) => ({ ...c, pautaPorDefecto: e.target.value }))}
            >
              {borrador.pautas.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </Campo>
        </div>
      </div>

      {/* ---------- Editor de la pauta ---------- */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="card__titulo">Contenido de las pautas</h2>
        <div className="card__cuerpo">
          <div className="filtros" style={{ marginBottom: 6 }}>
            <select
              className="select"
              value={pauta.id}
              aria-label="Pauta que se está editando"
              onChange={(e) => setPautaEditada(e.target.value)}
            >
              {borrador.pautas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — v{p.version}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn--fantasma btn--sm" onClick={() => nuevaPauta()}>
              Nueva pauta
            </button>
            <button
              type="button"
              className="btn btn--fantasma btn--sm"
              onClick={() => nuevaPauta(pauta)}
            >
              Duplicar
            </button>
            <button
              type="button"
              className="btn btn--fantasma btn--sm"
              onClick={eliminarPauta}
              disabled={borrador.pautas.length <= 1}
            >
              Eliminar
            </button>
          </div>

          <p className="campo__ayuda" style={{ marginBottom: 16 }}>
            {usoPorPauta[pauta.id] ?? 0} evaluaciones registradas con esta pauta ·{" "}
            {pauta.categorias.reduce((a, c) => a + indicadoresActivos(c).length, 0)} sub-puntos
            activos
          </p>

          <div className="grid grid--2">
            <Campo label="Nombre de la pauta">
              <input
                className="input"
                value={pauta.nombre}
                onChange={(e) => editarPauta({ nombre: e.target.value })}
              />
            </Campo>
            <Campo label="Descripción">
              <input
                className="input"
                value={pauta.descripcion}
                placeholder="Para qué edades o qué mira esta pauta"
                onChange={(e) => editarPauta({ descripcion: e.target.value })}
              />
            </Campo>
          </div>

          <div className="campo__label" style={{ margin: "6px 0 8px" }}>
            Escala de respuesta
          </div>
          <p className="campo__ayuda" style={{ marginBottom: 12 }}>
            Cada sub-punto se responde de 1 a {pauta.escalaMax}, y el valor se convierte a puntaje
            sobre 100 ({pauta.escalaMax} de {pauta.escalaMax} equivale a 100; 1 de{" "}
            {pauta.escalaMax}, a {Math.round((1 / pauta.escalaMax) * 100)}).
          </p>
          <div className="grid grid--3">
            {pauta.etiquetasEscala.map((etiqueta, i) => (
              <Campo key={i} label={`Nivel ${i + 1}`}>
                <input
                  className="input"
                  value={etiqueta}
                  onChange={(e) => {
                    const etiquetas = [...pauta.etiquetasEscala];
                    etiquetas[i] = e.target.value;
                    editarPauta({ etiquetasEscala: etiquetas });
                  }}
                />
              </Campo>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {pauta.categorias.map((categoria) => (
          <div key={categoria.id} className="card">
            <h2 className="card__titulo">
              <Icono nombre={categoria.icono} tamano={20} /> {categoria.nombre}
              <button
                type="button"
                className="btn btn--fantasma btn--sm"
                style={{ marginLeft: "auto" }}
                onClick={() => quitarCategoria(categoria.id)}
              >
                Quitar categoría
              </button>
            </h2>
            <div className="card__cuerpo">
              <div className="grid grid--3">
                <Campo label="Nombre de la categoría">
                  <input
                    className="input"
                    value={categoria.nombre}
                    onChange={(e) => editarCategoria(categoria.id, { nombre: e.target.value })}
                  />
                </Campo>
                <Campo label="Icono">
                  <select
                    className="select"
                    value={categoria.icono}
                    onChange={(e) => editarCategoria(categoria.id, { icono: e.target.value })}
                  >
                    {ICONOS_DISPONIBLES.map((i) => (
                      <option key={i.clave} value={i.clave}>{i.etiqueta}</option>
                    ))}
                  </select>
                </Campo>
                <Campo
                  label="Peso en el puntaje general"
                  ayuda="1 = peso normal. 1,5 pesa un 50 % más que las demás."
                >
                  <input
                    className="input"
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="3"
                    value={categoria.peso}
                    onChange={(e) =>
                      editarCategoria(categoria.id, { peso: Number(e.target.value) || 1 })
                    }
                  />
                </Campo>
              </div>

              <Campo label="Descripción (aparece junto al eje del gráfico)">
                <input
                  className="input"
                  value={categoria.descripcion}
                  onChange={(e) => editarCategoria(categoria.id, { descripcion: e.target.value })}
                />
              </Campo>

              <div className="campo__label" style={{ margin: "14px 0 8px" }}>
                Sub-puntos de evaluación
              </div>

              {categoria.indicadores.map((indicador) => (
                <div key={indicador.id} className="subpunto">
                  <input
                    className="input"
                    value={indicador.nombre}
                    aria-label="Nombre del sub-punto"
                    onChange={(e) =>
                      editarIndicador(categoria.id, indicador.id, { nombre: e.target.value })
                    }
                  />
                  <input
                    className="input"
                    value={indicador.ayuda}
                    placeholder="Qué mirar para puntuarlo"
                    aria-label="Ayuda del sub-punto"
                    onChange={(e) =>
                      editarIndicador(categoria.id, indicador.id, { ayuda: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className={`btn btn--sm ${indicador.activo ? "" : "btn--fantasma"}`}
                    aria-pressed={indicador.activo}
                    onClick={() =>
                      editarIndicador(categoria.id, indicador.id, { activo: !indicador.activo })
                    }
                  >
                    {indicador.activo ? "Activo" : "Inactivo"}
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="btn btn--fantasma btn--sm"
                onClick={() => agregarIndicador(categoria.id)}
              >
                + Agregar sub-punto
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <button type="button" className="btn btn--fantasma" onClick={agregarCategoria}>
          + Agregar categoría a «{pauta.nombre}» (un eje más en la tela de araña)
        </button>
      </div>
    </>
  );
}
