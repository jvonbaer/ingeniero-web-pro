import { useRef, useState } from "react";
import { useDatos } from "../data/DatosContext";
import { Campo } from "../components/ui";
import { validarBackup } from "../data/store";
import {
  borrarConexion,
  conexion,
  conexionManual,
  guardarConexion,
  validarConexion,
} from "../data/conexion";
import { revisarInstalacion, type Prueba } from "../data/diagnostico";
import { datosDemo } from "../data/seed";
import { estadoPago } from "../domain/camisetas";
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
    jugadores, evaluaciones, camisetas, configuracion, modo, etiquetaModo,
    exportar, importar, recargar,
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
        `El respaldo trae ${backup.jugadores.length} jugadores, ${backup.evaluaciones.length} evaluaciones y ${backup.camisetas.length} camisetas. Reemplazará todo lo que hay ahora. ¿Continuar?`,
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
  const porCobrar = camisetas.filter((c) => estadoPago(c) !== "pagado").length;

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
              <div className="dato"><dt>Camisetas inscritas</dt><dd>{camisetas.length}</dd></div>
              <div className="dato"><dt>Camisetas por cobrar</dt><dd>{porCobrar}</dd></div>
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
                Un solo archivo con jugadores, evaluaciones, camisetas y parámetros. Sirve para
                mover todo a otro dispositivo o para recuperar la información si algo pasa.
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

          <ConexionNube />

          <RevisionInstalacion />

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


/**
 * Conexión con Supabase desde la propia aplicación.
 *
 * Existe porque la forma más simple de publicar esto es arrastrar la carpeta
 * compilada a Netlify, y ahí no hay dónde poner variables de entorno. Sin esta
 * pantalla, pasar a la nube obligaría a instalar Node y recompilar.
 */
