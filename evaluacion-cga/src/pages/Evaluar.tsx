import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDatos } from "../data/DatosContext";
import { Campo, Puntaje } from "../components/ui";
import { Foto } from "../components/Foto";
import { Icono } from "../components/Iconos";
import {
  calcular,
  categoriasDePauta,
  historial,
  hoyISO,
  indicadoresActivos,
  nombreCompleto,
  nuevoId,
  pautaDeCategoria,
  pautaDeEvaluacion,
  temporadaDe,
} from "../domain/scoring";
import type { Configuracion, Evaluacion, Jugador, Pauta } from "../domain/types";

// Topes de largo. El informe A4 reserva un espacio fijo para estos dos textos y
// estos números son lo que cabe medido: seis líneas para las observaciones y dos
// por objetivo. Pasarse no da error, pero el apoderado recibiría la frase cortada
// en el PDF. Si cambia el alto de esos bloques en informe.css, recalcule acá.
const MAX_OBSERVACIONES = 380;
const MAX_OBJETIVO = 68;

function evaluacionVacia(jugadorId: string, pauta: Pauta): Evaluacion {
  const fecha = hoyISO();
  return {
    id: nuevoId("ev"),
    jugadorId,
    fecha,
    temporada: temporadaDe(fecha),
    entrenador: localStorage.getItem("cga.entrenador") ?? "",
    pautaId: pauta.id,
    pautaVersion: pauta.version,
    escalaMax: pauta.escalaMax,
    puntajes: {},
    observaciones: "",
    objetivos: ["", "", ""],
    estado: "borrador",
    creadaEn: new Date().toISOString(),
    actualizadaEn: new Date().toISOString(),
  };
}

