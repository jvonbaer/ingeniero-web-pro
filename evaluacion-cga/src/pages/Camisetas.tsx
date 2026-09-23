import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CATEGORIAS_EDAD } from "../config/pautas";
import { useDatos } from "../data/DatosContext";
import { Campo, Vacio } from "../components/ui";
import {
  ESTADOS_PAGO,
  LARGO_ESTAMPADO,
  MEDIOS_PAGO,
  NUMERO_MAX,
  NUMERO_MIN,
  TALLAS,
  camisetaDe,
  estadoPago,
  estampadosRepetidos,
  etiquetaEstado,
  etiquetaMedio,
  etiquetaTalla,
  hayProblemas,
  mandaSobreElDorsal,
  normalizarEstampado,
  nuevaCamiseta,
  numerosLibres,
  ocupacionDe,
  pesos,
  precioHabitual,
  resumenPedido,
  saldoDe,
  sinCosto,
  temporadaActual,
  temporadaSiguiente,
  temporadasDe,
  validarCamiseta,
} from "../domain/camisetas";
import { fechaCorta, hoyISO, nombreCompleto, nuevoId } from "../domain/scoring";
import type { Camiseta, EstadoPagoCamiseta, Jugador, MedioPagoCamiseta } from "../domain/types";

type Filtro = "" | EstadoPagoCamiseta | "sin-entregar";

const FILTROS: { id: Filtro; etiqueta: string }[] = [
  { id: "", etiqueta: "Todo el pedido" },
  ...ESTADOS_PAGO.map((e) => ({ id: e.id as Filtro, etiqueta: e.etiqueta })),
  { id: "sin-entregar", etiqueta: "Sin entregar" },
];

function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

