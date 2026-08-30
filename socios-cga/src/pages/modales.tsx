import { useMemo, useState } from "react";
import { BuscadorPersona, Campo, Casilla, Modal } from "../components/ui";
import { useDatos } from "../data/DatosContext";
import { nuevoId } from "../data/store";
import { formatoPesos, siguientePeriodo, valorConDescuentos } from "../domain/cobros";
import { responsablesDe } from "../domain/familia";
import { edad, formatoLargo, hoyISO, sumarDias } from "../domain/fechas";
import { normalizarRut, rutValido } from "../domain/rut";
import type {
  CanalAviso,
  ConceptoPago,
  Inscripcion,
  MedioPago,
  Pago,
  Persona,
  TipoVinculo,
} from "../domain/types";
import {
  DIAS_SEMANA,
  MEDIOS_PAGO,
  nombreCompleto,
  nombrePeriodicidad,
  TIPOS_VINCULO,
} from "../domain/types";

/* ========================================================================== */
/*  Inscribir a una persona en un plan                                        */
/* ========================================================================== */

export function ModalInscripcion({
  persona,
  inscripcion,
  onCerrar,
}: {
  persona: Persona;
  /** Inscripción existente, cuando se está editando en vez de creando. */
  inscripcion?: Inscripcion;
  onCerrar: () => void;
}) {
  const { planes, personas, vinculos, inscripciones, guardarInscripcion } = useDatos();
  const activos = useMemo(
    () => planes.filter((p) => p.activo || p.id === inscripcion?.planId),
    [planes, inscripcion],
  );

  const [planId, setPlanId] = useState(inscripcion?.planId ?? activos[0]?.id ?? "");
  const [pagadorId, setPagadorId] = useState(
    inscripcion?.pagadorId ?? responsablesDe(persona.id, vinculos).find((v) => v.pagador)?.adultoId ?? persona.id,
  );
  const [fechaInicio, setFechaInicio] = useState(inscripcion?.fechaInicio ?? hoyISO());
  const [descuentos, setDescuentos] = useState({ hermanos: false, socio: false, pagoAnual: false });
  const [valor, setValor] = useState<number | null>(inscripcion?.valor ?? null);
  const [canalAviso, setCanalAviso] = useState<CanalAviso>(inscripcion?.canalAviso ?? "correo");
  const [diasAviso, setDiasAviso] = useState(inscripcion?.diasAviso ?? 5);
  const [matriculaPagada, setMatriculaPagada] = useState(inscripcion?.matriculaPagada ?? false);
  const [notas, setNotas] = useState(inscripcion?.notas ?? "");
  const [guardando, setGuardando] = useState(false);

  const plan = activos.find((p) => p.id === planId);
  const calculado = plan ? valorConDescuentos(plan, descuentos) : null;
  const valorFinal = valor ?? calculado?.valor ?? 0;

  // Los adultos responsables van primero y la propia persona al final: en un
  // menor, «se paga sola» es la opción equivocada y no debe quedar arriba.
  const candidatos = useMemo(() => {
    const ids = new Set<string>(responsablesDe(persona.id, vinculos).map((v) => v.adultoId));
    if (pagadorId) ids.add(pagadorId);
    ids.add(persona.id);
    return [...ids].map((id) => personas.find((p) => p.id === id)).filter((p): p is Persona => !!p);
  }, [persona.id, vinculos, personas, pagadorId]);

  const ocupados = useMemo(
    () =>
      inscripciones.filter(
        (i) => i.planId === planId && i.estado === "activa" && i.id !== inscripcion?.id,
      ).length,
    [inscripciones, planId, inscripcion],
  );

  const años = edad(persona.fechaNacimiento);
  const fueraDeEdad =
    plan && años !== null &&
    ((plan.edadMinima !== null && años < plan.edadMinima) ||
      (plan.edadMaxima !== null && años > plan.edadMaxima));
  const sinCupo = plan?.cupos != null && ocupados >= plan.cupos;
  const yaInscrito = inscripciones.some(
    (i) => i.personaId === persona.id && i.planId === planId && i.estado === "activa" && i.id !== inscripcion?.id,
  );

  async function guardar() {
    if (!plan) return;
    setGuardando(true);
    try {
      const registro: Inscripcion = {
        id: inscripcion?.id ?? nuevoId("ins"),
        personaId: persona.id,
        planId: plan.id,
        pagadorId,
        fechaInicio,
        fechaTermino: inscripcion?.fechaTermino ?? "",
        valor: valorFinal,
        descuentoMotivo: calculado?.motivo ?? inscripcion?.descuentoMotivo ?? "",
        periodicidad: plan.periodicidad,
        estado: inscripcion?.estado ?? "activa",
        canalAviso,
        diasAviso: Math.max(1, diasAviso),
        matriculaPagada,
        notas,
        creadoEn: inscripcion?.creadoEn ?? new Date().toISOString(),
      };
      await guardarInscripcion(registro);
      onCerrar();
    } catch {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={inscripcion ? "Editar inscripción" : `Inscribir a ${nombreCompleto(persona)}`} onCerrar={onCerrar}>
      <Campo label="Plan">
        <select
          className="select"
          value={planId}
          onChange={(e) => {
            setPlanId(e.target.value);
            setValor(null); // el valor vuelve a calcularse con el plan nuevo
          }}
        >
          {activos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} — {formatoPesos(p.valor)} {nombrePeriodicidad(p.periodicidad).toLowerCase()}
            </option>
          ))}
        </select>
      </Campo>

      {plan && (
        <>
          {plan.condiciones && (
            <p className="campo__ayuda" style={{ marginBottom: 10 }}>
              <strong>Condiciones:</strong> {plan.condiciones}
            </p>
          )}

          {plan.horarios.length > 0 && (
            <div className="horarios" style={{ marginBottom: 12 }}>
              {plan.horarios.map((h, i) => (
                <span className="horario" key={i}>
                  <b>{DIAS_SEMANA[h.dia]}</b> {h.desde}–{h.hasta}
                  {h.lugar ? ` · ${h.lugar}` : ""}
                </span>
              ))}
            </div>
          )}

          {yaInscrito && (
            <p className="campo__error">
              Esta persona ya tiene una inscripción activa en este plan.
            </p>
          )}
          {fueraDeEdad && (
            <p className="campo__error">
              El plan es para {plan.edadMinima ?? 0} a {plan.edadMaxima ?? "—"} años y esta persona
              tiene {años}. Se puede inscribir igual, pero conviene revisarlo.
            </p>
          )}
          {sinCupo && (
            <p className="campo__error">
              El plan tiene {plan.cupos} cupos y ya hay {ocupados} inscritos.
            </p>
          )}
        </>
      )}

      <Campo
        label="Quién paga"
        ayuda="A esta persona se le envían los avisos de renovación."
      >
        <select className="select" value={pagadorId} onChange={(e) => setPagadorId(e.target.value)}>
          {candidatos.map((p) => (
            <option key={p.id} value={p.id}>
              {nombreCompleto(p)}
              {p.id === persona.id ? " (la misma persona)" : ""}
            </option>
          ))}
        </select>
      </Campo>

      {candidatos.length === 1 && candidatos[0].id === persona.id && años !== null && años < 18 && (
        <p className="campo__error">
          Es menor de edad y no tiene adultos enlazados. Agregue un vínculo antes de inscribirla.
        </p>
      )}

      <Campo label="Fecha de inicio" ayuda="Desde acá corre el primer período por pagar.">
        <input
          className="input"
          type="date"
          value={fechaInicio}
          onChange={(e) => setFechaInicio(e.target.value)}
        />
      </Campo>

      {plan && (plan.descuentos.hermanos > 0 || plan.descuentos.socio > 0 || plan.descuentos.pagoAnual > 0) && (
        <>
          <span className="campo__label">Descuentos del plan</span>
          {plan.descuentos.hermanos > 0 && (
            <Casilla
              checked={descuentos.hermanos}
              onChange={(v) => {
                setDescuentos((d) => ({ ...d, hermanos: v }));
                setValor(null);
              }}
            >
              {plan.descuentos.hermanos}% por hermanos en el club
            </Casilla>
          )}
          {plan.descuentos.socio > 0 && (
            <Casilla
              checked={descuentos.socio}
              onChange={(v) => {
                setDescuentos((d) => ({ ...d, socio: v }));
                setValor(null);
              }}
            >
              {plan.descuentos.socio}% por ser socio del club
            </Casilla>
          )}
          {plan.descuentos.pagoAnual > 0 && (
            <Casilla
              checked={descuentos.pagoAnual}
              onChange={(v) => {
                setDescuentos((d) => ({ ...d, pagoAnual: v }));
                setValor(null);
              }}
            >
              {plan.descuentos.pagoAnual}% por pago anual adelantado
            </Casilla>
          )}
        </>
      )}

      <Campo
        label={`Valor por período (${plan ? nombrePeriodicidad(plan.periodicidad).toLowerCase() : "—"})`}
        ayuda={
          calculado?.motivo
            ? `Valor del plan ${formatoPesos(plan?.valor ?? 0)} menos ${calculado.motivo}.`
            : "Queda guardado en la inscripción: si el club sube el plan, esta persona conserva lo acordado."
        }
      >
        <input
          className="input"
          type="number"
          min={0}
          step={500}
          value={valorFinal}
          onChange={(e) => setValor(Number(e.target.value))}
        />
      </Campo>

      {plan && plan.matricula > 0 && (
        <Casilla
          checked={matriculaPagada}
          onChange={setMatriculaPagada}
          ayuda={`Matrícula del plan: ${formatoPesos(plan.matricula)}, se paga una sola vez.`}
        >
          Matrícula pagada
        </Casilla>
      )}

      <div className="grid grid--2">
        <Campo label="Avisar por">
          <select
            className="select"
            value={canalAviso}
            onChange={(e) => setCanalAviso(e.target.value as CanalAviso)}
          >
            <option value="correo">Correo</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="ambos">Correo y WhatsApp</option>
          </select>
        </Campo>

        <Campo label="Días de aviso" ayuda="Cuántos días antes del vencimiento avisar.">
          <input
            className="input"
            type="number"
            min={1}
            max={60}
            value={diasAviso}
            onChange={(e) => setDiasAviso(Number(e.target.value))}
          />
        </Campo>
      </div>

      <Campo label="Notas">
        <input className="input" value={notas} onChange={(e) => setNotas(e.target.value)} />
      </Campo>

      <div className="modal__acciones">
        <button type="button" className="btn btn--fantasma" onClick={onCerrar}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn--primario"
          onClick={() => void guardar()}
          disabled={!plan || guardando}
        >
          {guardando ? "Guardando…" : inscripcion ? "Guardar cambios" : "Inscribir"}
        </button>
      </div>
    </Modal>
  );
}

