import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Campo, Confirmar } from "../components/ui";
import { useDatos } from "../data/DatosContext";
import {
  borrarConexion,
  conexion,
  conexionManual,
  guardarConexion,
  validarConexion,
} from "../data/conexion";
import { revisarInstalacion, type Prueba } from "../data/diagnostico";
import { guardarOperador, operadorActual } from "../data/operador";
import { useSesion } from "../data/sesion";
import { backupDeEjemplo } from "../data/ejemplo";
import { validarBackup } from "../data/store";
import { estadoCobro, formatoPesos } from "../domain/cobros";
import { responsablesDe } from "../domain/familia";
import { edad, hoyISO } from "../domain/fechas";
import { formatearRut } from "../domain/rut";
import { nombreCompleto, nombreRama, TIPOS_VINCULO } from "../domain/types";

function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

const escapar = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** CSV con punto y coma y BOM: así Excel en español lo abre en columnas y con tildes. */
function csv(columnas: string[], filas: unknown[][]): string {
  return `﻿${[columnas, ...filas].map((f) => f.map(escapar).join(";")).join("\r\n")}`;
}

export function Datos() {
  const datos = useDatos();
  const {
    personas, vinculos, planes, inscripciones, pagos, modo, etiquetaModo,
    exportar, importar, vaciar, recargar, porId,
  } = datos;
  const archivo = useRef<HTMLInputElement>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<"vaciar" | null>(null);

  function exportarRespaldo() {
    descargar(
      `respaldo-socios-cga-${hoyISO()}.json`,
      JSON.stringify(exportar(), null, 2),
      "application/json",
    );
    setAviso("Respaldo descargado. Guárdelo en el Drive del club o envíelo al correo institucional.");
  }

  /**
   * Nómina completa: una fila por persona, con sus responsables y lo que tiene
   * inscrito. Es la planilla que el directorio pide y la que sirve para revisar
   * los datos de a montones, fuera de la aplicación.
   */
  function exportarNomina() {
    const columnas = [
      "rut", "nombres", "apellidos", "edad", "socio", "numero_socio", "correo", "telefono",
      "direccion", "comuna", "responsables", "paga", "inscripciones", "estado_cuotas",
      // La huella viaja con la nómina: en la planilla se puede ordenar por
      // «registrada_por» y ver de un vistazo quién cargó qué.
      "registrada_por", "registrada_el", "ultimo_cambio_por", "ultimo_cambio_el",
    ];

    const filas = personas.map((p) => {
      const suyas = inscripciones.filter((i) => i.personaId === p.id && i.estado !== "terminada");
      const responsables = responsablesDe(p.id, vinculos);
      const peor = suyas
        .map((i) => estadoCobro(i, pagos))
        .sort((a, b) => a.dias - b.dias)[0];

      return [
        p.rut ? formatearRut(p.rut) : p.documento,
        p.nombres,
        p.apellidos,
        edad(p.fechaNacimiento) ?? "",
        p.socio ? "sí" : "no",
        p.numeroSocio,
        p.email,
        p.telefono,
        p.direccion,
        p.comuna,
        responsables
          .map((v) => {
            const tipo = TIPOS_VINCULO.find((t) => t.id === v.tipo)?.nombre ?? v.tipo;
            return `${nombreCompleto(porId.get(v.adultoId))} (${tipo})`;
          })
          .join(" · "),
        responsables
          .filter((v) => v.pagador)
          .map((v) => nombreCompleto(porId.get(v.adultoId)))
          .join(" · "),
        suyas
          .map((i) => {
            const plan = planes.find((pl) => pl.id === i.planId);
            return plan ? `${plan.nombre} (${nombreRama(plan.rama)})` : "";
          })
          .filter(Boolean)
          .join(" · "),
        peor ? peor.etiqueta : "",
        p.creadoPor ?? "",
        p.creadoEn ? p.creadoEn.slice(0, 10) : "",
        p.actualizadoPor ?? "",
        p.actualizadoEn ? p.actualizadoEn.slice(0, 10) : "",
      ];
    });

    descargar(`socios-cga-nomina-${hoyISO()}.csv`, csv(columnas, filas), "text/csv;charset=utf-8");
    setAviso("Nómina descargada. Se abre directamente en Excel o Google Sheets.");
  }

  async function importarArchivo(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const backup = validarBackup(JSON.parse(await file.text()));
      const seguro = window.confirm(
        `El respaldo trae ${backup.personas.length} personas, ${backup.planes.length} planes y ` +
          `${backup.pagos.length} pagos. Se sumará a lo que ya existe, reemplazando los registros ` +
          "que tengan el mismo identificador. ¿Continuar?",
      );
      if (!seguro) return;
      await importar(backup);
      setAviso("Respaldo cargado correctamente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  }

  async function cargarEjemplo() {
    const seguro = window.confirm(
      "Se cargará una familia de ejemplo con dos hermanos, sus padres, cinco planes y sus pagos. " +
        "Sirve para ver cómo funciona todo antes de ingresar los datos reales. ¿Continuar?",
    );
    if (!seguro) return;
    await importar(backupDeEjemplo());
    setAviso(
      "Ejemplo cargado. Abra la ficha de Carolina Meyer para ver cómo se cruzan sus dos hijos, y " +
        "después la pantalla de Cobranzas.",
    );
  }

  const menoresSinApoderado = personas.filter(
    (p) => p.activo && (edad(p.fechaNacimiento) ?? 99) < 18 && responsablesDe(p.id, vinculos).length === 0,
  ).length;
  const totalRecaudado = pagos.reduce((s, p) => s + p.monto, 0);

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
      {error && (
        <div className="aviso" role="alert">
          {error}
        </div>
      )}

      <div className="grid grid--2">
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h2 className="card__titulo">Dónde se están guardando los datos</h2>
            <div className="card__cuerpo">
              <p style={{ marginTop: 0 }}>
                <span className={`chip ${modo === "nube" ? "chip--rojo" : "chip--oscuro"}`}>
                  {etiquetaModo}
                </span>
              </p>
              {modo === "local" ? (
                <p style={{ fontSize: 14 }}>
                  Todo vive en <strong>este navegador</strong>, en este computador. Funciona sin
                  internet y no cuesta nada, pero <strong>no se comparte</strong> con los demás
                  computadores del club y se pierde si se borra el navegador. Para que la base sea
                  una sola, configure la nube más abajo.
                </p>
              ) : (
                <p style={{ fontSize: 14 }}>
                  Los datos se guardan en la <strong>base compartida</strong>. Todos los
                  computadores del club con su cuenta ven exactamente la misma información, al
                  instante.
                </p>
              )}

              <dl className="datos-lista">
                <dt>Personas</dt>
                <dd>{personas.length}</dd>
                <dt>Socios</dt>
                <dd>{personas.filter((p) => p.socio).length}</dd>
                <dt>Vínculos familiares</dt>
                <dd>{vinculos.length}</dd>
                <dt>Planes</dt>
                <dd>{planes.length}</dd>
                <dt>Inscripciones activas</dt>
                <dd>{inscripciones.filter((i) => i.estado === "activa").length}</dd>
                <dt>Pagos registrados</dt>
                <dd>
                  {pagos.length} · {formatoPesos(totalRecaudado)}
                </dd>
                <dt>Menores sin apoderado</dt>
                <dd>
                  {menoresSinApoderado === 0 ? (
                    "ninguno"
                  ) : (
                    <span className="estado estado--vencida">{menoresSinApoderado}</span>
                  )}
                </dd>
              </dl>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <h2 className="card__titulo">Respaldo completo</h2>
            <div className="card__cuerpo">
              <p style={{ marginTop: 0, fontSize: 14 }}>
                Un archivo con personas, vínculos, planes, inscripciones y pagos. Sirve para mover
                todo a otro computador, para pasar de este computador a la nube, o para recuperar la
                información si algo pasa.
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

          <div className="card" style={{ marginBottom: 16 }}>
            <h2 className="card__titulo">Nómina en planilla</h2>
            <div className="card__cuerpo">
              <p style={{ marginTop: 0, fontSize: 14 }}>
                Una fila por persona, con sus apoderados, quién le paga y en qué está inscrita. Es
                la forma de revisar todo junto o de mandárselo al directorio.
              </p>
              <button type="button" className="btn btn--fantasma" onClick={exportarNomina}>
                Descargar nómina (CSV)
              </button>
            </div>
          </div>

          <QuienTrabaja />

          <div className="card" style={{ marginBottom: 16 }}>
            <h2 className="card__titulo">Huella de quién ingresa los datos</h2>
            <div className="card__cuerpo">
              <p style={{ marginTop: 0, fontSize: 14 }}>
                Cada alta, cambio y baja queda anotada con quién la hizo y a qué hora.{" "}
                {modo === "nube" ? (
                  <>
                    La escribe <strong>la propia base de datos</strong> a partir de la cuenta con
                    que se entró, así que no se puede firmar con el nombre de otro ni borrar una
                    línea desde acá.
                  </>
                ) : (
                  <>
                    En este computador la anota la aplicación con el nombre que se escribió al
                    entrar, <strong>sin cuenta que lo respalde</strong>.
                  </>
                )}
              </p>
              <p style={{ fontSize: 14 }}>
                La nómina en CSV incluye las columnas <em>registrada_por</em> y{" "}
                <em>ultimo_cambio_por</em>, y en Supabase las mismas columnas están en cada tabla.
              </p>
              <Link className="btn btn--fantasma" to="/bitacora">
                Abrir la bitácora
              </Link>
            </div>
          </div>

          <div className="card">
            <h2 className="card__titulo">Datos de ejemplo</h2>
            <div className="card__cuerpo">
              <p style={{ marginTop: 0, fontSize: 14 }}>
                Carga una familia de ejemplo —dos hermanos, su madre pagadora, su padre como segundo
                contacto—, cinco planes y pagos que dejan una cuota vencida y otra por vencer.
              </p>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                <button type="button" className="btn btn--fantasma" onClick={() => void cargarEjemplo()}>
                  Cargar ejemplo
                </button>
                <button
                  type="button"
                  className="btn btn--peligro"
                  onClick={() => setConfirmando("vaciar")}
                >
                  Borrar todo
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <ConexionNube />
          <RevisionInstalacion />
        </div>
      </div>

      {confirmando === "vaciar" && (
        <Confirmar
          titulo="Borrar todos los datos"
          mensaje={
            `Se eliminarán las ${personas.length} personas, sus vínculos, inscripciones y los ` +
            `${pagos.length} pagos registrados. Esto no se puede deshacer. Descargue antes un ` +
            "respaldo si tiene la menor duda."
          }
          textoAceptar="Borrar todo"
          onCancelar={() => setConfirmando(null)}
          onAceptar={() => {
            void vaciar();
            setConfirmando(null);
            setAviso("Se borraron todos los datos.");
          }}
        />
      )}
    </>
  );
}

/**
 * Conexión con Supabase desde la propia aplicación.
 *
 * Existe porque la forma más simple de publicar esto es arrastrar la carpeta
 * compilada a Netlify, y ahí no hay dónde poner variables de entorno. Sin esta
 * pantalla, pasar a la nube obligaría a instalar Node y recompilar en cada
 * computador del club.
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
    if (!window.confirm("¿Desconectar la base compartida y volver a guardar sólo en este computador?")) {
      return;
    }
    borrarConexion();
    window.location.reload();
  }

  if (conexion) {
    return (
      <div className="card">
        <h2 className="card__titulo">Conexión con la nube</h2>
        <div className="card__cuerpo">
          <dl className="datos-lista">
            <dt>Proyecto</dt>
            <dd style={{ wordBreak: "break-all" }}>{conexion.url}</dd>
            <dt>Clave anónima</dt>
            <dd>
              {conexion.anonKey.slice(0, 8)}…{conexion.anonKey.slice(-4)}
            </dd>
            <dt>Configurada desde</dt>
            <dd>{conexionManual ? "esta pantalla" : "la compilación"}</dd>
          </dl>

          {conexionManual ? (
            <>
              <p className="campo__ayuda" style={{ margin: "12px 0" }}>
                La conexión vive en este navegador. En cada computador nuevo hay que pegar los
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
          Hoy los datos se guardan sólo en este computador. Para que todos vean lo mismo, pegue los
          dos valores del proyecto de Supabase: están en <strong>Project Settings → API</strong>.
        </p>

        <Campo label="Project URL" ayuda="Se ve así: https://abcdefgh.supabase.co" error={error ?? undefined}>
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
          haya allá, y lo de este computador se sube con <strong>Cargar respaldo</strong>.
        </p>
      </div>
    </div>
  );
}

/**
 * Revisión paso a paso de la instalación en la nube.
 *
 * Conectar Supabase son cuatro cosas en dos sitios distintos y ninguna avisa
 * cuando falta: uno se entera recién cuando la aplicación falla con una familia
 * esperando al otro lado del mesón. Esta tarjeta las prueba de a una —incluida
 * una escritura real que se borra sola— y dice cuál falta y qué hacer.
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
          Incluye guardar un plan de prueba, que se borra solo: es la única forma de saber que los
          permisos de escritura quedaron puestos.
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
          El correo y la clave de una cuenta del club son opcionales, pero sin ellos sólo se revisa
          la mitad: la cuenta, los permisos de lectura y los de escritura quedan sin probar. No se
          guardan en ninguna parte ni se cierra la sesión que tenga abierta.
        </p>

        <div className="revision__campos">
          <Campo label="Correo de la cuenta">
            <input
              className="input"
              type="email"
              autoComplete="off"
              value={correo}
              placeholder="secretaria@ejemplo.cl"
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

        {error && (
          <p className="campo__error" style={{ marginTop: 10 }}>
            {error}
          </p>
        )}

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
 * correr hay que decirlo, o el club se va tranquilo con la mitad hecha.
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
  return "Todo lo indispensable está hecho. El club puede empezar a cargar personas.";
}

/**
 * Quién está trabajando en este computador.
 *
 * En la nube muestra la cuenta y no deja cambiarla acá: se cambia saliendo y
 * entrando con otra, que es justamente lo que hace que la huella valga. En modo
 * local deja corregir el nombre, porque no hay nada que verificar y el turno de
 * la tarde puede ser otra persona.
 */
function QuienTrabaja() {
  const { modo, usuario, salir } = useSesion();
  const [nombre, setNombre] = useState(operadorActual());
  const [guardado, setGuardado] = useState(false);

  if (modo === "nube") {
    return (
      <div className="card">
        <h2 className="card__titulo">Quién está trabajando</h2>
        <div className="card__cuerpo">
          <p style={{ marginTop: 0, fontSize: 14 }}>
            Sesión iniciada como <strong>{usuario}</strong>. Todo lo que guarde queda anotado a su
            nombre.
          </p>
          <p className="campo__ayuda" style={{ marginBottom: 12 }}>
            Si el computador lo usa otra persona, cierre la sesión y que entre con su propia
            cuenta. Compartir una cuenta borra la única pista de quién hizo cada cosa.
          </p>
          <button type="button" className="btn btn--fantasma" onClick={() => void salir()}>
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="card__titulo">Quién está trabajando</h2>
      <div className="card__cuerpo">
        <p style={{ marginTop: 0, fontSize: 14 }}>
          En este computador no hay cuentas: la bitácora anota el nombre que se escriba acá, y lo
          marca como <strong>«sin cuenta»</strong>.
        </p>
        <Campo label="Nombre de quien está usando este computador">
          <input
            className="input"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setGuardado(false);
            }}
          />
        </Campo>
        <button
          type="button"
          className="btn btn--fantasma"
          disabled={nombre.trim().length < 3}
          onClick={() => {
            guardarOperador(nombre);
            setGuardado(true);
          }}
        >
          Guardar el nombre
        </button>
        {guardado && <p className="mensaje-ok">Listo. Lo que guarde de ahora en adelante irá a su nombre.</p>}
      </div>
    </div>
  );
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
