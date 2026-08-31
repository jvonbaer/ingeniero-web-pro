import { useMemo, useState } from "react";
import { Campo, Casilla, ChipRama, Confirmar, Modal, Vacio } from "../components/ui";
import { useDatos } from "../data/DatosContext";
import { nuevoId } from "../data/store";
import { descuentosVacios, formatoPesos } from "../domain/cobros";
import { formatoCorto, hoyISO } from "../domain/fechas";
import type { Horario, Plan, Rama, TipoPlan } from "../domain/types";
import {
  DIAS_SEMANA,
  nombrePeriodicidad,
  PERIODICIDADES,
  RAMAS,
  TIPOS_PLAN,
} from "../domain/types";

function planEnBlanco(): Plan {
  return {
    id: "",
    nombre: "",
    tipo: "escuela",
    rama: "futbol",
    valor: 0,
    matricula: 0,
    periodicidad: "mensual",
    cupos: null,
    vigenciaDesde: hoyISO(),
    vigenciaHasta: "",
    condiciones: "",
    requisitos: "",
    descuentos: descuentosVacios(),
    horarios: [],
    edadMinima: null,
    edadMaxima: null,
    activo: true,
    notas: "",
  };
}

export function Planes() {
  const { planes, inscripciones, guardarPlan, eliminarPlan } = useDatos();
  const [editando, setEditando] = useState<Plan | null>(null);
  const [borrando, setBorrando] = useState<Plan | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<TipoPlan | "">("");

  /**
   * Dos cuentas por plan: los inscritos activos, que son los que consumen los
   * cupos, y el total histórico, que decide si el plan se puede eliminar.
   */
  const porPlan = useMemo(() => {
    const cuenta = new Map<string, { activos: number; total: number }>();
    for (const i of inscripciones) {
      const actual = cuenta.get(i.planId) ?? { activos: 0, total: 0 };
      actual.total++;
      if (i.estado === "activa") actual.activos++;
      cuenta.set(i.planId, actual);
    }
    return cuenta;
  }, [inscripciones]);

  const listado = useMemo(
    () =>
      planes
        .filter((p) => !filtroTipo || p.tipo === filtroTipo)
        .sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre, "es")),
    [planes, filtroTipo],
  );

  return (
    <>
      <div className="page-head">
        <div>
          <span className="eyebrow">Valores y condiciones</span>
          <h1>Planes</h1>
        </div>
        <div className="page-head__acciones no-print">
          <button
            type="button"
            className="btn btn--primario"
            onClick={() => setEditando(planEnBlanco())}
          >
            + Nuevo plan
          </button>
        </div>
      </div>

      <p className="aviso aviso--atencion">
        Un plan describe <strong>qué se cobra, cuánto y con qué condiciones</strong>: la cuota de
        socio, la mensualidad de una rama, el arancel de una escuela o el valor de una actividad
        puntual. Al inscribir a alguien, su valor queda copiado en la inscripción, así que cambiar
        el precio acá <strong>no altera lo que ya se le prometió</strong> a quien está inscrito.
      </p>

      <div className="filtros no-print">
        <select
          className="select"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as TipoPlan | "")}
          aria-label="Tipo de plan"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_PLAN.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>

      {listado.length === 0 ? (
        <Vacio titulo="Todavía no hay planes cargados">
          <p>Cree el primero con «Nuevo plan», o cargue el ejemplo desde la pantalla Datos.</p>
        </Vacio>
      ) : (
        <div className="grid grid--2">
          {listado.map((plan) => (
            <TarjetaPlan
              key={plan.id}
              plan={plan}
              inscritos={porPlan.get(plan.id)?.activos ?? 0}
              onEditar={() => setEditando(plan)}
              onBorrar={() => setBorrando(plan)}
            />
          ))}
        </div>
      )}

      {editando && (
        <FormularioPlan
          plan={editando}
          onCerrar={() => setEditando(null)}
          onGuardar={async (p) => {
            await guardarPlan({ ...p, id: p.id || nuevoId("pla") });
            setEditando(null);
          }}
        />
      )}

      {borrando &&
        ((porPlan.get(borrando.id)?.total ?? 0) > 0 ? (
          /* Un plan con inscripciones no se borra: sus pagos son el historial
             contable del club, y sin el plan quedarían sin explicación. La base
             tampoco lo permite (on delete restrict), así que en vez de dejar
             que falle con un error de PostgreSQL, se ofrece la salida buena. */
          <Modal titulo="Este plan no se puede eliminar" onCerrar={() => setBorrando(null)}>
            <p>
              «{borrando.nombre}» tiene {porPlan.get(borrando.id)?.total} inscripciones registradas
              y sus pagos cuelgan de ellas. Borrarlo dejaría el historial del club sin explicación.
            </p>
            <p>
              Para dejar de ofrecerlo, márquelo como <strong>no vigente</strong>: desaparece de la
              lista al inscribir, pero se conserva todo lo cobrado.
            </p>
            <div className="modal__acciones">
              <button type="button" className="btn btn--fantasma" onClick={() => setBorrando(null)}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn--primario"
                onClick={() => {
                  void guardarPlan({ ...borrando, activo: false });
                  setBorrando(null);
                }}
              >
                Marcar como no vigente
              </button>
            </div>
          </Modal>
        ) : (
          <Confirmar
            titulo="Eliminar el plan"
            mensaje={`Se eliminará el plan «${borrando.nombre}», que no tiene ninguna inscripción. Esto no se puede deshacer.`}
            onCancelar={() => setBorrando(null)}
            onAceptar={() => {
              void eliminarPlan(borrando.id);
              setBorrando(null);
            }}
          />
        ))}
    </>
  );
}