/* ========================================================================== */
/*  Registrar un pago                                                         */
/* ========================================================================== */

export function ModalPago({
  inscripcion,
  onCerrar,
}: {
  inscripcion: Inscripcion;
  onCerrar: () => void;
}) {
  const { pagos, planes, porId, guardarPago } = useDatos();
  const plan = planes.find((p) => p.id === inscripcion.planId);
  const socio = porId.get(inscripcion.personaId);
  const sugerido = useMemo(() => siguientePeriodo(inscripcion, pagos), [inscripcion, pagos]);

  const [monto, setMonto] = useState(inscripcion.valor);
  const [fecha, setFecha] = useState(hoyISO());
  const [periodoDesde, setPeriodoDesde] = useState(sugerido.desde);
  const [periodoHasta, setPeriodoHasta] = useState(sugerido.hasta);
  const [medio, setMedio] = useState<MedioPago>("transferencia");
  const [concepto, setConcepto] = useState<ConceptoPago>(
    inscripcion.periodicidad === "unico" ? "actividad" : "cuota",
  );
  const [comprobante, setComprobante] = useState("");
  const [registradoPor, setRegistradoPor] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  /** La matrícula no corre la fecha de renovación: no cubre ningún período. */
  const esMatricula = concepto === "matricula";

  async function guardar() {
    setGuardando(true);
    try {
      const pago: Pago = {
        id: nuevoId("pag"),
        inscripcionId: inscripcion.id,
        personaId: inscripcion.pagadorId,
        monto,
        fecha,
        periodoDesde: esMatricula ? "" : periodoDesde,
        periodoHasta: esMatricula ? "" : periodoHasta,
        medio,
        concepto,
        comprobante,
        registradoPor,
        notas,
        creadoEn: new Date().toISOString(),
      };
      await guardarPago(pago);
      onCerrar();
    } catch {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Registrar pago" onCerrar={onCerrar}>
      <p className="campo__ayuda" style={{ marginBottom: 12 }}>
        {nombreCompleto(socio)} · {plan?.nombre ?? "Plan"} · paga{" "}
        {nombreCompleto(porId.get(inscripcion.pagadorId))}
      </p>

      <div className="grid grid--2">
        <Campo label="Monto">
          <input
            className="input"
            type="number"
            min={0}
            step={500}
            value={monto}
            onChange={(e) => setMonto(Number(e.target.value))}
          />
        </Campo>

        <Campo label="Fecha del pago">
          <input
            className="input"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
          />
        </Campo>
      </div>

      <Campo label="Concepto">
        <select
          className="select"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value as ConceptoPago)}
        >
          <option value="cuota">Cuota del período</option>
          <option value="matricula">Matrícula</option>
          <option value="actividad">Actividad puntual</option>
          <option value="otro">Otro</option>
        </select>
      </Campo>

      {!esMatricula && (
        <>
          <div className="grid grid--2">
            <Campo label="Período desde">
              <input
                className="input"
                type="date"
                value={periodoDesde}
                onChange={(e) => setPeriodoDesde(e.target.value)}
              />
            </Campo>
            <Campo label="Período hasta">
              <input
                className="input"
                type="date"
                value={periodoHasta}
                onChange={(e) => setPeriodoHasta(e.target.value)}
              />
            </Campo>
          </div>
          <p className="aviso aviso--ok">
            Con este pago la inscripción queda cubierta hasta el {formatoLargo(periodoHasta)} y el
            próximo vencimiento pasa a ser el {formatoLargo(sumarDias(periodoHasta, 1))}.
          </p>
        </>
      )}

      <div className="grid grid--2">
        <Campo label="Medio de pago">
          <select
            className="select"
            value={medio}
            onChange={(e) => setMedio(e.target.value as MedioPago)}
          >
            {MEDIOS_PAGO.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Comprobante" ayuda="N° de transferencia o boleta.">
          <input
            className="input"
            value={comprobante}
            onChange={(e) => setComprobante(e.target.value)}
          />
        </Campo>
      </div>

      <Campo label="Recibido por" ayuda="Quién registra el pago en el club.">
        <input
          className="input"
          value={registradoPor}
          onChange={(e) => setRegistradoPor(e.target.value)}
        />
      </Campo>

      <Campo label="Notas">
        <input className="input" value={notas} onChange={(e) => setNotas(e.target.value)} />
      </Campo>

      <div className="modal__acciones">
        <button type="button" className="btn btn--fantasma" onClick={onCerrar}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn--primario"
          onClick={() => void guardar()}
          disabled={guardando}
        >
          {guardando ? "Guardando…" : "Registrar pago"}
        </button>
      </div>
    </Modal>
  );
}

