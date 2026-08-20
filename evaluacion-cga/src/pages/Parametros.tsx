import { useState } from "react";
import { useDatos } from "../data/DatosContext";
import { Campo } from "../components/ui";
import { Icono, ICONOS_DISPONIBLES } from "../components/Iconos";
import { RUBRICA_BASE } from "../config/rubrica";
import { nuevoId } from "../domain/scoring";
import type { CategoriaRubrica, Rubrica } from "../domain/types";

export function Parametros() {
  const { rubrica, evaluaciones, guardarRubrica } = useDatos();
  const [borrador, setBorrador] = useState<Rubrica>(rubrica);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const sucio = JSON.stringify(borrador) !== JSON.stringify(rubrica);
  const usos = evaluaciones.length;

  function editarCategoria(id: string, cambios: Partial<CategoriaRubrica>) {
    setBorrador((r) => ({
      ...r,
      categorias: r.categorias.map((c) => (c.id === id ? { ...c, ...cambios } : c)),
    }));
  }

  function editarIndicador(
    categoriaId: string,
    indicadorId: string,
    cambios: Partial<CategoriaRubrica["indicadores"][number]>,
  ) {
    setBorrador((r) => ({
      ...r,
      categorias: r.categorias.map((c) =>
        c.id !== categoriaId
          ? c
          : {
              ...c,
              indicadores: c.indicadores.map((i) =>
                i.id === indicadorId ? { ...i, ...cambios } : i,
              ),
            },
      ),
    }));
  }

  function agregarIndicador(categoriaId: string) {
    setBorrador((r) => ({
      ...r,
      categorias: r.categorias.map((c) =>
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
    }));
  }

  function agregarCategoria() {
    setBorrador((r) => ({
      ...r,
      categorias: [
        ...r.categorias,
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
    }));
  }

  function quitarCategoria(id: string) {
    if (!window.confirm("¿Quitar esta categoría de las próximas evaluaciones?")) return;
    setBorrador((r) => ({ ...r, categorias: r.categorias.filter((c) => c.id !== id) }));
  }

  async function guardar() {
    setGuardando(true);
    try {
      await guardarRubrica({
        ...borrador,
        version: rubrica.version + 1,
        actualizadaEn: new Date().toISOString().slice(0, 10),
      });
      setAviso(`Parámetros guardados como versión ${rubrica.version + 1}.`);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Versión {rubrica.version} · {rubrica.actualizadaEn}</span>
          <h1>Parámetros de evaluación</h1>
        </div>
        <div className="page-head__acciones">
          <button
            type="button"
            className="btn btn--fantasma"
            onClick={() => {
              if (window.confirm("¿Descartar los cambios y volver a la rúbrica original del club?")) {
                setBorrador({ ...RUBRICA_BASE, version: rubrica.version });
              }
            }}
          >
            Restaurar rúbrica base
          </button>
          <button type="button" className="btn btn--primario" onClick={() => void guardar()} disabled={!sucio || guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {aviso && <div className="aviso aviso--ok">{aviso}</div>}

      <div className="aviso">
        Cada vez que guarda, la rúbrica sube de versión y las {usos}{" "}
        {usos === 1 ? "evaluación ya registrada conserva" : "evaluaciones ya registradas conservan"}{" "}
        la suya. Agregar o desactivar sub-puntos <strong>no altera los puntajes históricos</strong>:
        el promedio de cada categoría se calcula sólo con los sub-puntos que esa evaluación
        respondió, así que la comparación en la tela de araña sigue siendo válida.
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="card__titulo">Escala de respuesta</h2>
        <div className="card__cuerpo">
          <p className="campo__ayuda" style={{ marginBottom: 12 }}>
            Cada sub-punto se responde en una escala de 1 a {borrador.escalaMax}. El valor se
            convierte a puntaje sobre 100 (por ejemplo, {borrador.escalaMax} de{" "}
            {borrador.escalaMax} equivale a 100 y 1 de {borrador.escalaMax} equivale a{" "}
            {Math.round((1 / borrador.escalaMax) * 100)}).
          </p>
          <div className="grid grid--3">
            {borrador.etiquetasEscala.map((etiqueta, i) => (
              <Campo key={i} label={`Nivel ${i + 1}`}>
                <input
                  className="input"
                  value={etiqueta}
                  onChange={(e) =>
                    setBorrador((r) => {
                      const etiquetas = [...r.etiquetasEscala];
                      etiquetas[i] = e.target.value;
                      return { ...r, etiquetasEscala: etiquetas };
                    })
                  }
                />
              </Campo>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {borrador.categorias.map((categoria) => (
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
                <div
                  key={indicador.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr) auto",
                    gap: 10,
                    alignItems: "start",
                    paddingBottom: 10,
                    marginBottom: 10,
                    borderBottom: "1px solid var(--borde)",
                  }}
                >
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
          + Agregar categoría (un eje más en la tela de araña)
        </button>
      </div>
    </>
  );
}