export function Camisetas() {
  const { jugadores, camisetas, guardarCamiseta } = useDatos();

  const temporadas = useMemo(() => temporadasDe(camisetas), [camisetas]);
  const [elegida, setElegida] = useState("");
  /**
   * La temporada se deriva en cada render en vez de sincronizarse con un
   * efecto: al llegar los datos de la nube la lista de temporadas cambia, y la
   * que estuviera elegida puede dejar de existir. Así la pantalla nunca queda
   * mostrando un pedido vacío de una temporada que no está.
   */
  /**
   * A la lista se le suma la temporada que viene aunque no tenga pedido: el
   * club arma las camisetas en diciembre para la que empieza en marzo. No entra
   * en el valor por omisión —eso sigue siendo el pedido en curso— sino como una
   * opción más del selector.
   */
  const opciones = useMemo(() => {
    const siguiente = temporadaSiguiente();
    return temporadas.includes(siguiente) ? temporadas : [siguiente, ...temporadas];
  }, [temporadas]);
  const temporada = opciones.includes(elegida)
    ? elegida
    : temporadas[0] ?? temporadaActual();
  const [categoria, setCategoria] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("");
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<Camiseta | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const porId = useMemo(
    () => new Map(jugadores.map((j) => [j.id, j] as const)),
    [jugadores],
  );

  const delPedido = useMemo(
    () => camisetas.filter((c) => c.temporada === temporada),
    [camisetas, temporada],
  );

  const categorias = useMemo(() => {
    const presentes = new Set([
      ...delPedido.map((c) => c.categoria),
      ...jugadores.filter((j) => j.activo).map((j) => j.categoria),
    ]);
    const conocidas = CATEGORIAS_EDAD.filter((c) => presentes.has(c));
    const otras = [...presentes].filter((c) => c && !CATEGORIAS_EDAD.includes(c)).sort();
    return [...conocidas, ...otras];
  }, [delPedido, jugadores]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return delPedido
      .filter((c) => (categoria ? c.categoria === categoria : true))
      .filter((c) => {
        if (!filtro) return true;
        if (filtro === "sin-entregar") return !c.entregada;
        return estadoPago(c) === filtro;
      })
      .filter((c) => {
        if (!texto) return true;
        const jugador = porId.get(c.jugadorId);
        const nombre = jugador ? nombreCompleto(jugador) : "";
        return `${c.nombreEstampado} ${nombre} ${c.numero} ${jugador?.codigo ?? ""}`
          .toLowerCase()
          .includes(texto);
      })
      .sort(
        (a, b) =>
          a.categoria.localeCompare(b.categoria, "es", { numeric: true }) || a.numero - b.numero,
      );
  }, [delPedido, categoria, filtro, busqueda, porId]);

  const resumen = useMemo(() => resumenPedido(delPedido), [delPedido]);

  /** Jugadores activos que todavía no tienen camiseta en esta temporada. */
  const inscribibles = useMemo(
    () =>
      jugadores
        .filter((j) => j.activo && !camisetaDe(camisetas, j.id, temporada))
        .sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), "es")),
    [jugadores, camisetas, temporada],
  );

  function abrirNueva() {
    const ahora = new Date().toISOString();
    setEditando({
      id: nuevoId("cam"),
      jugadorId: "",
      temporada,
      categoria: "",
      numero: 0,
      nombreEstampado: "",
      talla: "",
      precio: precioHabitual(camisetas, temporada),
      abonado: 0,
      medioPago: "",
      fechaPago: "",
      comprobante: "",
      entregada: false,
      fechaEntrega: "",
      notas: "",
      creadaEn: ahora,
      actualizadaEn: ahora,
    });
  }

  /**
   * Atajo de mesón: el apoderado paga el saldo completo en el momento. El medio
   * queda sin registrar a propósito —la fila lo muestra así— para que quien
   * revise después sepa que falta ese dato y no crea que fue efectivo.
   */
  async function cobrarTodo(camiseta: Camiseta) {
    await guardarCamiseta({
      ...camiseta,
      abonado: camiseta.precio,
      fechaPago: camiseta.fechaPago || hoyISO(),
      actualizadaEn: new Date().toISOString(),
    });
    setAviso(`Camiseta ${camiseta.numero} de ${camiseta.nombreEstampado}: pago completo registrado.`);
  }

  async function alternarEntrega(camiseta: Camiseta) {
    const entregada = !camiseta.entregada;
    await guardarCamiseta({
      ...camiseta,
      entregada,
      fechaEntrega: entregada ? hoyISO() : "",
      actualizadaEn: new Date().toISOString(),
    });
  }

  /** Planilla para mandarle al proveedor: una fila por camiseta del pedido. */
  function exportarPedido() {
    const columnas = [
      "categoria", "numero", "nombre_estampado", "talla", "jugador", "codigo",
      "precio", "abonado", "saldo", "estado_pago", "medio_pago", "fecha_pago",
      "comprobante", "entregada", "fecha_entrega", "notas",
    ];
    const filas = [...delPedido]
      .sort(
        (a, b) =>
          a.categoria.localeCompare(b.categoria, "es", { numeric: true }) || a.numero - b.numero,
      )
      .map((c) => {
        const jugador = porId.get(c.jugadorId);
        return [
          c.categoria,
          c.numero,
          c.nombreEstampado,
          etiquetaTalla(c.talla),
          jugador ? nombreCompleto(jugador) : "(ficha eliminada)",
          jugador?.codigo ?? "",
          c.precio,
          c.abonado,
          saldoDe(c),
          etiquetaEstado(estadoPago(c)),
          etiquetaMedio(c.medioPago),
          c.fechaPago,
          c.comprobante,
          c.entregada ? "sí" : "no",
          c.fechaEntrega,
          c.notas.replace(/\s+/g, " "),
        ];
      });

    const escapar = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [columnas, ...filas].map((f) => f.map(escapar).join(";")).join("\r\n");
    // El BOM hace que Excel en español respete las tildes.
    descargar(`camisetas-cga-${temporada}.csv`, `﻿${csv}`, "text/csv;charset=utf-8");
    setAviso("Planilla del pedido descargada. Se abre directamente en Excel o Google Sheets.");
  }

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Escuela de Fútbol CGA</span>
          <h1>Camisetas</h1>
        </div>
        <div className="page-head__acciones">
          <button
            type="button"
            className="btn btn--fantasma"
            onClick={exportarPedido}
            disabled={delPedido.length === 0}
          >
            Descargar pedido (CSV)
          </button>
          <button
            type="button"
            className="btn btn--primario"
            onClick={abrirNueva}
            disabled={inscribibles.length === 0}
          >
            + Inscribir jugador
          </button>
        </div>
      </div>

      {aviso && <div className="aviso aviso--ok">{aviso}</div>}

      <div className="grid grid--metricas grid--metricas-4" style={{ marginBottom: 18 }}>
        <Tarjeta rotulo={`Inscritos ${temporada}`} valor={String(resumen.inscritos)} />
        <Tarjeta rotulo="Pagadas" valor={`${resumen.pagados}/${resumen.inscritos}`} />
        <Tarjeta rotulo="Recaudado" valor={pesos(resumen.recaudado)} />
        <Tarjeta
          rotulo="Por cobrar"
          valor={pesos(resumen.porCobrar)}
          destacar={resumen.porCobrar > 0}
        />
      </div>

      <div className="filtros">
        <select
          className="select"
          value={temporada}
          onChange={(e) => setElegida(e.target.value)}
          aria-label="Temporada del pedido"
        >
          {opciones.map((t) => (
            <option key={t} value={t}>Temporada {t}</option>
          ))}
        </select>
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
        <select
          className="select"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as Filtro)}
          aria-label="Filtrar por estado"
        >
          {FILTROS.map((f) => (
            <option key={f.id} value={f.id}>{f.etiqueta}</option>
          ))}
        </select>
        <input
          className="input"
          type="search"
          placeholder="Buscar por nombre, número o código…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar en el pedido"
        />
      </div>

      <div className="grid grid--camisetas">
        <div className="card">
          <h2 className="card__titulo">
            Pedido {temporada}
            {categoria && ` · ${categoria}`}
          </h2>
          <div className="card__cuerpo">
            {visibles.length === 0 ? (
              <Vacio
                titulo={
                  delPedido.length === 0
                    ? `Todavía no hay camisetas inscritas en ${temporada}`
                    : "Sin resultados"
                }
              >
                {delPedido.length === 0 ? (
                  <p>
                    Use <strong>+ Inscribir jugador</strong> para armar el pedido. Si aún no hay
                    fichas cargadas, créelas primero en <Link to="/">Jugadores</Link>.
                  </p>
                ) : (
                  <p>Pruebe con otro nombre o cambie los filtros.</p>
                )}
              </Vacio>
            ) : (
              <div className="tabla-scroll">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th className="num">N.º</th>
                      <th>Estampado</th>
                      <th>Jugador</th>
                      <th>Categoría</th>
                      <th>Talla</th>
                      <th>Pago</th>
                      <th>Entrega</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((c) => (
                      <FilaCamiseta
                        key={c.id}
                        camiseta={c}
                        jugador={porId.get(c.jugadorId)}
                        onEditar={() => setEditando(c)}
                        onCobrar={() => void cobrarTodo(c)}
                        onEntregar={() => void alternarEntrega(c)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <MapaNumeros
            camisetas={camisetas}
            temporada={temporada}
            categoria={categoria}
            categorias={categorias}
            jugadores={porId}
          />
          <ResumenTallas resumen={resumen} temporada={temporada} />
        </div>
      </div>

      {editando && (
        <FormularioCamiseta
          borradorInicial={editando}
          esNueva={!camisetas.some((c) => c.id === editando.id)}
          inscribibles={inscribibles}
          onCerrar={() => setEditando(null)}
          onGuardado={(mensaje) => {
            setEditando(null);
            setAviso(mensaje);
          }}
        />
      )}
    </>
  );
}

function Tarjeta({
  rotulo,
  valor,
  destacar,
}: {
  rotulo: string;
  valor: string;
  destacar?: boolean;
}) {
  return (
    <div className="card metrica">
      <div className="card__cuerpo">
        <div className="campo__label metrica__rotulo">{rotulo}</div>
        <div
          className="puntaje metrica__valor metrica__valor--texto"
          style={destacar ? { color: "var(--cga-rojo)" } : undefined}
        >
          {valor}
        </div>
      </div>
    </div>
  );
}

function FilaCamiseta({
  camiseta,
  jugador,
  onEditar,
  onCobrar,
  onEntregar,
}: {
  camiseta: Camiseta;
  jugador: Jugador | undefined;
  onEditar: () => void;
  onCobrar: () => void;
  onEntregar: () => void;
}) {
  const estado = estadoPago(camiseta);
  const saldo = saldoDe(camiseta);
  // La categoría del pedido es la que el jugador tenía al inscribirse. Si
  // después subió de categoría hay que decirlo, o el entrenador buscará esa
  // camiseta en la lista equivocada.
  const cambioDeCategoria = jugador && jugador.categoria !== camiseta.categoria;

  return (
    <tr>
      <td className="num"><span className="dorsal">{camiseta.numero}</span></td>
      <td><strong className="estampado">{camiseta.nombreEstampado}</strong></td>
      <td>
        {jugador ? (
          <Link to={`/jugadores/${jugador.id}`}>{nombreCompleto(jugador)}</Link>
        ) : (
          <span className="campo__error">Ficha eliminada</span>
        )}
      </td>
      <td>
        {camiseta.categoria}
        {cambioDeCategoria && (
          <span className="chip chip--rojo" style={{ marginLeft: 6 }} title={`Hoy juega en ${jugador.categoria}`}>
            hoy {jugador.categoria}
          </span>
        )}
      </td>
      <td>{etiquetaTalla(camiseta.talla)}</td>
      <td>
        {/* Una camiseta sin precio no es una camiseta pagada: la cubre el club.
            Mostrarla como «pagado $0» haría creer que alguien puso la plata. */}
        {sinCosto(camiseta) ? (
          <>
            <span className="pago pago--sin-costo">Sin costo</span>
            <div className="jugador-item__meta">La cubre el club</div>
          </>
        ) : (
          <>
            <span className={`pago pago--${estado}`}>{etiquetaEstado(estado)}</span>
            <div className="jugador-item__meta">
              {estado === "pagado"
                ? `${pesos(camiseta.precio)} · ${etiquetaMedio(camiseta.medioPago)}`
                : `Debe ${pesos(saldo)} de ${pesos(camiseta.precio)}`}
            </div>
          </>
        )}
      </td>
      <td>
        {/* La entrega se marca con una casilla y no con un botón: es lo que el
            entrenador va tildando de corrido mientras reparte en la cancha. */}
        <label className="entrega">
          <input type="checkbox" checked={camiseta.entregada} onChange={onEntregar} />
          <span className="jugador-item__meta">
            {camiseta.entregada ? fechaCorta(camiseta.fechaEntrega) : "Pendiente"}
          </span>
        </label>
      </td>
      <td>
        <div className="fila-acciones">
          {estado !== "pagado" && !sinCosto(camiseta) && (
            <button
              type="button"
              className="btn btn--sm btn--fantasma"
              onClick={onCobrar}
              title={`Registrar el pago completo de ${pesos(saldo)}`}
            >
              Cobrar
            </button>
          )}
          <button type="button" className="btn btn--sm btn--fantasma" onClick={onEditar}>
            Editar
          </button>
        </div>
      </td>
    </tr>
  );
}

/**
 * El tablero de números de una categoría.
 *
 * Es la respuesta visual a "que no se repitan": antes de escribir nada, el
 * entrenador ve de un vistazo qué dorsales están tomados y de quién. Con las
 * siete categorías a la vez serían casi setecientas casillas, así que sin
 * categoría elegida se muestra sólo el recuento y los primeros libres.
 */
function MapaNumeros({
  camisetas,
  temporada,
  categoria,
  categorias,
  jugadores,
}: {
  camisetas: Camiseta[];
  temporada: string;
  categoria: string;
  categorias: string[];
  jugadores: Map<string, Jugador>;
}) {
  if (!categoria) {
    return (
      <div className="card">
        <h2 className="card__titulo">Mapa de números</h2>
        <div className="card__cuerpo">
          <p className="campo__ayuda" style={{ marginTop: 0 }}>
            Elija una categoría en los filtros para ver el tablero completo del {NUMERO_MIN} al{" "}
            {NUMERO_MAX}.
          </p>
          <ul className="lista-limpia">
            {categorias.map((c) => {
              const libres = numerosLibres(camisetas, temporada, c);
              const tomados = NUMERO_MAX - NUMERO_MIN + 1 - libres.length;
              return (
                <li key={c} className="fila-simple">
                  <span className="fila-simple__texto">{c}</span>
                  <span className="jugador-item__meta">
                    {tomados} tomados · libres: {libres.slice(0, 5).join(", ") || "ninguno"}
                    {libres.length > 5 && "…"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  const ocupados = ocupacionDe(camisetas, temporada, categoria);
  const numeros = Array.from(
    { length: NUMERO_MAX - NUMERO_MIN + 1 },
    (_, i) => i + NUMERO_MIN,
  );

  return (
    <div className="card">
      <h2 className="card__titulo">Mapa de números · {categoria}</h2>
      <div className="card__cuerpo">
        <div className="mapa-numeros">
          {numeros.map((n) => {
            const dueno = ocupados.get(n);
            const jugador = dueno ? jugadores.get(dueno.jugadorId) : undefined;
            return (
              <span
                key={n}
                className={`mapa-numeros__celda ${dueno ? "mapa-numeros__celda--tomada" : ""}`}
                title={
                  dueno
                    ? `${n}: ${dueno.nombreEstampado}${jugador ? ` (${nombreCompleto(jugador)})` : ""}`
                    : `${n}: libre`
                }
              >
                {n}
              </span>
            );
          })}
        </div>
        <p className="campo__ayuda" style={{ marginBottom: 0 }}>
          {ocupados.size} de {numeros.length} tomados en la temporada {temporada}. En el
          computador, pase el cursor sobre un número marcado para ver de quién es.
        </p>
      </div>
    </div>
  );
}

function ResumenTallas({
  resumen,
  temporada,
}: {
  resumen: ReturnType<typeof resumenPedido>;
  temporada: string;
}) {
  if (resumen.inscritos === 0) return null;
  return (
    <div className="card">
      <h2 className="card__titulo">Cuántas de cada talla</h2>
      <div className="card__cuerpo">
        <p className="campo__ayuda" style={{ marginTop: 0 }}>
          Es lo que el proveedor necesita para cotizar. Cuenta el pedido completo de la temporada{" "}
          {temporada}, sin los filtros de la lista.
        </p>
        <ul className="lista-limpia">
          {resumen.porTalla.map(({ talla, cantidad }) => (
            <li key={talla} className="fila-simple">
              <span className="fila-simple__texto">{etiquetaTalla(talla) || "Sin talla"}</span>
              <span className="dorsal">{cantidad}</span>
            </li>
          ))}
        </ul>
        <dl className="datos-ficha">
          <div className="dato"><dt>Valor del pedido</dt><dd>{pesos(resumen.total)}</dd></div>
          <div className="dato"><dt>Entregadas</dt><dd>{resumen.entregadas} de {resumen.inscritos}</dd></div>
        </dl>
      </div>
    </div>
  );
}

/* ---------- Formulario ---------- */

function FormularioCamiseta({
  borradorInicial,
  esNueva,
  inscribibles,
  onCerrar,
  onGuardado,
}: {
  borradorInicial: Camiseta;
  esNueva: boolean;
  inscribibles: Jugador[];
  onCerrar: () => void;
  onGuardado: (mensaje: string) => void;
}) {
  const { jugadores, camisetas, guardarCamiseta, eliminarCamiseta, guardarJugador } = useDatos();
  const [borrador, setBorrador] = useState<Camiseta>(borradorInicial);
  const [tocado, setTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const jugador = jugadores.find((j) => j.id === borrador.jugadorId);
  const limpio: Camiseta = { ...borrador, nombreEstampado: borrador.nombreEstampado.trim() };
  const problemas = validarCamiseta(limpio, camisetas);
  const repetidos = estampadosRepetidos(camisetas, limpio);
  const libres = borrador.categoria
    ? numerosLibres(camisetas, borrador.temporada, borrador.categoria)
    : [];

  function cambiar(cambios: Partial<Camiseta>) {
    setBorrador((prev) => ({ ...prev, ...cambios }));
  }

  /** Al elegir jugador se rearma el borrador: categoría, número y estampado. */
  function elegirJugador(id: string) {
    const elegido = jugadores.find((j) => j.id === id);
    if (!elegido) {
      cambiar({ jugadorId: "", categoria: "", numero: 0, nombreEstampado: "" });
      return;
    }
    const base = nuevaCamiseta(elegido, borrador.temporada, camisetas, borrador.precio);
    setBorrador({ ...base, id: borrador.id, creadaEn: borrador.creadaEn });
  }

  async function guardar() {
    setTocado(true);
    if (hayProblemas(problemas)) return;
    setGuardando(true);
    try {
      const guardada: Camiseta = { ...limpio, actualizadaEn: new Date().toISOString() };
      await guardarCamiseta(guardada);

      // El dorsal de la ficha pasa a ser el del pedido vigente. Así el campo
      // que hasta ahora se escribía a mano —y que era justamente el que dejaba
      // números repetidos— queda mandado por la única lista que los controla.
      if (jugador && mandaSobreElDorsal(camisetas, guardada)) {
        const dorsal = String(guardada.numero);
        if (jugador.dorsal !== dorsal) await guardarJugador({ ...jugador, dorsal });
      }

      onGuardado(
        `Camiseta ${guardada.numero} · ${guardada.nombreEstampado} guardada en ${guardada.categoria}.`,
      );
    } catch {
      // El error ya se muestra en la barra superior.
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (
      !window.confirm(
        `¿Quitar del pedido la camiseta ${borrador.numero} de ${borrador.nombreEstampado}? El número queda libre para otro jugador.`,
      )
    ) {
      return;
    }
    setGuardando(true);
    try {
      await eliminarCamiseta(borrador.id);
      onGuardado(`Camiseta ${borrador.numero} quitada del pedido.`);
    } catch {
      // El error ya se muestra en la barra superior.
    } finally {
      setGuardando(false);
    }
  }

  const ver = (campo: keyof typeof problemas) => (tocado ? problemas[campo] : undefined);
  const saldo = Math.max(0, borrador.precio - borrador.abonado);

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label={esNueva ? "Inscribir camiseta" : "Editar camiseta"}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCerrar();
      }}
    >
      <div className="modal__caja modal__caja--ancha">
        <h2 className="card__titulo" style={{ marginTop: 0 }}>
          {esNueva ? `Inscribir camiseta · ${borrador.temporada}` : `Camiseta ${borrador.numero}`}
        </h2>

        {esNueva && (
          <Campo
            label="Jugador"
            ayuda="Sólo aparecen los jugadores activos que todavía no tienen camiseta en esta temporada."
            error={ver("jugadorId")}
          >
            <select
              className="select"
              value={borrador.jugadorId}
              onChange={(e) => elegirJugador(e.target.value)}
              aria-invalid={Boolean(ver("jugadorId"))}
            >
              <option value="">Elija un jugador…</option>
              {inscribibles.map((j) => (
                <option key={j.id} value={j.id}>
                  {nombreCompleto(j)} · {j.categoria}
                </option>
              ))}
            </select>
          </Campo>
        )}

        {!esNueva && jugador && (
          <p className="campo__ayuda" style={{ margin: "0 0 14px" }}>
            {nombreCompleto(jugador)} · {jugador.codigo}
            {jugador.categoria !== borrador.categoria &&
              ` · inscrito en ${borrador.categoria}, hoy juega en ${jugador.categoria}`}
          </p>
        )}

        <div className="revision__campos">
          <Campo
            label="Número"
            ayuda={
              borrador.categoria
                ? `Libres en ${borrador.categoria}: ${libres.slice(0, 8).join(", ") || "ninguno"}${
                    libres.length > 8 ? "…" : ""
                  }`
                : `Del ${NUMERO_MIN} al ${NUMERO_MAX}.`
            }
            error={ver("numero")}
          >
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={NUMERO_MIN}
              max={NUMERO_MAX}
              value={borrador.numero || ""}
              onChange={(e) => cambiar({ numero: Number.parseInt(e.target.value, 10) || 0 })}
              disabled={!borrador.jugadorId}
              aria-invalid={Boolean(ver("numero"))}
            />
          </Campo>

          <Campo label="Talla" error={ver("talla")}>
            <select
              className="select"
              value={borrador.talla}
              onChange={(e) => cambiar({ talla: e.target.value })}
              disabled={!borrador.jugadorId}
              aria-invalid={Boolean(ver("talla"))}
            >
              <option value="">Elija una talla…</option>
              {["Infantil", "Adulto"].map((grupo) => (
                <optgroup key={grupo} label={grupo}>
                  {TALLAS.filter((t) => t.grupo === grupo).map((t) => (
                    <option key={t.id} value={t.id}>{t.etiqueta}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Campo>
        </div>

        <Campo
          label="Nombre estampado"
          ayuda={`Va en mayúsculas y hasta ${LARGO_ESTAMPADO} caracteres. Quedan ${
            LARGO_ESTAMPADO - borrador.nombreEstampado.length
          }.`}
          error={ver("nombreEstampado")}
        >
          <input
            className="input"
            value={borrador.nombreEstampado}
            onChange={(e) => cambiar({ nombreEstampado: normalizarEstampado(e.target.value) })}
            disabled={!borrador.jugadorId}
            aria-invalid={Boolean(ver("nombreEstampado"))}
          />
        </Campo>

        {borrador.jugadorId && (
          <div className="camiseta-vista" aria-hidden="true">
            <span className="camiseta-vista__nombre">{borrador.nombreEstampado || "—"}</span>
            <span className="camiseta-vista__numero">{borrador.numero || "—"}</span>
          </div>
        )}

        {repetidos.length > 0 && (
          <p className="campo__ayuda" style={{ color: "var(--cga-rojo)", fontWeight: 600 }}>
            Ojo: en {borrador.categoria} ya hay {repetidos.length}{" "}
            {repetidos.length === 1 ? "camiseta" : "camisetas"} con ese mismo nombre (
            {repetidos.map((c) => `N.º ${c.numero}`).join(", ")}). Se puede, pero conviene
            distinguirlas.
          </p>
        )}

        <div className="revision__campos">
          <Campo label="Precio" ayuda="En pesos. Cero si la paga el club." error={ver("precio")}>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              value={borrador.precio}
              onChange={(e) => cambiar({ precio: Number.parseInt(e.target.value, 10) || 0 })}
              disabled={!borrador.jugadorId}
              aria-invalid={Boolean(ver("precio"))}
            />
          </Campo>
          <Campo
            label="Abonado"
            ayuda={saldo > 0 ? `Queda debiendo ${pesos(saldo)}.` : "Pagada por completo."}
            error={ver("abonado")}
          >
            <input
              className="input"
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              value={borrador.abonado}
              onChange={(e) => {
                const abonado = Number.parseInt(e.target.value, 10) || 0;
                cambiar({
                  abonado,
                  // La fecha del pago se pone sola al registrar el primer abono:
                  // es un dato que nadie se acuerda de completar a mano.
                  fechaPago: abonado > 0 ? borrador.fechaPago || hoyISO() : "",
                });
              }}
              disabled={!borrador.jugadorId}
              aria-invalid={Boolean(ver("abonado"))}
            />
          </Campo>
        </div>

        <div className="revision__campos">
          <Campo label="Medio de pago">
            <select
              className="select"
              value={borrador.medioPago}
              onChange={(e) => cambiar({ medioPago: e.target.value as MedioPagoCamiseta })}
              disabled={!borrador.jugadorId}
            >
              {MEDIOS_PAGO.map((m) => (
                <option key={m.id} value={m.id}>{m.etiqueta}</option>
              ))}
            </select>
          </Campo>
          <Campo label="Comprobante" ayuda="N.º de transferencia o boleta.">
            <input
              className="input"
              value={borrador.comprobante}
              onChange={(e) => cambiar({ comprobante: e.target.value })}
              disabled={!borrador.jugadorId}
            />
          </Campo>
        </div>

        <label className="fila-simple" style={{ marginBottom: 14 }}>
          <input
            type="checkbox"
            checked={borrador.entregada}
            onChange={(e) =>
              cambiar({
                entregada: e.target.checked,
                fechaEntrega: e.target.checked ? borrador.fechaEntrega || hoyISO() : "",
              })
            }
            disabled={!borrador.jugadorId}
          />
          <span className="fila-simple__texto">
            Camiseta entregada
            {borrador.entregada && borrador.fechaEntrega
              ? ` el ${fechaCorta(borrador.fechaEntrega)}`
              : ""}
          </span>
        </label>

        <Campo label="Notas">
          <textarea
            className="textarea"
            value={borrador.notas}
            onChange={(e) => cambiar({ notas: e.target.value })}
            disabled={!borrador.jugadorId}
            placeholder="Segunda camiseta, cambio de talla, acuerdo de pago…"
          />
        </Campo>

        <div className="form-pie">
          <button type="button" className="btn btn--fantasma" onClick={onCerrar}>
            Cancelar
          </button>
          {!esNueva && (
            <button
              type="button"
              className="btn btn--peligro"
              onClick={() => void borrar()}
              disabled={guardando}
            >
              Quitar
            </button>
          )}
          <button
            type="button"
            className="btn btn--primario"
            onClick={() => void guardar()}
            disabled={guardando || !borrador.jugadorId}
          >
            {guardando ? "Guardando…" : "Guardar camiseta"}
          </button>
        </div>

        {tocado && hayProblemas(problemas) && (
          <p className="form-pie__error">Revise lo que está marcado en rojo.</p>
        )}
      </div>
    </div>
  );
}