/* ========================================================================== */
/*  Enlazar a un adulto responsable                                           */
/* ========================================================================== */

export function ModalVinculo({
  persona,
  onCerrar,
}: {
  persona: Persona;
  onCerrar: () => void;
}) {
  const { personas, vinculos, guardarPersona, guardarVinculo } = useDatos();
  const [elegido, setElegido] = useState<Persona | null>(null);
  const [nuevo, setNuevo] = useState<{ nombres: string; apellidos: string; rut: string; email: string; telefono: string } | null>(null);
  const [tipo, setTipo] = useState<TipoVinculo>("madre");
  const [pagador, setPagador] = useState(true);
  const [contactoPrincipal, setContactoPrincipal] = useState(true);
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const yaEnlazados = useMemo(
    () => [persona.id, ...responsablesDe(persona.id, vinculos).map((v) => v.adultoId)],
    [persona.id, vinculos],
  );

  async function guardar() {
    if (!elegido && !nuevo?.nombres.trim()) {
      setError("Busque a la persona o escriba al menos su nombre.");
      return;
    }
    if (nuevo?.rut && !rutValido(nuevo.rut)) {
      setError("El RUT no es válido.");
      return;
    }
    setGuardando(true);
    try {
      let adultoId = elegido?.id ?? "";
      if (!adultoId && nuevo) {
        adultoId = nuevoId("per");
        await guardarPersona({
          id: adultoId,
          rut: nuevo.rut ? normalizarRut(nuevo.rut) : "",
          documento: "",
          nombres: nuevo.nombres.trim(),
          apellidos: nuevo.apellidos.trim(),
          fechaNacimiento: "",
          sexo: "",
          email: nuevo.email.trim(),
          telefono: nuevo.telefono.trim(),
          direccion: persona.direccion,
          comuna: persona.comuna,
          socio: false,
          numeroSocio: "",
          categoriaSocio: "",
          fechaIngreso: "",
          contactoEmergencia: "",
          telefonoEmergencia: "",
          observacionesSalud: "",
          prevision: "",
          autorizaImagen: false,
          activo: true,
          notas: "",
          creadoEn: new Date().toISOString(),
          actualizadoEn: new Date().toISOString(),
        });
      }

      await guardarVinculo({
        id: nuevoId("vin"),
        personaId: persona.id,
        adultoId,
        tipo,
        pagador,
        contactoPrincipal,
        notas: "",
      });
      onCerrar();
    } catch {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={`Enlazar un adulto a ${nombreCompleto(persona)}`} onCerrar={onCerrar}>
      {error && <p className="campo__error">{error}</p>}

      {elegido ? (
        <div className="fila" style={{ marginBottom: 12 }}>
          <div className="fila__cuerpo">
            <div className="fila__titulo">{nombreCompleto(elegido)}</div>
            <div className="fila__meta">
              {[elegido.email, elegido.telefono].filter(Boolean).join(" · ") || "Sin contacto"}
            </div>
          </div>
          <div className="fila__acciones">
            <button type="button" className="btn btn--fantasma btn--sm" onClick={() => setElegido(null)}>
              Cambiar
            </button>
          </div>
        </div>
      ) : nuevo ? (
        <div className="grid grid--2">
          <Campo label="Nombres">
            <input className="input" value={nuevo.nombres} onChange={(e) => setNuevo({ ...nuevo, nombres: e.target.value })} />
          </Campo>
          <Campo label="Apellidos">
            <input className="input" value={nuevo.apellidos} onChange={(e) => setNuevo({ ...nuevo, apellidos: e.target.value })} />
          </Campo>
          <Campo label="RUT">
            <input className="input" value={nuevo.rut} onChange={(e) => setNuevo({ ...nuevo, rut: e.target.value })} />
          </Campo>
          <Campo label="Correo">
            <input className="input" type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} />
          </Campo>
          <Campo label="Teléfono">
            <input className="input" type="tel" value={nuevo.telefono} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} />
          </Campo>
        </div>
      ) : (
        <>
          <BuscadorPersona
            personas={personas}
            excluir={yaEnlazados}
            onElegir={setElegido}
            etiqueta="Buscar a la persona en el sistema"
            ayuda="Si ya tiene otro hijo en el club, aparecerá acá."
          />
          <button
            type="button"
            className="btn btn--fantasma btn--sm"
            onClick={() => setNuevo({ nombres: "", apellidos: "", rut: "", email: "", telefono: "" })}
          >
            No está en el sistema: crear su ficha
          </button>
        </>
      )}

      <Campo label="Relación">
        <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value as TipoVinculo)}>
          {TIPOS_VINCULO.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre}
            </option>
          ))}
        </select>
      </Campo>

      <Casilla checked={pagador} onChange={setPagador} ayuda="Se le cobran las cuotas y recibe los avisos.">
        Es quien paga
      </Casilla>

      <Casilla checked={contactoPrincipal} onChange={setContactoPrincipal}>
        Es el contacto principal
      </Casilla>

      <div className="modal__acciones">
        <button type="button" className="btn btn--fantasma" onClick={onCerrar}>
          Cancelar
        </button>
        <button type="button" className="btn btn--primario" onClick={() => void guardar()} disabled={guardando}>
          {guardando ? "Guardando…" : "Enlazar"}
        </button>
      </div>
    </Modal>
  );
}