export function Evaluar() {
  const { id, evaluacionId } = useParams();
  const navegar = useNavigate();
  const { jugadores, evaluaciones, configuracion, guardarEvaluacion, guardarConfiguracion } =
    useDatos();

  const existente = useMemo(
    () => evaluaciones.find((e) => e.id === evaluacionId),
    [evaluaciones, evaluacionId],
  );
  const jugadorId = existente?.jugadorId ?? id ?? "";
  const jugador = useMemo(
    () => jugadores.find((j) => j.id === jugadorId),
    [jugadores, jugadorId],
  );

  // La pauta no se elige: sale de la categoría del jugador. Un borrador que ya
  // existe conserva la suya, para que cambiar de categoría a mitad de camino no
  // le cambie las preguntas por debajo.
  const [borrador, setBorrador] = useState<Evaluacion>(
    () =>
      existente ??
      evaluacionVacia(jugadorId, pautaDeCategoria(configuracion, jugador?.categoria ?? "")),
  );

  const pauta = useMemo(
    () => pautaDeEvaluacion(configuracion, borrador, jugador),
    [configuracion, borrador, jugador],
  );
  const [paso, setPaso] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);

  const categorias = useMemo(
    () => pauta.categorias.filter((c) => indicadoresActivos(c).length > 0),
    [pauta],
  );

  const anterior = useMemo(() => {
    const previas = historial(evaluaciones, jugadorId).filter((e) => e.id !== borrador.id);
    return previas[0] ?? null;
  }, [evaluaciones, jugadorId, borrador.id]);

  // Cada paso arranca arriba: en tablet, la lista de preguntas es más alta que la pantalla.
  useEffect(() => {
    contenedor.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [paso]);

  if (!jugador) {
    return <p className="vacio">No encontramos ese jugador.</p>;
  }

  const totalPasos = categorias.length + 2; // datos + categorías + cierre
  const resultado = calcular(borrador, pauta);

  function actualizar(cambios: Partial<Evaluacion>) {
    setBorrador((b) => ({ ...b, ...cambios, actualizadaEn: new Date().toISOString() }));
  }

  function responder(indicadorId: string, valor: number) {
    setBorrador((b) => {
      const puntajes = { ...b.puntajes };
      // Volver a tocar la misma opción la deselecciona: permite dejar en blanco
      // un indicador que no se pudo observar ese día.
      if (puntajes[indicadorId] === valor) delete puntajes[indicadorId];
      else puntajes[indicadorId] = valor;
      return { ...b, puntajes, actualizadaEn: new Date().toISOString() };
    });
  }

  function copiarAnterior() {
    if (!anterior) return;
    actualizar({ puntajes: { ...anterior.puntajes } });
    setAviso("Se copiaron los puntajes de la evaluación anterior. Ajuste lo que haya cambiado.");
  }

  async function guardar(estado: Evaluacion["estado"]) {
    setGuardando(true);
    try {
      if (borrador.entrenador) localStorage.setItem("cga.entrenador", borrador.entrenador);
      const aGuardar: Evaluacion = {
        ...borrador,
        estado,
        objetivos: borrador.objetivos.map((o) => o.trim()).filter(Boolean),
        actualizadaEn: new Date().toISOString(),
      };
      await guardarEvaluacion(aGuardar);
      if (estado === "finalizada") navegar(`/informe/${aGuardar.id}`);
      else {
        setBorrador(aGuardar);
        setAviso("Borrador guardado. Puede retomarlo cuando quiera.");
      }
    } catch {
      /* el error ya se muestra en la barra superior */
    } finally {
      setGuardando(false);
    }
  }

  async function avanzar() {
    setAviso(null);
    if (paso < totalPasos - 1) {
      // Guarda al pasar de pantalla: si se corta la conexión o se cierra la
      // tablet a mitad de la evaluación, no se pierde lo respondido.
      await guardar("borrador").catch(() => undefined);
      setPaso((p) => p + 1);
      setAviso(null);
    }
  }

  return (
    <div className="encuesta" ref={contenedor}>
      <div className="page-head">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Foto jugador={jugador} mini />
          <div>
            <span className="eyebrow">Evaluación · {jugador.codigo}</span>
            <h1 style={{ fontSize: 26 }}>{nombreCompleto(jugador)}</h1>
          </div>
        </div>
        <div className="page-head__acciones">
          <Link to={`/jugadores/${jugador.id}`} className="btn btn--fantasma btn--sm">Salir</Link>
        </div>
      </div>

      <div className="encuesta__progreso" role="tablist" aria-label="Avance de la evaluación">
        {Array.from({ length: totalPasos }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === paso}
            aria-label={`Paso ${i + 1} de ${totalPasos}`}
            className={`encuesta__paso ${
              i === paso ? "encuesta__paso--activo" : i < paso ? "encuesta__paso--hecho" : ""
            }`}
            onClick={() => setPaso(i)}
          />
        ))}
      </div>

      {aviso && <div className="aviso aviso--ok">{aviso}</div>}

      <div className="card">
        {paso === 0 && (
          <PasoDatos
            borrador={borrador}
            actualizar={actualizar}
            anterior={anterior}
            onCopiar={copiarAnterior}
            jugador={jugador}
            pauta={pauta}
            configuracion={configuracion}
            onAgregarEntrenador={(nombre) =>
              guardarConfiguracion({
                ...configuracion,
                entrenadores: [...configuracion.entrenadores, nombre],
                actualizadaEn: hoyISO(),
              })
            }
          />
        )}

        {paso > 0 && paso <= categorias.length && (
          <PasoCategoria
            categoria={categorias[paso - 1]}
            indice={paso}
            total={categorias.length}
            pauta={pauta}
            borrador={borrador}
            onResponder={responder}
          />
        )}

        {paso === totalPasos - 1 && (
          <PasoCierre borrador={borrador} actualizar={actualizar} resultado={resultado} />
        )}
      </div>

      <div className="encuesta__pie no-print">
        <button
          type="button"
          className="btn btn--fantasma"
          onClick={() => setPaso((p) => Math.max(0, p - 1))}
          disabled={paso === 0}
        >
          Atrás
        </button>
        <span className="encuesta__contador">
          {Math.round(resultado.completitud * 100)}% respondido
        </span>
        {paso < totalPasos - 1 ? (
          <button type="button" className="btn btn--primario" onClick={() => void avanzar()} disabled={guardando}>
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--primario"
            onClick={() => void guardar("finalizada")}
            disabled={guardando || resultado.general === null}
          >
            {guardando ? "Guardando…" : "Finalizar y ver informe"}
          </button>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 12 }} className="no-print">
        <button
          type="button"
          className="btn btn--fantasma btn--sm"
          onClick={() => void guardar("borrador")}
          disabled={guardando}
        >
          Guardar borrador y seguir después
        </button>
      </div>
    </div>
  );
}

