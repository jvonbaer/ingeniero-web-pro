import { useRef, useState } from "react";
import { useDatos } from "../data/DatosContext";
import { validarBackup } from "../data/store";
import { datosDemo } from "../data/seed";
import {
  calcular,
  fechaCorta,
  historial,
  nombreCompleto,
  pautaDeEvaluacion,
} from "../domain/scoring";

function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

const HOY = () => new Date().toISOString().slice(0, 10);

export function Datos() {
  const {
    jugadores, evaluaciones, configuracion, modo, etiquetaModo, exportar, importar, recargar,
  } = useDatos();
  const archivo = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function exportarRespaldo() {
    descargar(
      `respaldo-escuela-futbol-cga-${HOY()}.json`,
      JSON.stringify(exportar(), null, 2),
      "application/json",
    );
    setAviso("Respaldo descargado. Guárdelo en Drive o en el correo del club.");
  }

  /** Planilla plana, una fila por evaluación, para abrir en Excel o Sheets. */
  function exportarPlanilla() {
    // Las columnas salen de la unión de los ejes de todas las pautas: así una
    // escuela con pautas distintas por categoría igual obtiene una sola tabla.
    const ejes = new Map<string, string>();
    for (const pauta of configuracion.pautas) {
      for (const categoria of pauta.categorias) {
        if (!ejes.has(categoria.id)) ejes.set(categoria.id, categoria.nombre.toLowerCase());
      }
    }

    const columnas = [
      "codigo", "nombre", "categoria", "posicion", "fecha", "temporada", "entrenador", "pauta",
      ...ejes.values(),
      "general", "nivel", "observaciones",
    ];

    const filas = evaluaciones
      .filter((e) => e.estado === "finalizada")
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
      .map((evaluacion) => {
        const jugador = jugadores.find((j) => j.id === evaluacion.jugadorId);
        const pauta = pautaDeEvaluacion(configuracion, evaluacion, jugador);
        const r = calcular(evaluacion, pauta);
        return [
          jugador?.codigo ?? "",
          jugador ? nombreCompleto(jugador) : "",
          jugador?.categoria ?? "",
          jugador?.posicion ?? "",
          evaluacion.fecha,
          evaluacion.temporada,
          evaluacion.entrenador,
          pauta.nombre,
          ...[...ejes.keys()].map(
            (id) => r.categorias.find((x) => x.categoriaId === id)?.puntaje ?? "",
          ),
          r.general ?? "",
          r.nivel?.etiqueta ?? "",
          evaluacion.observaciones.replace(/\s+/g, " "),
        ];
      });

    const escapar = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [columnas, ...filas].map((f) => f.map(escapar).join(";")).join("\r\n");
    // El BOM hace que Excel en español respete las tildes.
    descargar(`evaluaciones-cga-${HOY()}.csv`, `﻿${csv}`, "text/csv;charset=utf-8");
    setAviso("Planilla descargada. Se abre directamente en Excel o Google Sheets.");
  }

  async function importarArchivo(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const backup = validarBackup(JSON.parse(await file.text()));
      const seguro = window.confirm(
        `El respaldo trae ${backup.jugadores.length} jugadores y ${backup.evaluaciones.length} evaluaciones. Reemplazará todo lo que hay ahora. ¿Continuar?`,
      );
      if (!seguro) return;
      await importar(backup);
      setAviso("Respaldo cargado correctamente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  }

  async function cargarDemo() {
    const seguro = window.confirm(
      "Se cargarán cuatro jugadores de ejemplo con su historial, reemplazando los datos actuales. ¿Continuar?",
    );
    if (!seguro) return;
    await importar(datosDemo());
    setAviso("Datos de demostración cargados. Abra la ficha de Matías Rodríguez para ver la tela de araña con tres evaluaciones.");
  }

  const conEvaluacion = jugadores.filter((j) => historial(evaluaciones, j.id).length > 0).length;

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Administración</span>
          <h1>Datos y respaldos</h1>
        </div>
        <div className="page-head__acciones">
          <button type="button" className="btn btn--fantasma" onClick={() => void recargar()}>
            Recargar
          </button>
        </div>
      </div>

      {aviso && <div className="aviso aviso--ok">{aviso}</div>}
      {error && <div className="aviso" role="alert">{error}</div>}

      <div className="grid grid--2">
        <div className="card">
          <h2 className="card__titulo">Dónde se están guardando los datos</h2>
          <div className="card__cuerpo">
            <p style={{ marginTop: 0 }}>
              <span className={`chip ${modo === "nube" ? "chip--acento" : "chip--oscuro"}`}>
                {etiquetaModo}
              </span>
            </p>
            {modo === "local" ? (
              <p style={{ fontSize: 14 }}>
                Todo vive en <strong>este navegador</strong>, en este dispositivo. Funciona sin
                internet y no cuesta nada, pero los datos no se comparten con otro entrenador y se
                pierden si se borra el navegador. Descargue un respaldo cada vez que termine una
                jornada de evaluaciones.
              </p>
            ) : (
              <p style={{ fontSize: 14 }}>
                Los datos se guardan en la <strong>base compartida</strong>. Cualquier entrenador
                con el enlace y su clave ve la misma información desde su propio teléfono o tablet.
              </p>
            )}
            <dl className="datos-ficha">
              <div className="dato"><dt>Jugadores</dt><dd>{jugadores.length}</dd></div>
              <div className="dato"><dt>Con al menos una evaluación</dt><dd>{conEvaluacion}</dd></div>
              <div className="dato"><dt>Evaluaciones finalizadas</dt><dd>{evaluaciones.filter((e) => e.estado === "finalizada").length}</dd></div>
              <div className="dato"><dt>Borradores pendientes</dt><dd>{evaluaciones.filter((e) => e.estado === "borrador").length}</dd></div>
              <div className="dato"><dt>Pautas de evaluación</dt><dd>{configuracion.pautas.length}</dd></div>
              <div className="dato"><dt>Evaluadores</dt><dd>{configuracion.entrenadores.length}</dd></div>
              <div className="dato"><dt>Última actualización</dt><dd>{fechaCorta(configuracion.actualizadaEn.slice(0, 10))}</dd></div>
            </dl>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div className="card">
            <h2 className="card__titulo">Respaldo completo</h2>
            <div className="card__cuerpo">
              <p style={{ marginTop: 0, fontSize: 14 }}>
                Un solo archivo con jugadores, evaluaciones y parámetros. Sirve para mover todo a
                otro dispositivo o para recuperar la información si algo pasa.
              </p>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                <button type="button" className="btn btn--primario" onClick={exportarRespaldo}>
                  Descargar respaldo
                </button>
                <button
                  type="button"
                  className="btn btn--fantasma"
                  onClick={() => archivo.current?.click()}
                >
                  Cargar respaldo
                </button>
              </div>
              <input
                ref={archivo}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  void importarArchivo(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="card">
            <h2 className="card__titulo">Planilla de evaluaciones</h2>
            <div className="card__cuerpo">
              <p style={{ marginTop: 0, fontSize: 14 }}>
                Una fila por evaluación, con el puntaje de cada categoría. Útil para revisar la
                temporada completa o compartirla con el directorio.
              </p>
              <button type="button" className="btn btn--fantasma" onClick={exportarPlanilla}>
                Descargar planilla (CSV)
              </button>
            </div>
          </div>

          <div className="card">
            <h2 className="card__titulo">Datos de demostración</h2>
            <div className="card__cuerpo">
              <p style={{ marginTop: 0, fontSize: 14 }}>
                Carga cuatro jugadores de ejemplo con historial, para ver cómo queda todo antes de
                ingresar a los jugadores reales.
              </p>
              <button type="button" className="btn btn--fantasma" onClick={() => void cargarDemo()}>
                Cargar ejemplo
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