function TarjetaPlan({
  plan,
  inscritos,
  onEditar,
  onBorrar,
}: {
  plan: Plan;
  inscritos: number;
  onEditar: () => void;
  onBorrar: () => void;
}) {
  const lleno = plan.cupos != null && inscritos >= plan.cupos;
  const descuentos = [
    plan.descuentos.hermanos > 0 ? `${plan.descuentos.hermanos}% hermanos` : "",
    plan.descuentos.socio > 0 ? `${plan.descuentos.socio}% socio` : "",
    plan.descuentos.pagoAnual > 0 ? `${plan.descuentos.pagoAnual}% pago anual` : "",
  ].filter(Boolean);

  return (
    <div className={`card ${plan.activo ? "" : "fila--tenue"}`}>
      <h2 className="card__titulo">
        {plan.nombre}
        <span className="acciones no-print">
          <button type="button" className="btn btn--fantasma btn--sm" onClick={onEditar}>
            Editar
          </button>
          <button type="button" className="btn btn--fantasma btn--sm" onClick={onBorrar}>
            Eliminar
          </button>
        </span>
      </h2>

      <div className="card__cuerpo">
        <div className="persona-item__chips" style={{ maxWidth: "none", justifyContent: "flex-start", marginBottom: 12 }}>
          <ChipRama rama={plan.rama} />
          <span className="chip">{TIPOS_PLAN.find((t) => t.id === plan.tipo)?.nombre}</span>
          {!plan.activo && <span className="chip chip--suspendida">No vigente</span>}
        </div>

        <dl className="datos-lista">
          <dt>Valor</dt>
          <dd>
            <strong>{formatoPesos(plan.valor)}</strong>{" "}
            {nombrePeriodicidad(plan.periodicidad).toLowerCase()}
            {plan.matricula > 0 && ` · matrícula ${formatoPesos(plan.matricula)}`}
          </dd>

          {descuentos.length > 0 && (
            <>
              <dt>Descuentos</dt>
              <dd>{descuentos.join(" · ")}</dd>
            </>
          )}

          {(plan.edadMinima !== null || plan.edadMaxima !== null) && (
            <>
              <dt>Edades</dt>
              <dd>
                {plan.edadMinima ?? "—"} a {plan.edadMaxima ?? "—"} años
              </dd>
            </>
          )}

          <dt>Vigencia</dt>
          <dd>
            {plan.vigenciaDesde ? formatoCorto(plan.vigenciaDesde) : "—"}
            {plan.vigenciaHasta ? ` → ${formatoCorto(plan.vigenciaHasta)}` : " → sin término"}
          </dd>

          {plan.requisitos && (
            <>
              <dt>Requisitos</dt>
              <dd>{plan.requisitos}</dd>
            </>
          )}

          {plan.condiciones && (
            <>
              <dt>Condiciones</dt>
              <dd>{plan.condiciones}</dd>
            </>
          )}
        </dl>

        {plan.horarios.length > 0 && (
          <div className="horarios" style={{ marginTop: 12 }}>
            {plan.horarios.map((h, i) => (
              <span className="horario" key={i}>
                <b>{DIAS_SEMANA[h.dia]}</b> {h.desde}–{h.hasta}
                {h.lugar ? ` · ${h.lugar}` : ""}
              </span>
            ))}
          </div>
        )}

        <div className="cupos" style={{ marginTop: 14 }}>
          <span>
            {inscritos} inscrito{inscritos === 1 ? "" : "s"}
            {plan.cupos != null ? ` de ${plan.cupos}` : ""}
          </span>
          {plan.cupos != null && (
            <span className="cupos__pista">
              <span
                className={`cupos__valor ${lleno ? "cupos__valor--lleno" : ""}`}
                style={{ width: `${Math.min(100, (inscritos / plan.cupos) * 100)}%` }}
              />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function FormularioPlan({
  plan,
  onCerrar,
  onGuardar,
}: {
  plan: Plan;
  onCerrar: () => void;
  onGuardar: (plan: Plan) => Promise<void>;
}) {
  const [borrador, setBorrador] = useState<Plan>(plan);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const cambiar = (parcial: Partial<Plan>) => setBorrador((p) => ({ ...p, ...parcial }));

  function cambiarHorario(indice: number, parcial: Partial<Horario>) {
    cambiar({
      horarios: borrador.horarios.map((h, i) => (i === indice ? { ...h, ...parcial } : h)),
    });
  }

  async function guardar() {
    if (!borrador.nombre.trim()) {
      setError("El plan necesita un nombre.");
      return;
    }
    setGuardando(true);
    try {
      await onGuardar({ ...borrador, nombre: borrador.nombre.trim() });
    } catch {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={plan.id ? "Editar plan" : "Nuevo plan"} onCerrar={onCerrar}>
      {error && <p className="campo__error">{error}</p>}

      <Campo label="Nombre del plan">
        <input
          className="input"
          value={borrador.nombre}
          onChange={(e) => cambiar({ nombre: e.target.value })}
          placeholder="Escuela de Fútbol, Cuota de socio activo…"
        />
      </Campo>

      <div className="grid grid--2">
        <Campo label="Tipo">
          <select
            className="select"
            value={borrador.tipo}
            onChange={(e) => cambiar({ tipo: e.target.value as TipoPlan })}
          >
            {TIPOS_PLAN.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} — {t.ayuda}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Rama">
          <select
            className="select"
            value={borrador.rama}
            onChange={(e) => cambiar({ rama: e.target.value as Rama })}
          >
            {RAMAS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Valor por período">
          <input
            className="input"
            type="number"
            min={0}
            step={500}
            value={borrador.valor}
            onChange={(e) => cambiar({ valor: Number(e.target.value) })}
          />
        </Campo>

        <Campo label="Periodicidad" ayuda="«Pago único» es para actividades puntuales.">
          <select
            className="select"
            value={borrador.periodicidad}
            onChange={(e) => cambiar({ periodicidad: e.target.value as Plan["periodicidad"] })}
          >
            {PERIODICIDADES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Matrícula" ayuda="Se paga una sola vez al entrar. Deje 0 si no corresponde.">
          <input
            className="input"
            type="number"
            min={0}
            step={500}
            value={borrador.matricula}
            onChange={(e) => cambiar({ matricula: Number(e.target.value) })}
          />
        </Campo>

        <Campo label="Cupos" ayuda="Vacío = sin tope.">
          <input
            className="input"
            type="number"
            min={0}
            value={borrador.cupos ?? ""}
            onChange={(e) => cambiar({ cupos: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </Campo>

        <Campo label="Edad mínima">
          <input
            className="input"
            type="number"
            min={0}
            value={borrador.edadMinima ?? ""}
            onChange={(e) =>
              cambiar({ edadMinima: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
        </Campo>

        <Campo label="Edad máxima">
          <input
            className="input"
            type="number"
            min={0}
            value={borrador.edadMaxima ?? ""}
            onChange={(e) =>
              cambiar({ edadMaxima: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
        </Campo>

        <Campo label="Vigente desde">
          <input
            className="input"
            type="date"
            value={borrador.vigenciaDesde}
            onChange={(e) => cambiar({ vigenciaDesde: e.target.value })}
          />
        </Campo>

        <Campo label="Vigente hasta" ayuda="Vacío = sin fecha de término.">
          <input
            className="input"
            type="date"
            value={borrador.vigenciaHasta}
            onChange={(e) => cambiar({ vigenciaHasta: e.target.value })}
          />
        </Campo>
      </div>

      <h3 className="fieldset__titulo">Descuentos (%)</h3>
      <div className="grid grid--3">
        <Campo label="Hermanos">
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            value={borrador.descuentos.hermanos}
            onChange={(e) =>
              cambiar({ descuentos: { ...borrador.descuentos, hermanos: Number(e.target.value) } })
            }
          />
        </Campo>
        <Campo label="Socio del club">
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            value={borrador.descuentos.socio}
            onChange={(e) =>
              cambiar({ descuentos: { ...borrador.descuentos, socio: Number(e.target.value) } })
            }
          />
        </Campo>
        <Campo label="Pago anual">
          <input
            className="input"
            type="number"
            min={0}
            max={100}
            value={borrador.descuentos.pagoAnual}
            onChange={(e) =>
              cambiar({ descuentos: { ...borrador.descuentos, pagoAnual: Number(e.target.value) } })
            }
          />
        </Campo>
      </div>

      <h3 className="fieldset__titulo">Horarios</h3>
      {borrador.horarios.map((h, i) => (
        <div className="fila" key={i} style={{ marginBottom: 8 }}>
          <select
            className="select"
            style={{ flex: "1 1 120px" }}
            value={h.dia}
            onChange={(e) => cambiarHorario(i, { dia: Number(e.target.value) })}
            aria-label="Día"
          >
            {DIAS_SEMANA.slice(1).map((d, indice) => (
              <option key={d} value={indice + 1}>
                {d}
              </option>
            ))}
          </select>
          <input
            className="input"
            style={{ flex: "0 1 110px" }}
            type="time"
            value={h.desde}
            onChange={(e) => cambiarHorario(i, { desde: e.target.value })}
            aria-label="Desde"
          />
          <input
            className="input"
            style={{ flex: "0 1 110px" }}
            type="time"
            value={h.hasta}
            onChange={(e) => cambiarHorario(i, { hasta: e.target.value })}
            aria-label="Hasta"
          />
          <input
            className="input"
            style={{ flex: "1 1 130px" }}
            value={h.lugar}
            placeholder="Lugar"
            onChange={(e) => cambiarHorario(i, { lugar: e.target.value })}
            aria-label="Lugar"
          />
          <button
            type="button"
            className="btn btn--fantasma btn--sm"
            onClick={() => cambiar({ horarios: borrador.horarios.filter((_, x) => x !== i) })}
          >
            Quitar
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn--fantasma btn--sm"
        onClick={() =>
          cambiar({
            horarios: [...borrador.horarios, { dia: 1, desde: "18:00", hasta: "19:30", lugar: "" }],
          })
        }
      >
        + Agregar horario
      </button>
      <p className="campo__ayuda" style={{ marginTop: 6 }}>
        Los horarios se muestran al inscribir y en la ficha de cada persona. Son también la base
        para las reservas del portal de apoderados de la segunda etapa.
      </p>

      <h3 className="fieldset__titulo">Condiciones</h3>
      <Campo label="Condiciones del plan" ayuda="Qué incluye, reglas de asistencia, congelamiento, devoluciones.">
        <textarea
          className="textarea"
          value={borrador.condiciones}
          onChange={(e) => cambiar({ condiciones: e.target.value })}
        />
      </Campo>

      <Campo label="Requisitos para inscribirse">
        <input
          className="input"
          value={borrador.requisitos}
          onChange={(e) => cambiar({ requisitos: e.target.value })}
          placeholder="Certificado médico, experiencia previa…"
        />
      </Campo>

      <Casilla
        checked={borrador.activo}
        onChange={(activo) => cambiar({ activo })}
        ayuda="Los planes no vigentes no aparecen al inscribir, pero conservan su historial."
      >
        Plan vigente
      </Casilla>

      <div className="modal__acciones">
        <button type="button" className="btn btn--fantasma" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="button" className="btn btn--primario" onClick={() => void guardar()} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar plan"}
        </button>
      </div>
    </Modal>
  );
}