function PasoDatos({
  borrador,
  actualizar,
  anterior,
  onCopiar,
  jugador,
  pauta,
  configuracion,
  onAgregarEntrenador,
}: {
  borrador: Evaluacion;
  actualizar: (c: Partial<Evaluacion>) => void;
  anterior: Evaluacion | null;
  onCopiar: () => void;
  jugador: Jugador;
  pauta: Pauta;
  configuracion: Configuracion;
  onAgregarEntrenador: (nombre: string) => Promise<void>;
}) {
  const cubiertas = categoriasDePauta(configuracion, pauta.id);
  const preguntas = pauta.categorias.reduce((a, c) => a + indicadoresActivos(c).length, 0);

  return (
    <>
      <div className="encuesta__cabecera">
        <h2>Datos de la evaluación</h2>
        <p>{jugador.categoria} · {jugador.posicion} · Pie {jugador.pieHabil.toLowerCase()}</p>
      </div>
      <div className="card__cuerpo">
        <div className="aviso aviso--acento" style={{ marginTop: 0 }}>
          <strong>Pauta {pauta.nombre}.</strong> {pauta.descripcion} Se eligió sola por la categoría{" "}
          <strong>{jugador.categoria}</strong>
          {cubiertas.length > 1 && `, que la comparte con ${cubiertas.filter((c) => c !== jugador.categoria).join(", ")}`}
          . Son {preguntas} sub-puntos repartidos en {pauta.categorias.length} categorías.
        </div>

        <div className="grid grid--2">
          <Campo label="Fecha de evaluación">
            <input
              className="input"
              type="date"
              value={borrador.fecha}
              onChange={(e) =>
                actualizar({ fecha: e.target.value, temporada: temporadaDe(e.target.value) })
              }
            />
          </Campo>
          <Campo label="Temporada">
            <input
              className="input"
              value={borrador.temporada}
              onChange={(e) => actualizar({ temporada: e.target.value })}
            />
          </Campo>
        </div>

        <SelectorEvaluador
          valor={borrador.entrenador}
          entrenadores={configuracion.entrenadores}
          onCambio={(entrenador) => actualizar({ entrenador })}
          onAgregar={onAgregarEntrenador}
        />

        {anterior && (
          <div className="aviso aviso--acento">
            <p style={{ margin: "0 0 10px" }}>
              Este jugador ya tiene una evaluación del <strong>{anterior.fecha}</strong>. Puede
              partir desde esos puntajes y corregir sólo lo que cambió.
            </p>
            <button type="button" className="btn btn--fantasma btn--sm" onClick={onCopiar}>
              Copiar puntajes anteriores
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function PasoCategoria({
  categoria,
  indice,
  total,
  pauta,
  borrador,
  onResponder,
}: {
  categoria: Pauta["categorias"][number];
  indice: number;
  total: number;
  pauta: Pauta;
  borrador: Evaluacion;
  onResponder: (indicadorId: string, valor: number) => void;
}) {
  const opciones = Array.from({ length: pauta.escalaMax }, (_, i) => i + 1);

  return (
    <>
      <div className="encuesta__cabecera">
        <h2 className="encuesta__titulo-cat">
          <Icono nombre={categoria.icono} tamano={26} /> {categoria.nombre}
        </h2>
        <p>
          Categoría {indice} de {total} · {categoria.descripcion}
        </p>
      </div>

      {indicadoresActivos(categoria).map((indicador) => (
        <fieldset key={indicador.id} className="pregunta" style={{ border: 0, margin: 0 }}>
          <legend style={{ padding: 0, width: "100%" }}>
            <span className="pregunta__texto">{indicador.nombre}</span>
          </legend>
          <p className="pregunta__ayuda">{indicador.ayuda}</p>
          <div className="escala">
            {opciones.map((valor) => (
              <button
                key={valor}
                type="button"
                className="escala__opcion"
                aria-pressed={borrador.puntajes[indicador.id] === valor}
                aria-label={`${indicador.nombre}: ${valor} de ${pauta.escalaMax}, ${
                  pauta.etiquetasEscala[valor - 1] ?? ""
                }`}
                onClick={() => onResponder(indicador.id, valor)}
              >
                <b>{valor}</b>
                <span>{pauta.etiquetasEscala[valor - 1] ?? ""}</span>
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </>
  );
}

const OTRO = "__otro__";

/**
 * Quién evalúa se elige de un listado, no se escribe. Escribirlo a mano en cada
 * evaluación termina en "Andrés", "andres mercado" y "A. Mercado" conviviendo en
 * la misma base, y después los informes y la planilla no cuadran. Si aparece
 * alguien que no está, se agrega al listado del club y queda disponible para
 * todos de ahí en adelante.
 */
function SelectorEvaluador({
  valor,
  entrenadores,
  onCambio,
  onAgregar,
}: {
  valor: string;
  entrenadores: string[];
  onCambio: (nombre: string) => void;
  onAgregar: (nombre: string) => Promise<void>;
}) {
  const desconocido = valor !== "" && !entrenadores.includes(valor);
  const [modoOtro, setModoOtro] = useState(false);
  const [nuevo, setNuevo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function agregar() {
    const limpio = nuevo.trim();
    if (!limpio) return;
    setGuardando(true);
    try {
      if (!entrenadores.includes(limpio)) await onAgregar(limpio);
      onCambio(limpio);
      setModoOtro(false);
      setNuevo("");
      setAviso(`${limpio} quedó agregado al cuerpo técnico.`);
    } catch {
      /* el error ya se muestra en la barra superior */
    } finally {
      setGuardando(false);
    }
  }

  if (modoOtro) {
    return (
      <Campo
        label="Nombre del evaluador"
        ayuda="Se agrega al listado del club y queda disponible para las próximas evaluaciones."
      >
        <input
          className="input"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="Nombre y apellido"
          autoFocus
        />
        <span style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            type="button"
            className="btn btn--primario btn--sm"
            onClick={() => void agregar()}
            disabled={guardando || !nuevo.trim()}
          >
            {guardando ? "Agregando…" : "Agregar al listado"}
          </button>
          <button
            type="button"
            className="btn btn--fantasma btn--sm"
            onClick={() => {
              setModoOtro(false);
              setNuevo("");
            }}
          >
            Cancelar
          </button>
        </span>
      </Campo>
    );
  }

  return (
    <Campo label="Entrenador que evalúa" ayuda={aviso ?? undefined}>
      <select
        className="select"
        value={valor}
        onChange={(e) => {
          if (e.target.value === OTRO) setModoOtro(true);
          else onCambio(e.target.value);
        }}
      >
        <option value="">— Seleccione —</option>
        {entrenadores.map((nombre) => (
          <option key={nombre} value={nombre}>{nombre}</option>
        ))}
        {/* Un nombre heredado de antes del listado no se pierde del selector. */}
        {desconocido && <option value={valor}>{valor}</option>}
        <option value={OTRO}>Otro evaluador…</option>
      </select>
    </Campo>
  );
}

function PasoCierre({
  borrador,
  actualizar,
  resultado,
}: {
  borrador: Evaluacion;
  actualizar: (c: Partial<Evaluacion>) => void;
  resultado: ReturnType<typeof calcular>;
}) {
  const objetivos = [...borrador.objetivos];
  while (objetivos.length < 3) objetivos.push("");

  return (
    <>
      <div className="encuesta__cabecera">
        <h2>Cierre de la evaluación</h2>
        <p>Lo que escriba aquí es lo que leerán los padres en el informe.</p>
      </div>
      <div className="card__cuerpo">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "12px 0 18px",
            borderBottom: "1px solid var(--borde)",
            marginBottom: 18,
          }}
        >
          <div>
            <div className="campo__label">Puntaje general</div>
            <Puntaje valor={resultado.general} tamano={44} />
          </div>
          <div>
            <div className="campo__label">Nivel</div>
            <div className={`nivel nivel--${resultado.nivel?.id ?? "inicial"}`} style={{ fontSize: 24 }}>
              {resultado.nivel?.etiqueta ?? "Sin datos"}
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div className="campo__label">Respondido</div>
            <div className="puntaje" style={{ fontSize: 24 }}>
              {Math.round(resultado.completitud * 100)}%
            </div>
          </div>
        </div>

        <Campo
          label="Observaciones del entrenador"
          ayuda={`Dos o tres frases concretas: qué destacar y en qué seguir trabajando. Quedan ${
            MAX_OBSERVACIONES - borrador.observaciones.length
          } caracteres para que entre completo en el informe.`}
        >
          <textarea
            className="textarea"
            value={borrador.observaciones}
            onChange={(e) => actualizar({ observaciones: e.target.value })}
            maxLength={MAX_OBSERVACIONES}
          />
        </Campo>

        <div className="campo__label" style={{ marginBottom: 2 }}>Próximos objetivos</div>
        <p className="campo__ayuda" style={{ margin: "0 0 8px" }}>
          Uno por línea, en una frase corta. Puede dejar los que no use en blanco.
        </p>
        {objetivos.map((objetivo, i) => (
          <input
            key={i}
            className="input"
            style={{ marginBottom: 9 }}
            value={objetivo}
            placeholder={`Objetivo ${i + 1}`}
            maxLength={MAX_OBJETIVO}
            aria-label={`Objetivo ${i + 1}`}
            onChange={(e) => {
              const copia = [...objetivos];
              copia[i] = e.target.value;
              actualizar({ objetivos: copia });
            }}
          />
        ))}
      </div>
    </>
  );
}