function ConexionNube() {
  const [url, setUrl] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);

  function conectar() {
    const problema = validarConexion(url, clave);
    if (problema) {
      setError(problema);
      return;
    }
    guardarConexion(url, clave);
    // La aplicación elige el almacenamiento al arrancar, así que hay que
    // recargar para que tome la nube.
    window.location.reload();
  }

  function desconectar() {
    if (!window.confirm("¿Desconectar la nube y volver a guardar en este dispositivo?")) return;
    borrarConexion();
    window.location.reload();
  }

  if (conexion) {
    return (
      <div className="card">
        <h2 className="card__titulo">Conexión con la nube</h2>
        <div className="card__cuerpo">
          <dl className="datos-ficha" style={{ marginTop: 0 }}>
            <div className="dato">
              <dt>Proyecto</dt>
              <dd style={{ wordBreak: "break-all" }}>{conexion.url}</dd>
            </div>
            <div className="dato">
              <dt>Clave anónima</dt>
              <dd>{conexion.anonKey.slice(0, 8)}…{conexion.anonKey.slice(-4)}</dd>
            </div>
            <div className="dato">
              <dt>Configurada desde</dt>
              <dd>{conexionManual ? "esta pantalla" : "la compilación"}</dd>
            </div>
          </dl>

          {conexionManual ? (
            <>
              <p className="campo__ayuda" style={{ margin: "12px 0" }}>
                La conexión vive en este navegador. En cada dispositivo nuevo hay que pegar los
                mismos dos valores una vez.
              </p>
              <button type="button" className="btn btn--fantasma btn--sm" onClick={desconectar}>
                Desconectar
              </button>
            </>
          ) : (
            <p className="campo__ayuda" style={{ margin: "12px 0 0" }}>
              Viene de las variables del momento de compilar. Para cambiarla, ajuste el archivo
              <code> .env</code> y vuelva a publicar.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card__titulo">Conexión con la nube</h2>
      <div className="card__cuerpo">
        <p style={{ marginTop: 0, fontSize: 14 }}>
          Hoy los datos se guardan sólo en este dispositivo. Para que todos los entrenadores vean lo
          mismo, pegue los dos valores del proyecto de Supabase: están en{" "}
          <strong>Project Settings → API</strong>.
        </p>

        <Campo
          label="Project URL"
          ayuda="Se ve así: https://abcdefgh.supabase.co"
          error={error ?? undefined}
        >
          <input
            className="input"
            value={url}
            placeholder="https://abcdefgh.supabase.co"
            onChange={(e) => setUrl(e.target.value)}
          />
        </Campo>

        <Campo
          label="Clave anónima (anon public)"
          ayuda="Es el texto largo, no la clave de servicio. Puede ir a la vista: lo que protege los datos son las políticas del esquema, no esconderla."
        >
          <input
            className="input"
            value={clave}
            placeholder="eyJhbGciOi…"
            onChange={(e) => setClave(e.target.value)}
          />
        </Campo>

        <button
          type="button"
          className="btn btn--primario"
          onClick={conectar}
          disabled={!url.trim() || !clave.trim()}
        >
          Conectar con la nube
        </button>

        <p className="campo__ayuda" style={{ marginTop: 12 }}>
          Antes de conectar, descargue un respaldo: al pasar a la nube la aplicación muestra lo que
          haya allá, y lo de este dispositivo se sube con <strong>Cargar respaldo</strong>.
        </p>
      </div>
    </div>
  );
}

/**
 * Revisión paso a paso de la instalación en la nube.
 *
 * Conectar Supabase son cuatro cosas en dos sitios distintos y ninguna avisa
 * cuando falta: el entrenador se entera recién cuando la aplicación falla en
 * medio de una evaluación. Esta tarjeta las prueba de a una —incluida una
 * escritura real que se borra sola— y dice cuál falta y qué hacer.
 */
function RevisionInstalacion() {
  const [url, setUrl] = useState(conexion?.url ?? "");
  const [clave, setClave] = useState(conexion?.anonKey ?? "");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [pruebas, setPruebas] = useState<Prueba[] | null>(null);
  const [revisando, setRevisando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revisar() {
    setRevisando(true);
    setError(null);
    setPruebas(null);
    try {
      setPruebas(
        await revisarInstalacion({
          url,
          anonKey: clave,
          correo: correo.trim() || undefined,
          clave: contrasena || undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar la revisión.");
    } finally {
      setRevisando(false);
    }
  }

  const fallas = pruebas?.filter((p) => p.estado === "falla").length ?? 0;
  const sinProbar = pruebas?.filter((p) => p.estado === "omitida").length ?? 0;

  return (
    <div className="card">
      <h2 className="card__titulo">Revisar la instalación</h2>
      <div className="card__cuerpo">
        <p style={{ marginTop: 0, fontSize: 14 }}>
          Comprueba una por una las cosas que hay que dejar hechas en Supabase y dice cuál falta.
          Incluye guardar una ficha de prueba, que se borra sola: es la única forma de saber que
          los permisos de escritura quedaron puestos.
        </p>

        <div className="revision__campos">
          <Campo label="Project URL" ayuda="Project Settings → API">
            <input
              className="input"
              value={url}
              placeholder="https://abcdefgh.supabase.co"
              onChange={(e) => setUrl(e.target.value)}
            />
          </Campo>
          <Campo label="Clave anónima (anon public)">
            <input
              className="input"
              value={clave}
              placeholder="eyJhbGciOi…"
              onChange={(e) => setClave(e.target.value)}
            />
          </Campo>
        </div>

        <p className="campo__ayuda" style={{ margin: "4px 0 10px" }}>
          El correo y la clave de un entrenador son opcionales, pero sin ellos sólo se puede revisar
          la mitad: la cuenta, los permisos de lectura y los de escritura quedan sin probar. No se
          guardan en ninguna parte ni se cierra la sesión que tenga abierta.
        </p>

        <div className="revision__campos">
          <Campo label="Correo del entrenador">
            <input
              className="input"
              type="email"
              autoComplete="off"
              value={correo}
              placeholder="entrenador@ejemplo.cl"
              onChange={(e) => setCorreo(e.target.value)}
            />
          </Campo>
          <Campo label="Su clave">
            <input
              className="input"
              type="password"
              autoComplete="off"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
          </Campo>
        </div>

        <button
          type="button"
          className="btn btn--primario"
          onClick={() => void revisar()}
          disabled={revisando || !url.trim() || !clave.trim()}
        >
          {revisando ? "Revisando…" : "Revisar la instalación"}
        </button>

        {error && <p className="campo__error" style={{ marginTop: 10 }}>{error}</p>}

        {pruebas && (
          <>
            <ul className="revision">
              {pruebas.map((prueba) => (
                <li key={prueba.id} className={`revision__item revision__item--${prueba.estado}`}>
                  <MarcaPrueba estado={prueba.estado} />
                  <div>
                    <div className="revision__titulo">{prueba.titulo}</div>
                    <p className="revision__detalle">{prueba.detalle}</p>
                    {prueba.remedio && <p className="revision__remedio">{prueba.remedio}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <p className="revision__resumen">{resumen(fallas, sinProbar)}</p>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Una revisión a medias no es una revisión aprobada: mientras queden pruebas sin
 * correr hay que decirlo, o el entrenador se va tranquilo con la mitad hecha.
 */
function resumen(fallas: number, sinProbar: number): string {
  if (fallas > 0) {
    const plural = fallas > 1;
    const cola = sinProbar > 0 ? `, y ${sinProbar} sin probar` : "";
    return `Falta${plural ? "n" : ""} ${fallas} ${plural ? "cosas" : "cosa"} por corregir${cola}.`;
  }
  if (sinProbar > 0) {
    return `Bien hasta donde se pudo revisar, pero ${sinProbar} ${
      sinProbar > 1 ? "pruebas quedaron" : "prueba quedó"
    } sin correr.`;
  }
  return "Todo lo indispensable está hecho. La escuela puede empezar a cargar jugadores.";
}

/** Marca de estado dibujada, no un emoji: el sistema CGA no admite color ajeno. */
function MarcaPrueba({ estado }: { estado: Prueba["estado"] }) {
  const trazos: Record<Prueba["estado"], string> = {
    ok: "M5.5 10.5 L8.7 13.7 L14.5 6.5",
    falla: "M6 6 L14 14 M14 6 L6 14",
    aviso: "M10 5.6 L10 11 M10 13.6 L10 14.4",
    omitida: "M6 10 L14 10",
  };
  const etiquetas: Record<Prueba["estado"], string> = {
    ok: "Correcto",
    falla: "Falta",
    aviso: "Con reparo",
    omitida: "Sin probar",
  };

  return (
    <svg
      className="revision__marca"
      viewBox="0 0 20 20"
      role="img"
      aria-label={etiquetas[estado]}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="9" strokeWidth="1.4" opacity="0.35" />
      <path d={trazos[estado]} />
    </svg>
  );
}
